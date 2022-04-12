import {Pattern, Query, SelectQuery} from "sparqljs";
import dataFactory from "@rdfjs/data-model";

import {Facet} from "./Facet";
import {getIriWithoutArrows} from "../SfsApi";


export class CheckboxFacet extends Facet<string[]> {

  public getFacetConstraints(): Pattern[] | undefined {
    if (!this.value) {
      return undefined;
    }
    return [{
      type: "values",
      values: this.value.map(value => ({
        [`?${this.id}`]: dataFactory.namedNode(value)
      }))
    }, {
      type: "bgp",
      triples: [{
        subject: dataFactory.variable("id"),
        predicate: dataFactory.namedNode(getIriWithoutArrows(this.predicate)),
        object: dataFactory.variable(this.id),
      }]
    }]
  }

  public buildOptionsQuery(): Query {
    const resourcePattern = this.sfsApi?.getResourcePattern();
    const queryString = (
      `SELECT DISTINCT  ?cnt ?value ?label
WHERE
  { { SELECT DISTINCT  ?value (COUNT(DISTINCT ?id) AS ?cnt)
      WHERE
        { ?id  ${this.predicate}  ?value
        }
      GROUP BY ?value
    }
    FILTER isIRI(?value) 
    ${this.labelPredicates.map((labelPredicate, i) => `
            OPTIONAL
              { ?value  ${labelPredicate}  ?_label${i}
                FILTER langMatches(lang(?_label${i}), "${this.sfsApi?.language}")
              }`
      ).join(" ")}
    BIND(coalesce(${this.labelPredicates.map((labelPredicate, i) => `?_label${i}, `).join("")}?value) AS ?label)
  }
ORDER BY DESC(?cnt) ASC(?label)`
    );
    const query = this.sfsApi?.sparqlParser.parse(queryString) as SelectQuery;
    // @ts-ignore
    query.where[0].patterns[0].where.push(resourcePattern);
    return query;
  }

  public resetState(): void {
    this.value = undefined;
  }
}
