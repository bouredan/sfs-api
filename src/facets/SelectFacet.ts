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
        subject: dataFactory.variable("_id"),
        predicate: dataFactory.namedNode(getIriWithoutArrows(this.predicate)),
        object: dataFactory.namedNode(this.value),
      }]
    };
  }

  public buildOptionsQuery(): Query {
    const resourcePattern = this.sfsApi?.getApiConstraints();
    const queryString = (
      `SELECT DISTINCT  ?${this.optionCountVariable} ?${this.optionValueVariable} ?${this.optionLabelVariable}
WHERE
  { { SELECT DISTINCT  ?${this.optionValueVariable} (COUNT(DISTINCT ?_id) AS  ?${this.optionCountVariable})
      WHERE
        { ?_id  ${this.predicate}   ?${this.optionValueVariable}
        }
      GROUP BY  ?${this.optionValueVariable}
    }
    FILTER isIRI( ?${this.optionValueVariable})
    ${this.labelPredicates.map((labelPredicate, i) => `
            OPTIONAL
              {  ?${this.optionValueVariable}  ${labelPredicate}   ?${this.optionLabelVariable}${i}
                FILTER langMatches(lang( ?${this.optionLabelVariable}${i}), "${this.sfsApi?.language ?? "en"}")
              }`
      ).join(" ")}
    BIND(coalesce(${this.labelPredicates.map((labelPredicate, i) => ` ?${this.optionLabelVariable}${i}, `).join("")} ?${this.optionValueVariable}) AS  ?${this.optionLabelVariable})
  }
ORDER BY DESC( ?${this.optionCountVariable}) ASC( ?${this.optionLabelVariable})`
    );
    const query = this.sfsApi?.sparqlParser.parse(queryString) as SelectQuery;
    // @ts-ignore
    query.where[0].patterns[0].where.push(resourcePattern);
    return query;
  }
}
