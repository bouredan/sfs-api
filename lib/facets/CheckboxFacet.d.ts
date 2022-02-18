import { Facet, FacetConfig } from "./Facet";
export declare class CheckboxFacet implements Facet {
    private readonly facetId;
    private readonly name;
    private readonly predicate;
    private values;
    constructor({ id, name, predicate }: Omit<FacetConfig, "type">);
    generateSparql(): string;
    setValue(newValues: string[]): void;
}
