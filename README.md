# sfs-api
SFS (Semantic Faceted Search) is a library for implementing semantic faceted search in modern web application.

If you want to use SFS in a React app, check out [react-sfs](https://www.npmjs.com/package/react-sfs).

## Installation
Install via `npm install sfs-api` or `yarn add sfs-api`.

## Configuration and usage
First you need to define facets which you want to use. At this moment only 2 facet types are supported - 
[CheckboxFacet](src/facets/CheckboxFacet.ts) and [SelectFacet](src/facets/SelectFacet.ts). However, you can implement 
your own facet by extending abstract [Facet](src/facets/Facet.ts) class. 

Example facets:
```
export const nationalityFacet = new SelectFacet({
  id: "nationality",
  predicate: "dbp:nationality",
  labelPredicates: ["rdfs:label"],
});

export const birthPlaceFacet = new CheckboxFacet({
  id: "birthPlace",
  predicate: "dbp:birthPlace",
  labelPredicates: ["rdfs:label", "skos:prefLabel"],
});
```

Class for interacting with facet search is [SfsApi](src/SfsApi.ts).  
**IMPORTANT: baseQuery has to return _id and _label variable.**  
- _id variable is used as primary row identifier and other facets use this variable to build their own queries.
- _label variable is used when using search query.  

More about configuration properties can be found in [SfsApi documentation](https://bouredan.github.io/sfs-api/classes/SfsApi.html).

Example configuration:
```
const language = "en";
export const sfsApiDbpedia = new SfsApi({
  endpointUrl: "https://dbpedia.org/sparql",
  facets: [nationalityFacet, birthPlaceFacet],
  baseQuery:
    `SELECT DISTINCT ?_id ?_label 
  WHERE 
  { ?_id a dbo:Writer .    
    FILTER isIRI(?_id)
    OPTIONAL
      { ?_id rdfs:label ?rdfsLabel 
        FILTER langMatches(lang(?rdfsLabel), "${language}")
      }
    OPTIONAL
      { ?_id skos:prefLabel ?prefLabel 
        FILTER langMatches(lang(?prefLabel), "${language}")
      }
      BIND(coalesce(?rdfsLabel, ?prefLabel, ?_id) AS ?_label) 
  }
  ORDER BY ASC(?_label)`,
  language,
  prefixes: {
    rdfs: "http://www.w3.org/2000/01/rdf-schema#",
    skos: "http://www.w3.org/2004/02/skos/core#",
    dbp: "http://dbpedia.org/property/",
    dbo: "http://dbpedia.org/ontology/",
  },
});
```
###[API reference](https://bouredan.github.io/sfs-api)

## Events
SfsApi and Facets emit [Events](src/Events.ts). 
You can subscribe to these events and update your UI according to them.

## Examples 
Check out [React demo](https://github.com/bouredan/sfs-react-demo) 
with the use of [react-sfs](https://www.npmjs.com/package/react-sfs).
