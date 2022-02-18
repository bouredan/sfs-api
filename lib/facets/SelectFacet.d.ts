import { Facet, FacetConfig } from "./Facet";
export declare class SelectFacet implements Facet {
    private readonly facetId;
    private readonly name;
    private readonly predicate;
    private value;
    constructor({ id, name, predicate }: Omit<FacetConfig, "type">);
    generateSparql(): string;
    setValue(newValue: string): void;
}
