import {FacetState} from "./facets/Facet";

export type SfsEventType =
  | "NEW_SEARCH"
  | "FACET_STATE_CHANGED"
  | "FETCH_FACET_OPTIONS_PENDING"
  | "FETCH_FACET_OPTIONS_SUCCESS"
  | "FETCH_FACET_OPTIONS_ERROR"
  | "FETCH_RESULTS_PENDING"
  | "FETCH_RESULTS_SUCCESS"
  | "FETCH_RESULTS_ERROR";

export interface SfsEvent<T = unknown> {
  type: SfsEventType,
  value: T,
}

export interface FacetStateChangedEvent<T> extends SfsEvent<FacetState<T>> {
  type: "FACET_STATE_CHANGED",
  value: FacetState<T>
}

export class SfsEventStream {

  private readonly subscribers = new Map<SfsEventType, ((event: SfsEvent) => void)[]>();

  public on(eventType: SfsEventType, callback: (event: SfsEvent) => void) {
    const eventSubscribers = this.subscribers.get(eventType) ?? [];
    if (!eventSubscribers.includes(callback)) {
      eventSubscribers.push(callback);
    }
    this.subscribers.set(eventType, eventSubscribers);
  }

  public emitEvent(type: SfsEventType, value: unknown = undefined) {
    this.emit({type, value});
  }

  public emit(event: SfsEvent) {
    this.subscribers.get(event.type)?.forEach(subscriber => subscriber(event));
  }
}
