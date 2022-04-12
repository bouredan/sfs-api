import {Pattern, Query, SelectQuery} from "sparqljs";
import dataFactory from "@rdfjs/data-model";

import {Facet} from "./Facet";
import {getIriWithoutArrows} from "../SfsApi";


export class SelectFacet extends Facet<string> {

  public getFacetConstraints(): Pattern | undefined {
    if (!this.value) {
      return undefined;
    }
    return {
      type: "bgp",
      triples: [{
        subject: dataFactory.variable("id"),
        predicate: dataFactory.namedNode(getIriWithoutArrows(this.predicate)),
        object: dataFactory.namedNode(this.value),
      }]
    };
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
    ${this.labelPredicates.map(labelPredicate => `
            OPTIONAL
              { ?value  ${labelPredicate}  ?_label
                FILTER langMatches(lang(?_label), "${this.sfsApi?.language}")
              }`
      ).join(" ")}
    BIND(coalesce(?_label, ?value) AS ?label)
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