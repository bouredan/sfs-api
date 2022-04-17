import {Pattern, Query} from "sparqljs";

import {Bindings, SfsApi} from "../SfsApi";

export interface FacetState<Value = unknown> {
  options: FacetOption[],
  value?: Value,
}

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
  public readonly optionValueVariable: string;
  public readonly optionCountVariable: string;
  public readonly optionLabelVariable: string;
  protected options: FacetOption[];
  protected value: Value | undefined;

  /* This property is set by SfsApi class when constructing from passed facets */
  public _sfsApi: SfsApi | undefined;

  private subscribers: ((facetOptions: FacetState<Value>) => void)[];

  public constructor({id, predicate, labelPredicates}: FacetConfig) {
    this.id = id;
    this.predicate = predicate;

    /* Default values when no label predicates are set. */
    this.labelPredicates = labelPredicates ?? [
      "<http://www.w3.org/2000/01/rdf-schema#label>",
      "<http://www.w3.org/2004/02/skos/core#prefLabel>"
    ];
    this.optionValueVariable = `_${this.id}Value`;
    this.optionCountVariable = `_${this.id}Count`;
    this.optionLabelVariable = `_${this.id}Label`;
    this.options = [];
    this.subscribers = [];
  }

  public abstract getFacetConstraints(): Pattern[] | undefined;

  public abstract buildOptionsQuery(): Query;

  public refreshOptions() {
    const optionsQuery = this.buildOptionsQuery();
    this.sfsApi.eventStream.emitEvent("FETCH_FACET_OPTIONS_PENDING", this.value);
    this.sfsApi.fetchBindings(optionsQuery).then(bindingsStream => {
      this.processOptionsBindingsStream(bindingsStream).then(options => {
        this.options = options
        this.sfsApi.eventStream.emitEvent("FETCH_FACET_OPTIONS_SUCCESS");
        this.notifySubscribers();
      });
    }).catch(error => {
      this.sfsApi.eventStream.emitEvent("FETCH_FACET_OPTIONS_ERROR", error);
      throw error;
    });
  }

  public isActive(): boolean {
    return !!this.value || (Array.isArray(this.value) ? this.value.length > 0 : false);
  }

  public resetState() {
    this.value = undefined;
    this.refreshOptions(); // TODO handle race condition on new search (some are reseted some not)
  };

  public setValue(value: Value) {
    this.value = value;
    this.sfsApi.fetchResults();
    this.notifySubscribers();
  }

  public attachSubscriber(subscriber: (facetState: FacetState<Value>) => void) {
    const isAttached = this.subscribers.includes(subscriber);
    if (isAttached) {
      return console.log("Subscriber already attached.");
    }
    this.subscribers.push(subscriber);
  }

  public detachSubscriber(subscriber: (facetOptions: FacetState<Value>) => void) {
    const subscriberIndex = this.subscribers.indexOf(subscriber);
    if (subscriberIndex === -1) {
      return console.log("Subscriber does not exist.");
    }
    this.subscribers.splice(subscriberIndex, 1);
  }

  public get sfsApi() {
    if (!this._sfsApi) {
      throw ("Facet was not assigned to an API. Check documentation for more details."); // TODO add links
    }
    return this._sfsApi;
  }

  private notifySubscribers() {
    // const event = new CustomEvent(this.id, {detail: this.options});
    // document.dispatchEvent(event);
    this.subscribers.forEach(subscriber => subscriber({
      options: this.options,
      value: this.value,
    }));
  }

  private processOptionsBindingsStream(stream: NodeJS.ReadableStream): Promise<FacetOption[]> {
    return new Promise<FacetOption[]>((resolve, reject) => {
      const options: FacetOption[] = [];
      stream.on("data", (newBinding: Bindings) => {
        const option: FacetOption = {
          value: newBinding[this.optionValueVariable].value,
          count: parseInt(newBinding[this.optionCountVariable].value),
          label: newBinding[this.optionLabelVariable].value,
        }
        options.push(option);
      });
      stream.on("error", reject);
      stream.on("end", () => {
        resolve(options);
      });
    });
  }
}
