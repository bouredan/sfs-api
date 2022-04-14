import {IBindings, ISparqlEndpointFetcherArgs, SparqlEndpointFetcher} from "fetch-sparql-endpoint";
import {Generator, Parser, Query, SelectQuery, VariableTerm} from "sparqljs";

import {Facet} from "./facets/Facet";
import {generateFilterSearchPattern} from "./QueryParts";


export type Bindings = IBindings;

export interface Results {
  variables: VariableTerm[],
  bindings: Bindings[],
}

type Prefixes = { [prefix: string]: string };

type ResultsSubscriber = (newResults: Results) => void;

interface FacetSearchApiConfig extends ISparqlEndpointFetcherArgs {
  endpointUrl: string,
  queryTemplate: string,
  facets: Facet[],
  language: string,
  prefixes?: Prefixes,
}

export class SfsApi {
  public readonly sparqlParser
  public readonly sparqlGenerator;

  private readonly endpointUrl: string;
  private readonly queryTemplate: SelectQuery;
  private readonly facets: Record<string, Facet>;
  public readonly language: string;

  private readonly resultsSubscribers: ResultsSubscriber[] = [];
  private readonly fetcher;

  private searchPattern: string = "";

  public constructor({endpointUrl, queryTemplate, facets, language, prefixes, ...other}: FacetSearchApiConfig) {
    this.sparqlGenerator = new Generator({prefixes: prefixes});
    this.sparqlParser = new Parser({prefixes: prefixes});

    this.endpointUrl = endpointUrl;
    this.queryTemplate = this.sparqlParser.parse(queryTemplate) as SelectQuery;
    this.language = language;

    this.facets = facets.reduce((acc, facet) => {
      facet.sfsApi = this;
      return (
        {...acc, [facet.id]: facet}
      );
    }, {});

    this.fetcher = new SparqlEndpointFetcher(other);
  }

  public async fetchResults() {
    const query = this.buildResultsQuery();
    return this.fetchBindings(query)
      .then(bindingsStream => {
        return processResultsBindingsStream(bindingsStream)
          .then(results => {
            this.notifyResultsSubscribers(results);
            return results;
          })
      })
  }

  public async newSearch(searchPattern: string) {
    if (searchPattern !== this.searchPattern) {
      this.searchPattern = searchPattern;
      Object.values(this.facets).forEach(facet => facet.resetState());
    }
    return this.fetchResults();
  }

  public async fetchBindings(query: Query) {
    const queryString = this.sparqlGenerator.stringify(query);
    return this.fetcher.fetchBindings(this.endpointUrl, queryString);
  }

  public getApiConstraints() {
    const query = this.getQueryTemplate();
    if (this.searchPattern) {
      const filterPattern = generateFilterSearchPattern("_label", this.searchPattern);
      query.where?.push(filterPattern)
    }
    return query.where;
  }

  public attachResultsSubscriber(subscriber: ResultsSubscriber) {
    const isAttached = this.resultsSubscribers.includes(subscriber);
    if (isAttached) {
      return console.log("Subscriber already attached.");
    }
    this.resultsSubscribers.push(subscriber);
  }

  public detachResultsSubscriber(subscriber: ResultsSubscriber) {
    const subscriberIndex = this.resultsSubscribers.indexOf(subscriber);
    if (subscriberIndex === -1) {
      return console.log("Subscriber does not exist.");
    }
    this.resultsSubscribers.splice(subscriberIndex, 1);
  }

  private notifyResultsSubscribers(newResults: Results) {
    this.resultsSubscribers.forEach(subscriber => subscriber(newResults))
  }

  private buildResultsQuery() {
    const query = this.getQueryTemplate();
    query.where = this.getApiConstraints();
    Object.values(this.facets).forEach(facet => {
      if (facet.isActive()) {
        const constraints = facet.getFacetConstraints();
        if (constraints) {
          if (Array.isArray(constraints)) {
            query.where?.push(...constraints);
          } else {
            query.where?.push(constraints);
          }
        }
      }
    });
    return query
  }

  private getQueryTemplate(): SelectQuery {
    return { // shallow copy (with deep "where" clone) is made to not mutate original queryTemplate
      ...this.queryTemplate,
      where: this.queryTemplate.where ? [...this.queryTemplate.where] : []
    };
  }
}

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

export function getIriWithoutArrows(iri: string) {
  return iri.replace(/^<(.+)>$/, "$1");
}
