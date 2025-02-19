export abstract class BaseError extends Error {
  abstract code: string;
  abstract messageDict: Record<string, string>;

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
