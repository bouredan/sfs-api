import {Facet, FacetConfig} from "./Facet";

export class CheckboxFacet extends Facet<string[]> {

  public constructor({id, predicate}: Omit<FacetConfig<string[]>, "type">) {
    super({
      type: "checkbox",
      id,
      predicate,
      initialValue: [],
    });
  }

  public generateSparql(): string {
    const optionalClause = `
    OPTIONAL { 
      ?id ${this.predicate} ?${this.id} . 
    }`;
    const whereClauses = this.value ? this.value.map(value => (
      `{
         BIND(<${value}> AS ?${this.id})
         ?id ${this.predicate} <${value}> . 
      }`
    )).join(" UNION ") : "";
    return whereClauses + optionalClause;
  }
}