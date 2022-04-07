import {IBindings, SparqlEndpointFetcher} from "fetch-sparql-endpoint";
import {Generator, Parser, Query, SelectQuery, VariableTerm} from "sparqljs";

import {Facet} from "./facets/Facet";


export type Bindings = IBindings;

export interface Results {
  variables: VariableTerm[],
  bindings: Bindings[],
}

type Prefixes = { [prefix: string]: string };

type ResultsSubscriber = (newResults: Results) => void;

interface FacetSearchApiConfig {
  endpointUrl: string,
  queryTemplate: string,
  facets: Facet[],
  prefixes?: Prefixes,
}

export class SfsApi {
  public readonly sparqlParser
  public readonly sparqlGenerator;

  private readonly endpointUrl: string;
  private readonly queryTemplate: SelectQuery;
  private readonly facets: Record<string, Facet>;
  private readonly resultsSubscribers: ResultsSubscriber[] = [];

  private readonly fetcher;

  public constructor({endpointUrl, queryTemplate, facets, prefixes}: FacetSearchApiConfig) {
    this.sparqlGenerator = new Generator({prefixes: prefixes});
    this.sparqlParser = new Parser({prefixes: prefixes});

    this.endpointUrl = endpointUrl;
    this.queryTemplate = this.sparqlParser.parse(queryTemplate) as SelectQuery;

    this.facets = facets.reduce((acc, facet) => {
      facet.sfsApi = this;
      return (
        {...acc, [facet.id]: facet}
      );
    }, {});

    this.fetcher = new SparqlEndpointFetcher();
  }

  public async fetchResults(searchPattern?: string) {
    if (searchPattern) {
      Object.values(this.facets).forEach(facet => facet.resetState())

    }
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

  public async fetchBindings(query: Query) {
    const queryString = this.sparqlGenerator.stringify(query);
    return this.fetcher.fetchBindings(this.endpointUrl, queryString);
  }

  public getResourcePattern() {
    return this.queryTemplate.where;
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
    const query: SelectQuery = { // shallow copy (with deep "where" clone) is made to not mutate original queryTemplate
      ...this.queryTemplate,
      where: this.queryTemplate.where ? [...this.queryTemplate.where] : []
    };
    Object.values(this.facets).forEach(facet => {
      if (facet.isActive()) {
        const constraints = facet.getFacetConstraints();
        if (constraints) {
          query.where?.push(constraints);
        }
      }
    });
    return query
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

