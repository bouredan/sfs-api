import {IBindings, SparqlEndpointFetcher} from "fetch-sparql-endpoint";
import {VariableTerm} from "sparqljs";

import {buildFacet, Facet, FacetConfig} from "../facets/Facet";

interface FacetSearchApiConfig {
  endpointUrl: string,
  facetConfigs: FacetConfig[],
  prefixes?: string,
}

export class FacetSearchApi {
  private readonly fetcher = new SparqlEndpointFetcher({});

  private readonly endpointUrl: string;
  private readonly facets: Record<string, Facet>;
  private readonly prefixes: string;
  private sparqlResponse?: SparqlResponse;

  private subscribersMap = new Map<string, ((facetStats: FacetStats) => void)[]>();

  constructor(config: FacetSearchApiConfig) {
    this.endpointUrl = config.endpointUrl;
    this.facets = config.facetConfigs.reduce((acc, curr) => ({...acc, [curr.id]: buildFacet(curr)}), {});
    this.prefixes = config.prefixes ?? "";
  }

  public async fetchResults() {
    const stream = await this.fetcher.fetchBindings(this.endpointUrl, this.generateSparql());
    this.sparqlResponse = await processBindingsStream(stream);
    this.notifySubscribers(this.sparqlResponse);
    return this.sparqlResponse;
  }

  public subscribeToFacetState(facetId: string, onChange: (facetStats: FacetStats) => void) {
    const facetSubscribers = this.subscribersMap.get(facetId);
    if (facetSubscribers) {
      this.subscribersMap.set(facetId, [...facetSubscribers, onChange]);
    } else {
      this.subscribersMap.set(facetId, [onChange]);
    }
  }

  public unsubscribeToFacetState(facetId: string, onChange: (facetStats: FacetStats) => void) {
    const facetSubscribers = this.subscribersMap.get(facetId);
    if (facetSubscribers) {
      this.subscribersMap.set(facetId, facetSubscribers.filter(subscriber => subscriber !== onChange));
    }
  }

  public getFacetStats(facetId: string): FacetStats | undefined {
    return this.sparqlResponse?.facetsStats[facetId];
  }

  public setValue<T>(facetId: string, value: T): void {
    this.facets[facetId].setValue(value);
  }

  private notifySubscribers(sparqlResponse: SparqlResponse) {
    Object.entries(sparqlResponse.facetsStats).forEach(([facetId, facetStats]) => {
      this.subscribersMap.get(facetId)?.forEach(subscriber => {
        subscriber(facetStats);
      })
    })
  }

  private generateSparql() {
    return `
    ${this.prefixes} 
    SELECT * 
    WHERE {
      ?id a <http://dbpedia.org/ontology/Writer> .
      ${Object.values(this.facets).map(facet => facet.generateSparql()).join("")}
    }
    LIMIT 10
  `;
  }

}

export type FacetStats = Record<string, number>;
export type FacetsStats = Record<string, FacetStats>;

interface SparqlResponse {
  variables: VariableTerm[],
  bindings: IBindings[],
  facetsStats: FacetsStats,
}

function processBindingsStream(stream: NodeJS.ReadableStream) {
  return new Promise<SparqlResponse>((resolve, reject) => {
    let variables: VariableTerm[] = [];
    const bindings: IBindings[] = [];
    const facets: FacetsStats = {};
    stream.on("variables", fetchedVariables => {
      variables = fetchedVariables
    });
    stream.on("data", (data: IBindings) => {
      bindings.push(data);
      Object.entries(data).forEach(([key, value]) => {
        if (!facets.hasOwnProperty(key)) {
          facets[key] = {};
        }
        facets[key][value.value] = facets[key][value.value] ? facets[key][value.value] + 1 : 1;
      });
    });
    stream.on("error", reject);
    stream.on("end", () => {
      resolve({variables, bindings, facetsStats: facets});
    });
  });
}