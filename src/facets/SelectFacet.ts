import {Pattern, Query, SelectQuery} from "sparqljs";

import {Facet} from "./Facet";


/**
 * Class representing select-like facet.
 */
export class SelectFacet extends Facet<string> {

  public getFacetConstraints(): Pattern[] | undefined {
    if (!this.value) {
      return undefined;
    }
    const selectFacetConstraintsQuery = `SELECT * WHERE { ?_id ${this.predicate} <${this.value}> }`
    const parsedQuery = this.sfsApi.sparqlParser.parse(selectFacetConstraintsQuery) as SelectQuery;
    return parsedQuery?.where;
  }

  public buildOptionsQuery(): Query {
    const apiConstraints = this.sfsApi.getAllConstraints(this.id);
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
                FILTER langMatches(lang( ?${this.optionLabelVariable}${i}), "${this.sfsApi.language}")
              }`
      ).join(" ")}
    BIND(coalesce(${this.labelPredicates.map((labelPredicate, i) => ` ?${this.optionLabelVariable}${i}, `).join("")} ?${this.optionValueVariable}) AS  ?${this.optionLabelVariable})
  }
ORDER BY DESC( ?${this.optionCountVariable}) ASC( ?${this.optionLabelVariable})`
    );
    const query = this.sfsApi.sparqlParser.parse(queryString) as SelectQuery;
    if (apiConstraints) {
      // @ts-ignore This is safe since we know how the query above will be parsed.
      query.where[0].patterns[0].where.push(...apiConstraints);
    }
    return query;
  }
}
