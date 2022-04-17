import {Pattern, Query, SelectQuery} from "sparqljs";

import {Facet} from "./Facet";


export class CheckboxFacet extends Facet<string[]> {

  public getFacetConstraints(): Pattern[] | undefined {
    if (!this.value || this.value.length === 0) {
      return undefined;
    }
    const checkboxFacetConstraintsQuery = `SELECT * WHERE { ?_id ${this.predicate} <${this.value}> }` // TODO change to checkbox values
    const parsedQuery = this.sfsApi.sparqlParser.parse(checkboxFacetConstraintsQuery) as SelectQuery;
    return parsedQuery?.where;
    // return [{
    //   type: "values",
    //   values: this.value.map(value => ({
    //     [`?_${this.id}`]: dataFactory.namedNode(value)
    //   }))
    // }, {
    //   type: "bgp",
    //   triples: [{
    //     subject: dataFactory.variable("_id"),
    //     predicate: dataFactory.namedNode(getIriWithoutArrows(this.predicate)),
    //     object: dataFactory.variable(`_${this.id}`),
    //   }]
    // }]
  }

  public buildOptionsQuery(): Query {
    const apiConstraints = this.sfsApi.getApiConstraints();
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
                FILTER langMatches(lang( ?${this.optionLabelVariable}${i}), "${this.sfsApi.language ?? "en"}")
              }`
      ).join(" ")}
    BIND(coalesce(${this.labelPredicates.map((labelPredicate, i) => ` ?${this.optionLabelVariable}${i}, `).join("")} ?${this.optionValueVariable}) AS  ?${this.optionLabelVariable})
  }
ORDER BY DESC( ?${this.optionCountVariable}) ASC( ?${this.optionLabelVariable})`
    );
    const query = this.sfsApi.sparqlParser.parse(queryString) as SelectQuery;
    if (apiConstraints) {
      query.where?.push(...apiConstraints);
    }
    return query;
  }
}
