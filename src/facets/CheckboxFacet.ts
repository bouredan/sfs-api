import {Facet, FacetConfig} from "./Facet";

export class CheckboxFacet implements Facet {

  private readonly facetId: string;
  private readonly name: string;
  private readonly predicate: string;
  private values: string[];

  constructor({id, name, predicate}: Omit<FacetConfig, "type">) {
    this.facetId = id;
    this.name = name;
    this.predicate = predicate;
    this.values = [];
  }

  public generateSparql(): string {
    const optionalClause = `
    OPTIONAL { 
      ?id ${this.predicate} ?${this.facetId} . 
    }`;
    const whereClauses = this.values.length > 0 ? this.values.map(value => (
      `{
         BIND(<${value}> AS ?${this.facetId})
         ?id ${this.predicate} <${value}> . 
      }`
    )).join(" UNION ") : "";
    return whereClauses + optionalClause;
  }

  public setValue(newValues: string[]) {
    this.values = newValues;
  };
}