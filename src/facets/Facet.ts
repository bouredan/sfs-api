import {Pattern, Query} from "sparqljs";

import {Bindings, SfsApi} from "../SfsApi";


export interface FacetOption {
  value: string,
  label: string,
  count: number,
}

export interface FacetConfig {
  id: string,
  predicate: string,
  labelPredicates?: string[],
}

export abstract class Facet<Value = unknown> {
  public readonly id: string;
  public readonly predicate: string;
  public readonly labelPredicates: string[];
  protected options: FacetOption[];
  protected value: Value | undefined;

  public sfsApi: SfsApi | undefined; // TODO

  private subscribers: ((facetOptions: FacetOption[]) => void)[];

  public constructor({id, predicate, labelPredicates}: FacetConfig) {
    this.id = id;
    this.predicate = predicate;
    this.labelPredicates = labelPredicates ?? [
      "<http://www.w3.org/2000/01/rdf-schema#label>",
      "<http://www.w3.org/2004/02/skos/core#prefLabel>"
    ];
    this.options = [];
    this.subscribers = [];
  }

  public abstract getFacetConstraints(): Pattern | undefined;

  public abstract buildOptionsQuery(): Query;

  public abstract resetState(): void;

  public refreshOptions() {
    const optionsQuery = this.buildOptionsQuery();
    if (!this.sfsApi) {
      console.error("SfsApi is undefined in facet " + this.id);
      return;
    }
    this.sfsApi.fetchBindings(optionsQuery).then(bindingsStream => {
      processOptionsBindingsStream(bindingsStream).then(options => {
        this.options = options
        this.notifySubscribers();
      });
    });
  }

  public isActive() {
    return !!this.value;
  }

  public setValue(value: Value) {
    this.value = value;
    this.sfsApi?.fetchResults();
  }

  public attachSubscriber(subscriber: (facetOptions: FacetOption[]) => void) {
    const isAttached = this.subscribers.includes(subscriber);
    if (isAttached) {
      return console.log("Subscriber already attached.");
    }
    this.subscribers.push(subscriber);
  }

  public detachSubscriber(subscriber: (facetOptions: FacetOption[]) => void) {
    const subscriberIndex = this.subscribers.indexOf(subscriber);
    if (subscriberIndex === -1) {
      return console.log("Subscriber does not exist.");
    }
    this.subscribers.splice(subscriberIndex, 1);
  }

  private notifySubscribers() {
    // const event = new CustomEvent(this.id, {detail: this.options});
    // document.dispatchEvent(event);
    this.subscribers.forEach(subscriber => subscriber(this.options));
  }
}

function processOptionsBindingsStream(stream: NodeJS.ReadableStream): Promise<FacetOption[]> {
  return new Promise<FacetOption[]>((resolve, reject) => {
    const options: FacetOption[] = [];
    stream.on("data", (newBinding: Bindings) => {
      const option: FacetOption = {
        value: newBinding?.value?.value,
        count: parseInt(newBinding?.cnt?.value),
        label: newBinding?.label.value,
      }
      options.push(option);
    });
    stream.on("error", reject);
    stream.on("end", () => {
      resolve(options);
    });
  });
}
