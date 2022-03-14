import {IBindings, SparqlEndpointFetcher} from "fetch-sparql-endpoint";
import {VariableTerm} from "sparqljs";

import {Facet} from "./facets/Facet";

interface FacetSearchApiConfig {
  endpointUrl: string,
  facets: Facet[],
  prefixes?: string,
  limit?: number,
}

export type Bindings = IBindings;
export interface SearchResults {
  variables: VariableTerm[],
  bindings: Bindings[],
}

export class SfsApi {

  public readonly endpointUrl: string;
  public readonly facets: Record<string, Facet>;
  private readonly prefixes: string;
  private readonly fetcher = new SparqlEndpointFetcher();
  private readonly limit;

  public lastSearchResults?: SearchResults;

  public constructor({endpointUrl, facets, limit, prefixes}: FacetSearchApiConfig) {
    this.endpointUrl = endpointUrl;
    this.facets = facets.reduce((acc, facet) => (
      {...acc, [facet.id]: facet}
    ), {});
    this.prefixes = prefixes ?? "";
    this.limit = limit ?? 100; // TODO introduce default values constants
    this.lastSearchResults = undefined;
  }

  public async search(): Promise<SearchResults> {
    const sparql = this.generateSparql();
    Object.values(this.facets).forEach(facet => facet.resetOptions());
    const stream = await this.fetcher.fetchBindings(this.endpointUrl, sparql);
    this.lastSearchResults = await this.processBindingsStream(stream);
    return this.lastSearchResults;
  }

  private generateSparql() {
    return `
    ${this.prefixes} 
    SELECT * 
    WHERE {
      ?id a <http://dbpedia.org/ontology/Writer> .
      ${Object.values(this.facets).map(facet => facet.generateSparql()).join("")}
    }
    LIMIT ${this.limit}
  `;
  }

  private processBindingsStream(stream: NodeJS.ReadableStream): Promise<SearchResults> {
    return new Promise<SearchResults>((resolve, reject) => {
      let variables: VariableTerm[] = [];
      const bindings: Bindings[] = [];
      stream.on("variables", fetchedVariables => {
        variables = fetchedVariables
      });
      stream.on("data", (data: Bindings) => {
        bindings.push(data);
        Object.entries(data).forEach(([key, value]) => {
          const facet = this.facets[key];
          if (facet) {
            facet.addOption(value.value);
          }
        });
      });
      stream.on("error", reject);
      stream.on("end", () => {
        resolve({variables, bindings});
      });
    });
  }
}
