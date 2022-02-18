import { IBindings } from "fetch-sparql-endpoint";
import { VariableTerm } from "sparqljs";
import { FacetConfig } from "../facets/Facet";
interface FacetSearchApiConfig {
    endpointUrl: string;
    facetConfigs: FacetConfig[];
    prefixes?: string;
}
export declare class FacetSearchApi {
    private readonly fetcher;
    private readonly endpointUrl;
    private readonly facets;
    private readonly prefixes;
    private sparqlResponse?;
    private subscribersMap;
    constructor(config: FacetSearchApiConfig);
    fetchResults(): Promise<SparqlResponse>;
    subscribeToFacetState(facetId: string, onChange: (facetStats: FacetStats) => void): void;
    unsubscribeToFacetState(facetId: string, onChange: (facetStats: FacetStats) => void): void;
    getFacetStats(facetId: string): FacetStats | undefined;
    setValue<T>(facetId: string, value: T): void;
    private notifySubscribers;
    private generateSparql;
}
export declare type FacetStats = Record<string, number>;
export declare type FacetsStats = Record<string, FacetStats>;
interface SparqlResponse {
    variables: VariableTerm[];
    bindings: IBindings[];
    facetsStats: FacetsStats;
}
export {};
