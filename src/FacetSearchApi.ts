import {IBindings, SparqlEndpointFetcher} from "fetch-sparql-endpoint";
import {VariableTerm} from "sparqljs";

import {buildFacet, Facet, FacetConfig, FacetOptions, FacetsOptions} from "./facets/Facet";

interface FacetSearchApiConfig {
  endpointUrl: string,
  facetConfigs: FacetConfig[],
  prefixes?: string,
}

export type Bindings = IBindings;

export class FacetSearchApi {

  private readonly endpointUrl: string;
  private readonly facets: Record<string, Facet>;
  private readonly prefixes: string;
  private readonly fetcher = new SparqlEndpointFetcher();

  private subscribersMap = new Map<string, ((facetOptions: FacetOptions) => void)[]>();

  constructor(config: FacetSearchApiConfig) {
    this.endpointUrl = config.endpointUrl;
    this.facets = config.facetConfigs.reduce((acc, facetConfig) => (
      {...acc, [facetConfig.id]: buildFacet(facetConfig)}
    ), {});
    this.prefixes = config.prefixes ?? "";
  }

  public async fetchResults(): Promise<SparqlResponse> {
    const sparql = this.generateSparql();
    const stream = await this.fetcher.fetchBindings(this.endpointUrl, sparql);
    const response = await processBindingsStream(stream);
    this.notifySubscribers(response);
    return response;
  }

  public subscribeToFacetState(facetId: string, onChange: (facetOptions: FacetOptions) => void) {
    const facetSubscribers = this.subscribersMap.get(facetId);
    if (facetSubscribers) {
      this.subscribersMap.set(facetId, [...facetSubscribers, onChange]);
    } else {
      this.subscribersMap.set(facetId, [onChange]);
    }
  }

  public unsubscribeToFacetState(facetId: string, onChange: (facetOptions: FacetOptions) => void) {
    const facetSubscribers = this.subscribersMap.get(facetId);
    if (facetSubscribers) {
      this.subscribersMap.set(facetId, facetSubscribers.filter(subscriber => subscriber !== onChange));
    }
  }

  public setValue<T>(facetId: string, value: T): void {
    this.facets[facetId].setValue(value);
  }

  private notifySubscribers(sparqlResponse: SparqlResponse) {
    Object.entries(sparqlResponse.facetsOptions).forEach(([facetId, facetStats]) => {
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

interface SparqlResponse {
  variables: VariableTerm[],
  bindings: Bindings[],
  facetsOptions: FacetsOptions,
}

function processBindingsStream(stream: NodeJS.ReadableStream): Promise<SparqlResponse> {
  return new Promise<SparqlResponse>((resolve, reject) => {
    let variables: VariableTerm[] = [];
    const bindings: Bindings[] = [];
    const facetsOptions: FacetsOptions = {};
    stream.on("variables", fetchedVariables => {
      variables = fetchedVariables
    });
    stream.on("data", (data: Bindings) => {
      bindings.push(data);
      Object.entries(data).forEach(([key, value]) => {
        if (!facetsOptions.hasOwnProperty(key)) {
          facetsOptions[key] = {};
        }
        facetsOptions[key][value.value] = facetsOptions[key][value.value] ? facetsOptions[key][value.value] + 1 : 1;
      });
    });
    stream.on("error", reject);
    stream.on("end", () => {
      resolve({variables, bindings, facetsOptions: facetsOptions});
    });
  });
}