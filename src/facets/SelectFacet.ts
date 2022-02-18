import {Facet, FacetConfig} from "./Facet";

export class SelectFacet implements Facet {

  private readonly facetId: string;
  private readonly name: string;
  private readonly predicate: string;
  private value: string;

  constructor({id, name, predicate}: Omit<FacetConfig, "type">) {
    this.facetId = id;
    this.name = name;
    this.predicate = predicate;
    this.value = "";
  }

  public generateSparql(): string {
    const whereClause = `BIND(<${this.value}> AS ?${this.facetId})
                         ?id ${this.predicate} <${this.value}> . `
    return (
      `${this.value ? whereClause : ""}
      OPTIONAL { 
        ?id ${this.predicate} ?${this.facetId} . 
      }`
    );
  }

  public setValue(newValue: string) {
    this.value = newValue;
  };
}