import dataFactory from "@rdfjs/data-model";
import {FilterPattern} from "sparqljs";

export const generateFilterSearchPattern = (variableToFilter: string, searchPattern: string) => <FilterPattern>({
  "type": "filter",
  "expression": {
    "type": "operation",
    "operator": "contains",
    "args": [
      {
        "type": "operation",
        "operator": "lcase",
        "args": [
          {
            "type": "operation",
            "operator": "str",
            "args": [dataFactory.variable(variableToFilter)]
          }
        ]
      },
      {
        "type": "operation",
        "operator": "lcase",
        "args": [dataFactory.literal(searchPattern)]
      }
    ]
  }
});