import {SelectFacet} from "./SelectFacet";
import {CheckboxFacet} from "./CheckboxFacet";

export type FacetType = "select" | "checkbox";

export interface FacetConfig {
  type: FacetType,
  id: string,
  name: string,
  predicate: string,
}

export interface Facet {
  generateSparql(): string,
  setValue(value: unknown): void,
}

export function buildFacet(configuration: FacetConfig): Facet {
  switch (configuration.type) {
    case "select":
      return new SelectFacet(configuration);
    case "checkbox":
      return new CheckboxFacet(configuration);
  }
}
