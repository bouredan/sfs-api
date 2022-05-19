import {SfsApi} from "../src";

describe('Configuration of SfsApi', () => {
  it('should create SfsApi on right config', () => {
      const sfsApi = new SfsApi({
        endpointUrl: "https://dbpedia.org/sparql",
        facets: [],
        baseQuery: "SELECT DISTINCT ?_id ?_label WHERE {?_id ?y ?_label}",
        language: "en"
      });
      expect(sfsApi).toBeInstanceOf(SfsApi);
    }
  );

  it('should throw an error on baseQuery without _id variable', () => {
    expect(() => {
      new SfsApi({
        endpointUrl: "https://dbpedia.org/sparql",
        facets: [],
        baseQuery: "SELECT DISTINCT ?x ?_label WHERE {?x ?y ?_label}",
        language: "en"
      });
    }).toThrowError("SfsApi baseQuery has to SELECT ?_id variable. Check documentation for more info.")
  });

  it('should throw an error on baseQuery without _label variable', () => {
    expect(() => {
      new SfsApi({
        endpointUrl: "https://dbpedia.org/sparql",
        facets: [],
        baseQuery: "SELECT DISTINCT ?_id WHERE {?_id ?y ?z}",
        language: "en"
      });
    }).toThrowError("SfsApi baseQuery has to SELECT ?_label variable. Check documentation for more info.")
  });
});