export type FacetType = "select" | "checkbox";
export type FacetOptions = Record<string, number>;

export interface FacetConfig<Value = unknown> {
  type: FacetType,
  id: string,
  predicate: string,
  initialValue: Value,
}

export abstract class Facet<Value = unknown> {
  public readonly type: FacetType;
  public readonly id: string;
  public readonly predicate: string;
  protected options: Record<string, number>;
  protected value: Value;

  protected subscribers: ((facetOptions: FacetOptions) => void)[];

  protected constructor({type, id, predicate, initialValue}: FacetConfig<Value>) {
    this.type = type;
    this.id = id;
    this.predicate = predicate;
    this.options = {};
    this.subscribers = [];
    this.value = initialValue;
  }

  public abstract generateSparql(): string;

  public getValue(): Value {
    return this.value;
  }

  public setValue(value: Value): void {
    this.value = value;
  }

  public addOption(option: string) {
    const optionCount = this.options[option];
    this.options[option] = optionCount ? optionCount + 1 : 1;
    this.notifySubscribers();
  }

  public resetOptions() {
    this.options = {};
  }

  public attachSubscriber(subscriber: (facetOptions: FacetOptions) => void): void {
    const isAttached = this.subscribers.includes(subscriber);
    if (isAttached) {
      return console.log("Subscriber already attached.");
    }
    this.subscribers.push(subscriber);
  }

  public detachSubscriber(subscriber: (facetOptions: FacetOptions) => void): void {
    const subscriberIndex = this.subscribers.indexOf(subscriber);
    if (subscriberIndex === -1) {
      return console.log("Subscriber does not exist.");
    }
    this.subscribers.splice(subscriberIndex, 1);
  }

  private notifySubscribers() {
    this.subscribers.forEach(subscriber => subscriber(this.options))
  }
}
