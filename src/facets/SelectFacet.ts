import {Pattern, Query, SelectQuery} from "sparqljs";
import {DataFactory} from "rdf-data-factory";

import {Facet} from "./Facet";


export class SelectFacet extends Facet<string> {

  public getFacetConstraints(): Pattern | undefined {
    if (!this.value) {
      return undefined;
    }
    const dataFactory = new DataFactory();
    return {
      type: "bgp",
      triples: [{
        subject: dataFactory.variable("id"),
        predicate: dataFactory.namedNode(this.predicate),
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
        { ?id  <http://www.w3.org/2004/02/skos/core#inScheme>  ?value
        }
      GROUP BY ?value
    }
    FILTER bound(?value)
    ${this.labelPredicates.map(labelPredicate => `
            OPTIONAL
              { ?value  ${labelPredicate}  ?_label
                FILTER langMatches(lang(?_label), "cs")
              }`
      ).join(" ")}
    BIND(coalesce(?_label, ?value) AS ?label)
  }
ORDER BY DESC(?cnt) DESC(?label)`
    );
    const query = this.sfsApi?.sparqlParser.parse(queryString) as SelectQuery;
    if (resourcePattern) {
      query.where?.forEach(pattern => {
        if (pattern.type === "query") {
          pattern.where?.push(...resourcePattern);
        }
      })
    }
    return query;
  }

  public resetState(): void {
    this.value = undefined;
  }
}