export abstract class BaseError extends Error {
  abstract code: string;
  abstract messageDict: Record<string, string>;

  /**
   * Optional structured payload surfaced into the GraphQL error `extensions`
   * alongside `code`. Use for machine-readable context the client must act on
   * (e.g. the project id an SSO-required error should route to).
   */
  details?: Record<string, unknown>;

  constructor(message?: string) {
    super(message ?? ''); // compatible with safari
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toString() {
    return `[${this.code}] ${this.messageDict?.en ?? 'Unknown error occurred'}`;
  }

  getMessage(locale: string) {
    return this.messageDict[locale] || this.messageDict.en;
  }
}
