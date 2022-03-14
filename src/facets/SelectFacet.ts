import {Facet, FacetConfig} from "./Facet";

export class SelectFacet extends Facet<string> {

  public constructor({id, predicate}: Omit<FacetConfig<string>, "type">) {
    super({
      type: "select",
      id,
      predicate,
      initialValue: "",
    });
  }

  public generateSparql(): string {
    const whereClause = `BIND(<${this.value}> AS ?${this.id})
                         ?id ${this.predicate} <${this.value}> . `
    return (
      `${this.value ? whereClause : ""}
      OPTIONAL { 
        ?id ${this.predicate} ?${this.id} . 
      }`
    );
  }
}