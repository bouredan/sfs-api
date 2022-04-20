import dataFactory from "@rdfjs/data-model";
import {IBindings, ISparqlEndpointFetcherArgs, SparqlEndpointFetcher} from "fetch-sparql-endpoint";
import {FilterPattern, Generator, Parser, Query, SelectQuery, VariableTerm} from "sparqljs";

import {Facet} from "./facets/Facet";
import {SfsEventStream} from "./Events";

/**
 * Bindings represent SPARQL bindings of variables from results query.
 */
export type Bindings = IBindings;

/**
 * Interface representing processed results fetched by results query.
 */
export interface Results {
  variables: VariableTerm[],
  bindings: Bindings[],
}

/**
 * Interface representing SPARQL prefixes used in SPARQL queries.
 */
export type Prefixes = { [prefix: string]: string };

/**
 * Interface representing {@link SfsApi} configuration.
 * Extends {@link ISparqlEndpointFetcherArgs} which are passed to {@link SparqlEndpointFetcher}.
 */
export interface SfsApiConfig extends ISparqlEndpointFetcherArgs {
  endpointUrl: string,
  queryTemplate: string,
  facets: Facet[],
  language: string,
  prefixes?: Prefixes,
}

/**
 * Class representing whole facet search API. It is core class of this library.
 */
export class SfsApi {
  /**
   * SPARQL Parser used for parsing text SPARQL queries to {@link Query} structure.
   * {@link prefixes} passed to constructor of this class are passed used in this parser.
   */
  public readonly sparqlParser
  /**
   * SPARQL Generator used to stringify {@link Query} structure to text query.
   * {@link prefixes} passed to constructor of this class are used in this generator.
   */
  public readonly sparqlGenerator;
  /**
   * Language used for filtering right labels for facets.
   * Should be the same as used in {@link queryTemplate}.
   */
  public readonly language: string;

  /**
   * Sole event stream used in this library.
   * Facets and API emit their events there and listen for other events.
   */
  public readonly eventStream: SfsEventStream;

  private readonly endpointUrl: string;
  private readonly queryTemplate: SelectQuery;
  private readonly facets: Facet[];

  private readonly fetcher;

  private searchPattern: string = "";

  public constructor({endpointUrl, queryTemplate, facets, language, prefixes, ...fetcherProps}: SfsApiConfig) {
    this.sparqlGenerator = new Generator({prefixes: prefixes});
    this.sparqlParser = new Parser({prefixes: prefixes});
    this.eventStream = new SfsEventStream();
    this.eventStream.on("FACET_VALUE_CHANGED", () => this.fetchResults());

    this.endpointUrl = endpointUrl;
    this.queryTemplate = this.sparqlParser.parse(queryTemplate) as SelectQuery;
    this.language = language;

    this.facets = facets.map(facet => {
      facet.sfsApi = this;
      return facet;
    });

    this.fetcher = new SparqlEndpointFetcher(fetcherProps);
  }

  /**
   * Builds results query from actual state and fetches new results using it.
   * Also streams events FETCH_RESULT_XXX to communicate its progress.
   *
   * @returns Promise containing the {@link Results}
   */
  public async fetchResults() {
    const query = this.buildResultsQuery();
    this.eventStream.emit({
      type: "FETCH_RESULTS_PENDING",
    });
    return this.fetchBindings(query)
      .then(bindingsStream => {
        return processResultsBindingsStream(bindingsStream)
          .then(results => {
            this.eventStream.emit({
              type: "FETCH_RESULTS_SUCCESS",
              results
            });
            return results;
          })
      })
      .catch(error => {
        this.eventStream.emit({
          type: "FETCH_RESULTS_ERROR",
          error: error,
        });
        throw error;
      })
  }

  /**
   * Initiates new search with provided {@link searchPattern}.
   * Resets all facet states and returns new results via {@link fetchResults}.
   *
   * @param searchPattern - ?_label variable in queryTemplate has to contain this search pattern
   *
   * @returns Promise containing the {@link Results}
   */
  public async newSearch(searchPattern: string) {
    this.searchPattern = searchPattern;
    this.eventStream.emit({
      type: "RESET_STATE",
    });
    this.eventStream.emit({
      type: "NEW_SEARCH",
      searchPattern,
    });
    return this.fetchResults();
  }

  /**
   * Stringifies provided {@link query} and uses it to fetch bindings using {@link fetcher}.
   *
   * @param query - used for fetching bindings
   * @returns promise of readable stream of fetched bindings
   */
  public async fetchBindings(query: Query) {
    const queryString = this.sparqlGenerator.stringify(query);
    return this.fetcher.fetchBindings(this.endpointUrl, queryString);
  }

  /**
   * Used to get API and all active facet constraints.
   *
   * @param exceptFacetId - facet id of facet which should not be accounted in returned constraints.
   */
  public getAllConstraints(exceptFacetId?: string) {
    const query = this.getQueryTemplate();
    if (this.searchPattern) {
      const filterPattern = generateSparqlFilterPattern("_label", this.searchPattern);
      query.where?.push(filterPattern)
    }
    this.facets.forEach(facet => {
      if (facet.isActive() && facet.id !== exceptFacetId) {
        query.where?.push(...facet.getFacetConstraints() ?? []);
      }
    })
    return query.where;
  }

  private buildResultsQuery() {
    const query = this.getQueryTemplate();
    query.where = this.getAllConstraints();
    return query
  }

  private getQueryTemplate(): SelectQuery {
    return { // shallow copy (with deep "where" clone) is made to not mutate original queryTemplate
      ...this.queryTemplate,
      where: this.queryTemplate.where ? [...this.queryTemplate.where] : []
    };
  }
}

/**
 * Processes provided stream to {@link Results} structure.
 * Returns all bindings present in provided stream.
 *
 * @param stream - stream to process to {@link Results} structure
 */
function processResultsBindingsStream(stream: NodeJS.ReadableStream): Promise<Results> {
  return new Promise<Results>((resolve, reject) => {
    let variables: VariableTerm[];
    const bindings: Bindings[] = [];
    stream.on("variables", fetchedVariables => {
      variables = fetchedVariables;
    })
    stream.on("data", fetchedBindings => {
      bindings.push(fetchedBindings);
    });
    stream.on("error", reject);
    stream.on("end", () => {
      resolve({variables, bindings});
    });
  });
}

/**
 * Generates SPARQL FILTER() pattern.
 * Both parameters are converted by SPARQL LCASE() to lowercase.
 *
 * @param variableToFilter - variable used in FILTER()
 * @param filterValue - value used int FILTER()
 *
 * @returns pattern representing SPARQL FILTER pattern {@link FilterPattern}
 */
function generateSparqlFilterPattern(variableToFilter: string, filterValue: string): FilterPattern {
  return {
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
          "args": [dataFactory.literal(filterValue)]
        }
      ]
    }
  };
}
