import {FacetOption} from "./facets/Facet";
import {Results} from "./SfsApi";

/**
 * Class used for emitting and subscribing to events.
 * It is the main interface for facets communication between each other and also the user interface.
 */
export class SfsEventStream {

  private readonly subscribers = new Map<SfsEventType, ((event: SfsEvent) => void)[]>();

  /**
   * Used for subscribing to events.
   * Note that events from all facets will be subscribed.
   * If you want to act on events from only one facet you have to check if event.facetId === facet.id in callback.
   *
   * @param eventType - event type to subscribe
   * @param callback
   */
  public on<T extends SfsEvent["type"]>(eventType: T, callback: (event: Extract<SfsEvent, { type: T }>) => void) {
    const eventSubscribers = this.subscribers.get(eventType) ?? [];
    // TODO this is safe but fix type inference here to avoid "as"
    if (!eventSubscribers.includes(callback as (event: SfsEvent) => void)) {
      eventSubscribers.push(callback as (event: SfsEvent) => void);
    }
    this.subscribers.set(eventType, eventSubscribers);
  }

  /**
   * Emits provided event.
   *
   * @param event - event to emit
   */
  public emit(event: SfsEvent) {
    this.subscribers.get(event.type)?.forEach(subscriber => subscriber(event));
  }
}

export type SfsEventType =
  | "RESET_STATE"
  | "NEW_SEARCH"
  | "FACET_VALUE_CHANGED"
  | "FETCH_FACET_OPTIONS_PENDING"
  | "FETCH_FACET_OPTIONS_SUCCESS"
  | "FETCH_FACET_OPTIONS_ERROR"
  | "FETCH_RESULTS_PENDING"
  | "FETCH_RESULTS_SUCCESS"
  | "FETCH_RESULTS_ERROR";

export type SfsEvent =
  | ResetStateEvent
  | NewSearchEvent
  | FacetValueChangedEvent
  | FetchFacetOptionsPendingEvent
  | FetchFacetOptionsSuccessEvent
  | FetchFacetOptionsErrorEvent
  | FetchResultsPendingEvent
  | FetchResultsSuccessEvent
  | FetchResultsErrorEvent;

export interface ResetStateEvent {
  type: "RESET_STATE"
}

export interface NewSearchEvent {
  type: "NEW_SEARCH",
  searchPattern: string,
}

export interface FacetValueChangedEvent {
  type: "FACET_VALUE_CHANGED",
  facetId: string,
  value: unknown
}

export interface FetchFacetOptionsPendingEvent {
  type: "FETCH_FACET_OPTIONS_PENDING",
  facetId: string,
}

export interface FetchFacetOptionsSuccessEvent {
  type: "FETCH_FACET_OPTIONS_SUCCESS",
  facetId: string,
  options: FacetOption[],
}

export interface FetchFacetOptionsErrorEvent {
  type: "FETCH_FACET_OPTIONS_ERROR",
  facetId: string,
  error?: any,
}

export interface FetchResultsPendingEvent {
  type: "FETCH_RESULTS_PENDING",
}

export interface FetchResultsSuccessEvent {
  type: "FETCH_RESULTS_SUCCESS",
  results: Results,
}

export interface FetchResultsErrorEvent {
  type: "FETCH_RESULTS_ERROR",
  error?: any,
}
