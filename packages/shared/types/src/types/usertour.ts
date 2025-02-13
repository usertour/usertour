export interface Usertour {
  _stubbed: boolean;

  load: () => Promise<void>;

  init: (token: string) => void;

  identify: (userId: string, attributes?: Attributes, opts?: IdentifyOptions) => Promise<void>;

  identifyAnonymous: (attributes?: Attributes, opts?: IdentifyOptions) => Promise<void>;

  updateUser: (attributes: Attributes, opts?: IdentifyOptions) => Promise<void>;

  group: (groupId: string, attributes?: Attributes, opts?: GroupOptions) => Promise<void>;

  updateGroup: (attributes: Attributes, opts?: GroupOptions) => Promise<void>;

  track(name: string, attributes?: EventAttributes, opts?: TrackOptions): Promise<void>;

  isIdentified: () => boolean;

  start: (contentId: string, opts?: StartOptions) => Promise<void>;

  endAll: () => Promise<void>;

  reset: () => void;

  remount: () => void;

  // eslint-disable-next-line es5/no-rest-parameters
  on(eventName: string, listener: (...args: any[]) => void): void;

  // eslint-disable-next-line es5/no-rest-parameters
  off(eventName: string, listener: (...args: any[]) => void): void;

  // setCustomInputSelector(customInputSelector: string | null): void;

  // registerCustomInput(
  //   cssSelector: string,
  //   getValue?: (el: Element) => string
  // ): void;

  // setCustomNavigate(customNavigate: ((url: string) => void) | null): void;

  // setUrlFilter(urlFilter: ((url: string) => string) | null): void;

  // setLinkUrlDecorator(linkUrlDecorator: ((url: string) => string) | null): void;

  // setInferenceAttributeNames(attributeNames: string[]): void;

  // setInferenceAttributeFilter(
  //   attributeName: string,
  //   filters: StringFilters
  // ): void;

  // setInferenceClassNameFilter(filters: StringFilters): void;

  // setScrollPadding(scrollPadding: ScrollPadding | null): void;

  // setCustomScrollIntoView(scrollIntoView: ((el: Element) => void) | null): void;

  // _setTargetEnv(targetEnv: unknown): void;

  // setShadowDomEnabled(shadowDomEnabled: boolean): void;

  // setPageTrackingDisabled(pageTrackingDisabled: boolean): void;

  setBaseZIndex(baseZIndex: number): void;

  // setServerEndpoint(serverEndpoint: string | null | undefined): void;

  // disableEvalJs(): void;
}

export interface Attributes {
  [name: string]: AttributeLiteralOrList | AttributeChange;
}

type AttributeLiteral = string | number | boolean | null | undefined;
type AttributeLiteralOrList = AttributeLiteral | AttributeLiteral[];

interface AttributeChange {
  set?: AttributeLiteralOrList;
  set_once?: AttributeLiteralOrList;
  add?: string | number;
  subtract?: string | number;
  append?: AttributeLiteralOrList;
  prepend?: AttributeLiteralOrList;
  remove?: AttributeLiteralOrList;
  data_type?: AttributeDataType;
}

type AttributeDataType = 'string' | 'boolean' | 'number' | 'datetime' | 'list';

export type IdentifyOptions = {
  signature?: string;
};

export interface GroupOptions {
  signature?: string;
  membership?: Attributes;
}

export interface EventAttributes {
  [name: string]: AttributeLiteral | EventAttributeChange;
}

interface EventAttributeChange {
  set?: AttributeLiteral;
  data_type?: AttributeDataType;
}

export interface TrackOptions {
  userOnly?: boolean;
}

export interface StartOptions {
  once?: boolean;
}

export interface ResourceCenterState {
  isOpen: boolean;
  hasChecklist: boolean;
  uncompletedChecklistTaskCount: number;
  unreadAnnouncementCount: number;
}

// interface ScrollPadding {
//   top?: number;
//   right?: number;
//   bottom?: number;
//   left?: number;
// }

// type StringFilter = ((className: string) => boolean) | RegExp;

// type StringFilters = StringFilter | StringFilter[];

export interface Deferred {
  resolve: () => void;
  reject: (e: any) => void;
}

export interface WindowWithUsertour extends Window {
  usertour?: Usertour;
  USERTOURJS_QUEUE?: [string, Deferred | null, any[]][];
  USERTOURJS_ENV_VARS?: Record<string, any>;
}
