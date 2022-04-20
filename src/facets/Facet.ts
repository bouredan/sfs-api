import {Pattern, Query} from "sparqljs";

import {Bindings, SfsApi} from "../SfsApi";

/**
 * Interface representing facet options.
 */
export interface FacetOption {
  value: string,
  label: string,
  /**
   * Number of how many times is this value present in results.
   */
  count: number,
}

/**
 * Interface represents facet configuration.
 */
export interface FacetConfig {
  id: string,
  predicate: string,
  /**
   * Expected predicates for option labels. First to match is used in order of array elements.
   */
  labelPredicates?: string[],
}

/**
 * Class representing facet and its state.
 * Handles facet updates and fetching its own options.
 *
 * Can be extended to create custom facet.
 */
export abstract class Facet<Value = unknown> {
  public readonly id: string;
  public readonly predicate: string;
  public readonly labelPredicates: string[];
  public readonly optionValueVariable: string;
  public readonly optionCountVariable: string;
  public readonly optionLabelVariable: string;
  protected options: FacetOption[];
  protected _value: Value | undefined;

  /**
   *  This property is set by SfsApi class if it is passed to it on construction.
   *  {@link _sfsApi} is used to construct this facet's queries and to access event stream.
   *   Without setting this property, this facet cannot function properly.
   */
  public _sfsApi: SfsApi | undefined;

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
  }

  /**
   * Facet constraints are patterns which this method represents for other facets or SfsApi.
   *
   * @returns facet constraints
   */
  public abstract getFacetConstraints(): Pattern[] | undefined;

  /**
   * Abstract method for building query used for fetching this facet options from current state.
   * State of {@link SfsApi} should be accounted too.
   * This method is implemented in individual facet types.
   *
   * @returns options query
   */
  public abstract buildOptionsQuery(): Query;

  /**
   * Fetches and sets new options from current state.
   * Emits events of fetch progress.
   */
  public refreshOptions() {
    const optionsQuery = this.buildOptionsQuery();
    this.sfsApi.eventStream.emit({
      type: "FETCH_FACET_OPTIONS_PENDING",
      facetId: this.id
    });
    this.sfsApi.fetchBindings(optionsQuery).then(bindingsStream => {
      this.processOptionsBindingsStream(bindingsStream).then(options => {
        this.options = options
        this.sfsApi.eventStream.emit({
          type: "FETCH_FACET_OPTIONS_SUCCESS",
          facetId: this.id,
          options,
        });
      });
    }).catch(error => {
      this.sfsApi.eventStream.emit({
        type: "FETCH_FACET_OPTIONS_ERROR",
        facetId: this.id,
        error,
      });
      throw error;
    });
  }

  /**
   * Returns if this facet is active.
   * Active facets are facets with a value and thus should be accounted in {@link SfsApi} all constraints.
   */
  public isActive(): boolean {
    return Boolean(this.value) || (Array.isArray(this.value) ? this.value.length > 0 : false);
  }

  public get sfsApi() {
    if (!this._sfsApi) {
      throw ("Facet was not assigned to an API. Check documentation for more details.");
    }
    return this._sfsApi;
  }

  public set sfsApi(newSfsApi) {
    if (!newSfsApi) {
      throw ("Cannot assign undefined sfsApi. Check documentation for more details.");
    }
    if (this._sfsApi != newSfsApi) {
      this._sfsApi = newSfsApi;
      this._sfsApi.eventStream.on("RESET_STATE", () => {
        this.setValue(undefined, false);
      });
      this._sfsApi.eventStream.on("NEW_SEARCH", () => {
        this.refreshOptions();
      });
      this._sfsApi.eventStream.on("FACET_VALUE_CHANGED", (event) => {
        if (event.facetId !== this.id && event.refreshOtherFacets) {
          this.refreshOptions();
        }
      });
    }
  }

  public get value() {
    return this._value;
  }

  public set value(newValue) {
    this.setValue(newValue, true);
  }

  private setValue(newValue: Value | undefined, refreshOtherFacets?: boolean) {
    this._value = newValue;
    this.sfsApi.eventStream.emit({
      type: "FACET_VALUE_CHANGED",
      facetId: this.id,
      value: this.value,
      refreshOtherFacets
    });
  };

  /**
   * Transforms bindings stream from SPARQL endpoint to {@link FacetOption[]} structure.
   * Bindings variables are identified by {@link optionValueVariable}, {@link optionCountVariable}
   * and {@link optionLabelVariable}.
   *
   * @param stream - stream to process
   * @returns stream of facet options
   * @private
   */
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
