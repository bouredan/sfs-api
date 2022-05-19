import {SfsApi, SelectFacet, Facet} from "../src";
import {PassThrough} from "stream";

describe('SelectFacet', () => {

  let sfsApi: SfsApi;
  let facet: Facet;

  beforeEach(() => {
    facet = new SelectFacet({
      id: "id",
      predicate: "a"
    });
    sfsApi = new SfsApi({
      endpointUrl: "https://dbpedia.org/sparql",
      facets: [facet],
      baseQuery: "SELECT DISTINCT ?_id ?_label WHERE {?_id ?y ?_label}",
      language: "en"
    });
  });

  it('emits FETCH_FACET_OPTIONS_SUCCESS event', done => {
    jest.spyOn(sfsApi, "fetchBindings")
      .mockImplementation(() => {
        const stream = new PassThrough();
        stream.end();
        return Promise.resolve(stream);
      });
    sfsApi.eventStream.on("FETCH_FACET_OPTIONS_SUCCESS", event => {
      done();
    });
    facet.refreshOptions();
  });

  it('emits FETCH_FACET_OPTIONS_ERROR event', done => {
    jest.spyOn(sfsApi, "fetchBindings")
      .mockImplementation(() => {
        const stream = new PassThrough();
        stream.end();
        return Promise.reject();
      });
    sfsApi.eventStream.on("FETCH_FACET_OPTIONS_ERROR", event => {
      done();
    });
    facet.refreshOptions()
      .catch(() => {
      });
  });
});