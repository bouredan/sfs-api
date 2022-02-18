export declare type FacetType = "select" | "checkbox";
export interface FacetConfig {
    type: FacetType;
    id: string;
    name: string;
    predicate: string;
}
export interface Facet {
    generateSparql(): string;
    setValue(value: unknown): void;
}
export declare function buildFacet(configuration: FacetConfig): Facet;
