export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** A date-time string at UTC, such as 2019-12-03T09:54:33Z, compliant with the date-time format. */
  DateTime: { input: string; output: string; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSON: { input: unknown; output: unknown; }
  /** A field whose value is a JSON Web Token (JWT): https://jwt.io/introduction. */
  JWT: { input: string; output: string; }
};

export type AcceptInviteInput = {
  code: Scalars['String']['input'];
  password: Scalars['String']['input'];
  userName: Scalars['String']['input'];
};

export type AccessToken = {
  __typename?: 'AccessToken';
  accessToken: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  expiresAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  lastUsedAt?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  prefix: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type ActiveUserProjectInput = {
  projectId: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};

export type AdminProject = {
  __typename?: 'AdminProject';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  licenseSource: Scalars['String']['output'];
  memberCount: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  ownerEmail?: Maybe<Scalars['String']['output']>;
  ownerName?: Maybe<Scalars['String']['output']>;
  usesInstanceLicense: Scalars['Boolean']['output'];
};

export type AdminProjectList = {
  __typename?: 'AdminProjectList';
  items: Array<AdminProject>;
  page: Scalars['Int']['output'];
  pageSize: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type AdminProjectMember = {
  __typename?: 'AdminProjectMember';
  email?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  isOwner: Scalars['Boolean']['output'];
  name?: Maybe<Scalars['String']['output']>;
  role: Scalars['String']['output'];
  userId?: Maybe<Scalars['String']['output']>;
};

export type AdminSettingsInfo = {
  __typename?: 'AdminSettingsInfo';
  instanceId: Scalars['String']['output'];
  isOverProjectLimit: Scalars['Boolean']['output'];
  licenseInfo?: Maybe<InstanceLicenseInfo>;
  projectCount: Scalars['Int']['output'];
  projectsUsingInstanceLicense: Scalars['Int']['output'];
};

export type AdminUser = {
  __typename?: 'AdminUser';
  createdAt: Scalars['DateTime']['output'];
  disabled: Scalars['Boolean']['output'];
  email?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  isSystemAdmin: Scalars['Boolean']['output'];
  name?: Maybe<Scalars['String']['output']>;
  projectCount: Scalars['Int']['output'];
};

export type AdminUserList = {
  __typename?: 'AdminUserList';
  items: Array<AdminUser>;
  page: Scalars['Int']['output'];
  pageSize: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type Analytics = {
  __typename?: 'Analytics';
  totalCompletions: Scalars['Int']['output'];
  totalViews: Scalars['Int']['output'];
  uniqueCompletions: Scalars['Int']['output'];
  uniqueViews: Scalars['Int']['output'];
  viewsByBlock?: Maybe<Scalars['JSON']['output']>;
  viewsByDay?: Maybe<Scalars['JSON']['output']>;
  viewsByStep?: Maybe<Scalars['JSON']['output']>;
  viewsByTask?: Maybe<Scalars['JSON']['output']>;
};

export type AnalyticsOrder = {
  direction: OrderDirection;
  field: AnalyticsOrderField;
};

/** Properties by which content connections can be ordered. */
export type AnalyticsOrderField =
  | 'createdAt'
  | 'id'
  | 'updatedAt';

export type AnalyticsQuery = {
  contentId: Scalars['String']['input'];
  endDate: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  startDate: Scalars['String']['input'];
  timezone: Scalars['String']['input'];
};

export type ApiToken = {
  __typename?: 'ApiToken';
  clientId?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  environmentIds?: Maybe<Array<Scalars['String']['output']>>;
  expiresAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  lastUsedAt?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  partialKey: Scalars['String']['output'];
  prefix: Scalars['String']['output'];
  projectIds: Array<Scalars['String']['output']>;
  scopes: Array<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type Attribute = {
  __typename?: 'Attribute';
  bizType: Scalars['Int']['output'];
  codeName: Scalars['String']['output'];
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  dataType: Scalars['Int']['output'];
  description: Scalars['String']['output'];
  displayName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  predefined: Scalars['Boolean']['output'];
  projectId: Scalars['String']['output'];
  randomMax?: Maybe<Scalars['Int']['output']>;
  source: Scalars['String']['output'];
  sourceId?: Maybe<Scalars['String']['output']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

export type AttributeOnEvent = {
  __typename?: 'AttributeOnEvent';
  attributeId: Scalars['String']['output'];
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  eventId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

export type AuditLog = {
  __typename?: 'AuditLog';
  action: Scalars['String']['output'];
  actorTokenId?: Maybe<Scalars['String']['output']>;
  actorTokenName?: Maybe<Scalars['String']['output']>;
  actorUserId?: Maybe<Scalars['String']['output']>;
  actorUserName?: Maybe<Scalars['String']['output']>;
  after?: Maybe<Scalars['JSON']['output']>;
  before?: Maybe<Scalars['JSON']['output']>;
  createdAt: Scalars['DateTime']['output'];
  environmentId?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  metadata?: Maybe<Scalars['JSON']['output']>;
  operation: Scalars['String']['output'];
  projectId: Scalars['String']['output'];
  resourceId: Scalars['String']['output'];
  resourceName?: Maybe<Scalars['String']['output']>;
  resourceType: Scalars['String']['output'];
  source: Scalars['String']['output'];
};

export type AuditLogConnection = {
  __typename?: 'AuditLogConnection';
  edges?: Maybe<Array<AuditLogEdge>>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type AuditLogEdge = {
  __typename?: 'AuditLogEdge';
  cursor: Scalars['String']['output'];
  node: AuditLog;
};

export type AuditLogOrder = {
  direction: OrderDirection;
  field: AuditLogOrderField;
};

export type AuditLogOrderField =
  | 'createdAt';

export type AuditLogQuery = {
  action?: InputMaybe<Scalars['String']['input']>;
  actorUserId?: InputMaybe<Scalars['String']['input']>;
  createdAtFrom?: InputMaybe<Scalars['DateTime']['input']>;
  createdAtTo?: InputMaybe<Scalars['DateTime']['input']>;
  environmentId?: InputMaybe<Scalars['String']['input']>;
  resourceId?: InputMaybe<Scalars['String']['input']>;
  resourceType?: InputMaybe<Scalars['String']['input']>;
  source?: InputMaybe<Scalars['String']['input']>;
};

export type Auth = {
  __typename?: 'Auth';
  /** JWT access token */
  accessToken?: Maybe<Scalars['JWT']['output']>;
  projectId?: Maybe<Scalars['String']['output']>;
  /** JWT refresh token */
  refreshToken?: Maybe<Scalars['JWT']['output']>;
  requiresTwoFactor: Scalars['Boolean']['output'];
  requiresTwoFactorSetup: Scalars['Boolean']['output'];
  twoFactorChallenge?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type BizCompanyOnSegmentInput = {
  bizCompanyId: Scalars['String']['input'];
  data?: InputMaybe<Scalars['JSON']['input']>;
  segmentId: Scalars['String']['input'];
};

export type BizConnection = {
  __typename?: 'BizConnection';
  edges?: Maybe<Array<BizModelEdge>>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type BizEvent = {
  __typename?: 'BizEvent';
  bizCompany?: Maybe<BizModel>;
  bizCompanyId?: Maybe<Scalars['String']['output']>;
  bizSessionId?: Maybe<Scalars['String']['output']>;
  bizUser?: Maybe<BizModel>;
  bizUserId: Scalars['String']['output'];
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  data?: Maybe<Scalars['JSON']['output']>;
  event?: Maybe<Events>;
  eventId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

export type BizEventConnection = {
  __typename?: 'BizEventConnection';
  edges?: Maybe<Array<BizEventEdge>>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type BizEventEdge = {
  __typename?: 'BizEventEdge';
  cursor: Scalars['String']['output'];
  node: BizEvent;
};

export type BizEventQuery = {
  companyId?: InputMaybe<Scalars['String']['input']>;
  environmentId: Scalars['String']['input'];
  userId?: InputMaybe<Scalars['String']['input']>;
};

export type BizModel = {
  __typename?: 'BizModel';
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  data?: Maybe<Scalars['JSON']['output']>;
  environmentId: Scalars['String']['output'];
  externalId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  membership?: Maybe<Scalars['JSON']['output']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

export type BizModelEdge = {
  __typename?: 'BizModelEdge';
  cursor: Scalars['String']['output'];
  node: BizModel;
};

export type BizOrder = {
  direction: OrderDirection;
  field: BizOrderField;
};

/** Properties by which content connections can be ordered. */
export type BizOrderField =
  | 'createdAt'
  | 'id'
  | 'updatedAt';

export type BizQuery = {
  companyId?: InputMaybe<Scalars['String']['input']>;
  data?: InputMaybe<Scalars['JSON']['input']>;
  environmentId?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  segmentId?: InputMaybe<Scalars['String']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
};

export type BizSession = {
  __typename?: 'BizSession';
  bizCompany?: Maybe<BizModel>;
  bizEvent?: Maybe<Array<BizEvent>>;
  bizUser: BizUser;
  bizUserId: Scalars['String']['output'];
  content?: Maybe<Content>;
  contentId: Scalars['String']['output'];
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  data?: Maybe<Scalars['JSON']['output']>;
  id: Scalars['ID']['output'];
  progress: Scalars['Int']['output'];
  state: Scalars['Int']['output'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  version?: Maybe<Version>;
};

export type BizSessionConnection = {
  __typename?: 'BizSessionConnection';
  edges?: Maybe<Array<BizSessionEdge>>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type BizSessionEdge = {
  __typename?: 'BizSessionEdge';
  cursor: Scalars['String']['output'];
  node: BizSession;
};

export type BizUser = {
  __typename?: 'BizUser';
  bizUsersOnCompany?: Maybe<Array<BizUserOnCompanyModel>>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  data?: Maybe<Scalars['JSON']['output']>;
  environmentId: Scalars['String']['output'];
  externalId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  membership?: Maybe<Scalars['JSON']['output']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

export type BizUserConnection = {
  __typename?: 'BizUserConnection';
  edges?: Maybe<Array<BizUserEdge>>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type BizUserEdge = {
  __typename?: 'BizUserEdge';
  cursor: Scalars['String']['output'];
  node: BizUser;
};

export type BizUserOnCompanyModel = {
  __typename?: 'BizUserOnCompanyModel';
  bizCompany?: Maybe<BizModel>;
  bizCompanyId: Scalars['String']['output'];
  bizUserId: Scalars['String']['output'];
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  data?: Maybe<Scalars['JSON']['output']>;
  id: Scalars['ID']['output'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

export type BizUserOnSegmentInput = {
  bizUserId: Scalars['String']['input'];
  data?: InputMaybe<Scalars['JSON']['input']>;
  segmentId: Scalars['String']['input'];
};

export type BizUserOrCompanyIdsInput = {
  environmentId: Scalars['String']['input'];
  ids: Array<Scalars['String']['input']>;
};

export type CancelInviteInput = {
  inviteId: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
};

export type ChangeEmailInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type ChangePasswordInput = {
  newPassword: Scalars['String']['input'];
  oldPassword: Scalars['String']['input'];
};

export type ChangeTeamMemberRoleInput = {
  allowedEnvironmentIds?: InputMaybe<Array<Scalars['String']['input']>>;
  projectId: Scalars['String']['input'];
  role: Role;
  userId: Scalars['String']['input'];
};

export type Common = {
  __typename?: 'Common';
  count?: Maybe<Scalars['Int']['output']>;
  success: Scalars['Boolean']['output'];
};

export type ConfirmTwoFactorSetupInput = {
  challengeToken?: InputMaybe<Scalars['String']['input']>;
  code: Scalars['String']['input'];
  secret: Scalars['String']['input'];
};

export type Content = {
  __typename?: 'Content';
  buildUrl?: Maybe<Scalars['String']['output']>;
  config?: Maybe<Scalars['JSON']['output']>;
  contentOnEnvironments?: Maybe<Array<ContentOnEnvironment>>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  deleted: Scalars['Boolean']['output'];
  editedVersion?: Maybe<Version>;
  editedVersionId?: Maybe<Scalars['String']['output']>;
  environmentId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  projectId?: Maybe<Scalars['String']['output']>;
  published: Scalars['Boolean']['output'];
  publishedAt: Scalars['DateTime']['output'];
  publishedVersion?: Maybe<Version>;
  publishedVersionId?: Maybe<Scalars['String']['output']>;
  steps?: Maybe<Array<Step>>;
  type?: Maybe<Scalars['String']['output']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

export type ContentConnection = {
  __typename?: 'ContentConnection';
  edges?: Maybe<Array<ContentEdge>>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ContentDuplicateInput = {
  contentId: Scalars['String']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
};

export type ContentEdge = {
  __typename?: 'ContentEdge';
  cursor: Scalars['String']['output'];
  node: Content;
};

export type ContentIdInput = {
  contentId: Scalars['String']['input'];
  environmentId?: InputMaybe<Scalars['String']['input']>;
};

export type ContentInput = {
  buildUrl?: InputMaybe<Scalars['String']['input']>;
  config?: InputMaybe<Scalars['JSON']['input']>;
  data?: InputMaybe<Scalars['JSON']['input']>;
  environmentId?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  steps?: InputMaybe<Array<StepInput>>;
  themeId?: InputMaybe<Scalars['String']['input']>;
  type: Scalars['String']['input'];
};

export type ContentOnEnvironment = {
  __typename?: 'ContentOnEnvironment';
  contentId: Scalars['String']['output'];
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  environment: Environment;
  environmentId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  published: Scalars['Boolean']['output'];
  publishedAt: Scalars['DateTime']['output'];
  publishedVersion: Version;
  publishedVersionId: Scalars['String']['output'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

export type ContentOrder = {
  direction: OrderDirection;
  field: ContentOrderField;
};

/** Properties by which content connections can be ordered. */
export type ContentOrderField =
  | 'createdAt'
  | 'id'
  | 'publishedAt'
  | 'updatedAt';

export type ContentPublishRecord = {
  __typename?: 'ContentPublishRecord';
  action: Scalars['String']['output'];
  actorName?: Maybe<Scalars['String']['output']>;
  actorTokenId?: Maybe<Scalars['String']['output']>;
  actorTokenName?: Maybe<Scalars['String']['output']>;
  actorUserId?: Maybe<Scalars['String']['output']>;
  contentId: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  environmentId: Scalars['String']['output'];
  environmentName?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  versionId: Scalars['String']['output'];
  versionSequence: Scalars['Int']['output'];
};

export type ContentPublishRecordConnection = {
  __typename?: 'ContentPublishRecordConnection';
  edges?: Maybe<Array<ContentPublishRecordEdge>>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ContentPublishRecordEdge = {
  __typename?: 'ContentPublishRecordEdge';
  cursor: Scalars['String']['output'];
  node: ContentPublishRecord;
};

export type ContentQuery = {
  environmentId: Scalars['String']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  published?: InputMaybe<Scalars['Boolean']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
};

export type ContentUpdateInput = {
  content: UpdateContentInput;
  contentId: Scalars['String']['input'];
};

export type ContentVersionInput = {
  config?: InputMaybe<Scalars['JSON']['input']>;
  versionId: Scalars['String']['input'];
};

export type CopyThemeInput = {
  id: Scalars['String']['input'];
  name: Scalars['String']['input'];
};

export type CreatSegment = {
  bizType: SegmentBizType;
  columns?: InputMaybe<Scalars['JSON']['input']>;
  data?: InputMaybe<Scalars['JSON']['input']>;
  dataType: SegmentDataType;
  environmentId?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  projectId?: InputMaybe<Scalars['String']['input']>;
  source?: InputMaybe<Scalars['String']['input']>;
  sourceId?: InputMaybe<Scalars['String']['input']>;
};

export type CreateAccessTokenInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type CreateApiTokenInput = {
  environmentIds?: InputMaybe<Array<Scalars['String']['input']>>;
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
  name: Scalars['String']['input'];
  projectIds: Array<Scalars['String']['input']>;
  scopes: Array<Scalars['String']['input']>;
};

export type CreateAttributeInput = {
  bizType: Scalars['Int']['input'];
  codeName: Scalars['String']['input'];
  dataType: Scalars['Int']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  displayName: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
  randomMax?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateBizCompanyOnSegment = {
  companyOnSegment: Array<BizCompanyOnSegmentInput>;
};

export type CreateBizUserOnSegment = {
  userOnSegment: Array<BizUserOnSegmentInput>;
};

export type CreateCheckoutSessionRequest = {
  interval: Scalars['String']['input'];
  planType: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
};

export type CreateEnvironmentInput = {
  name: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
};

export type CreateEventInput = {
  attributeIds: Array<Scalars['String']['input']>;
  codeName: Scalars['String']['input'];
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  displayName: Scalars['String']['input'];
  eventId?: InputMaybe<Scalars['String']['input']>;
  projectId: Scalars['String']['input'];
};

export type CreateLocalizationInput = {
  code: Scalars['String']['input'];
  locale: Scalars['String']['input'];
  name: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
};

export type CreateOidcSsoProviderInput = {
  authorizationUrl?: InputMaybe<Scalars['String']['input']>;
  clientId: Scalars['String']['input'];
  clientSecret: Scalars['String']['input'];
  issuer: Scalars['String']['input'];
  name: Scalars['String']['input'];
  tokenUrl?: InputMaybe<Scalars['String']['input']>;
  userInfoUrl?: InputMaybe<Scalars['String']['input']>;
};

export type CreateOwnedProjectInput = {
  name: Scalars['String']['input'];
};

export type CreateThemeInput = {
  isDefault: Scalars['Boolean']['input'];
  name: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
  settings?: InputMaybe<Scalars['JSON']['input']>;
  variations?: InputMaybe<Scalars['JSON']['input']>;
};

export type CreateWebhookInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  environmentId: Scalars['String']['input'];
  topics: Array<Scalars['String']['input']>;
  url: Scalars['String']['input'];
};

export type CreatedApiToken = {
  __typename?: 'CreatedApiToken';
  apiToken: ApiToken;
  token: Scalars['String']['output'];
};

export type DefinitionReference = {
  __typename?: 'DefinitionReference';
  contentType?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  locations: Array<DefinitionReferenceLocation>;
  name: Scalars['String']['output'];
  referrerKind: Scalars['String']['output'];
  segmentBizType?: Maybe<Scalars['String']['output']>;
};

export type DefinitionReferenceLocation = {
  __typename?: 'DefinitionReferenceLocation';
  step?: Maybe<Scalars['Int']['output']>;
  surface: Scalars['String']['output'];
  version?: Maybe<Scalars['String']['output']>;
};

export type DeleteAttributeInput = {
  id: Scalars['ID']['input'];
};

export type DeleteBizCompanyOnSegment = {
  bizCompanyIds: Array<Scalars['String']['input']>;
  segmentId: Scalars['String']['input'];
};

export type DeleteBizUserOnSegment = {
  bizUserIds: Array<Scalars['String']['input']>;
  segmentId: Scalars['String']['input'];
};

export type DeleteEnvironmentInput = {
  id: Scalars['String']['input'];
};

export type DeleteEventInput = {
  id: Scalars['ID']['input'];
};

export type DeleteLocalizationInput = {
  id: Scalars['ID']['input'];
};

export type DeleteSegment = {
  id: Scalars['ID']['input'];
};

export type DeleteThemeInput = {
  id?: InputMaybe<Scalars['String']['input']>;
};

export type Environment = {
  __typename?: 'Environment';
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  isPrimary: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  projectId: Scalars['String']['output'];
  requireIdentityVerification: Scalars['Boolean']['output'];
  token: Scalars['String']['output'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

export type EnvironmentSigningSecret = {
  __typename?: 'EnvironmentSigningSecret';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  lastUsedAt?: Maybe<Scalars['DateTime']['output']>;
  secret: Scalars['String']['output'];
};

export type Events = {
  __typename?: 'Events';
  attributeIds: Array<Scalars['String']['output']>;
  codeName: Scalars['String']['output'];
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  deleted?: Maybe<Scalars['Boolean']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  displayName: Scalars['String']['output'];
  eventId?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  predefined: Scalars['Boolean']['output'];
  projectId: Scalars['String']['output'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

export type GlobalConfig = {
  __typename?: 'GlobalConfig';
  allowPrivateNetworkEgress: Scalars['Boolean']['output'];
  allowProjectLevelSubscriptionManagement: Scalars['Boolean']['output'];
  allowUserRegistration: Scalars['Boolean']['output'];
  apiUrl?: Maybe<Scalars['String']['output']>;
  authProviders: Array<Scalars['String']['output']>;
  configuredOAuthProviders: Array<Scalars['String']['output']>;
  isSelfHostedMode: Scalars['Boolean']['output'];
  machineTranslationEnabled: Scalars['Boolean']['output'];
  mcpServerUrl?: Maybe<Scalars['String']['output']>;
  needsSystemAdminSetup: Scalars['Boolean']['output'];
  require2FA: Scalars['Boolean']['output'];
  ssoCallbackUrl?: Maybe<Scalars['String']['output']>;
};

export type IdentityTokenDiagnosisModel = {
  __typename?: 'IdentityTokenDiagnosisModel';
  companyId?: Maybe<Scalars['String']['output']>;
  expiresAt?: Maybe<Scalars['DateTime']['output']>;
  status: Scalars['String']['output'];
  subject?: Maybe<Scalars['String']['output']>;
};

export type IdentityVerificationStats = {
  __typename?: 'IdentityVerificationStats';
  anonymous: Scalars['Int']['output'];
  invalid: Scalars['Int']['output'];
  missing: Scalars['Int']['output'];
  subject: Scalars['String']['output'];
  valid: Scalars['Int']['output'];
};

export type InstallationStatus = {
  __typename?: 'InstallationStatus';
  installed: Scalars['Boolean']['output'];
  userCount: Scalars['Int']['output'];
};

export type InstanceLicenseInfo = {
  __typename?: 'InstanceLicenseInfo';
  daysRemaining?: Maybe<Scalars['Int']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  isExpired?: Maybe<Scalars['Boolean']['output']>;
  isValid: Scalars['Boolean']['output'];
  payload?: Maybe<InstanceLicensePayload>;
};

export type InstanceLicensePayload = {
  __typename?: 'InstanceLicensePayload';
  exp?: Maybe<Scalars['Int']['output']>;
  features?: Maybe<Array<Scalars['String']['output']>>;
  iat?: Maybe<Scalars['Int']['output']>;
  instanceId?: Maybe<Scalars['String']['output']>;
  issuer?: Maybe<Scalars['String']['output']>;
  plan?: Maybe<Scalars['String']['output']>;
  projectId?: Maybe<Scalars['String']['output']>;
  projectLimit?: Maybe<Scalars['Int']['output']>;
  scope?: Maybe<Scalars['String']['output']>;
  sub?: Maybe<Scalars['String']['output']>;
};

export type InstanceSetting = {
  __typename?: 'InstanceSetting';
  allowProjectLevelSubscriptionManagement?: Maybe<Scalars['Boolean']['output']>;
  allowUserRegistration: Scalars['Boolean']['output'];
  contactEmail?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  instanceId: Scalars['String']['output'];
  license?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  require2FA: Scalars['Boolean']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type Integration = {
  __typename?: 'Integration';
  autoDisabledAt?: Maybe<Scalars['DateTime']['output']>;
  config: Scalars['JSON']['output'];
  connected: Scalars['Boolean']['output'];
  consecutiveFailures: Scalars['Int']['output'];
  cooldownUntil?: Maybe<Scalars['DateTime']['output']>;
  createdAt: Scalars['DateTime']['output'];
  enabled: Scalars['Boolean']['output'];
  environmentId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  inboundConfig: Scalars['JSON']['output'];
  inboundEnabled: Scalars['Boolean']['output'];
  inboundUrl?: Maybe<Scalars['String']['output']>;
  keyTail: Scalars['String']['output'];
  provider: Scalars['String']['output'];
  remoteAccountId?: Maybe<Scalars['String']['output']>;
  remoteAccountLabel?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type IntegrationConfigInput = {
  region?: InputMaybe<Scalars['String']['input']>;
};

export type IntegrationDelivery = {
  __typename?: 'IntegrationDelivery';
  attempt: Scalars['Int']['output'];
  createdAt: Scalars['DateTime']['output'];
  durationMs?: Maybe<Scalars['Int']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  responseBody?: Maybe<Scalars['String']['output']>;
  responseStatus?: Maybe<Scalars['Int']['output']>;
  success: Scalars['Boolean']['output'];
};

export type IntegrationIdInput = {
  id: Scalars['String']['input'];
};

export type IntegrationMessage = {
  __typename?: 'IntegrationMessage';
  createdAt: Scalars['DateTime']['output'];
  deliveries: Array<IntegrationDelivery>;
  id: Scalars['String']['output'];
  payload: Scalars['JSON']['output'];
  status: Scalars['String']['output'];
  topic: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type IntegrationMessageConnection = {
  __typename?: 'IntegrationMessageConnection';
  edges?: Maybe<Array<IntegrationMessageEdge>>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type IntegrationMessageEdge = {
  __typename?: 'IntegrationMessageEdge';
  cursor: Scalars['String']['output'];
  node: IntegrationMessage;
};

export type IntegrationOAuthStart = {
  __typename?: 'IntegrationOAuthStart';
  url: Scalars['String']['output'];
};

export type IntegrationObjectMapping = {
  __typename?: 'IntegrationObjectMapping';
  createdAt: Scalars['DateTime']['output'];
  enabled: Scalars['Boolean']['output'];
  fullSyncStartedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['String']['output'];
  inboundFields: Scalars['JSON']['output'];
  integrationId: Scalars['String']['output'];
  lastFullSyncAt?: Maybe<Scalars['DateTime']['output']>;
  localObject: Scalars['String']['output'];
  matchRemoteField?: Maybe<Scalars['String']['output']>;
  matchStrategy: Scalars['String']['output'];
  matchedCount: Scalars['Int']['output'];
  outboundFields: Scalars['JSON']['output'];
  remoteObject: Scalars['String']['output'];
  unresolvedCount: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type IntegrationObjectMappingIdInput = {
  id: Scalars['String']['input'];
  integrationId: Scalars['String']['input'];
};

export type IntegrationRemoteProperty = {
  __typename?: 'IntegrationRemoteProperty';
  fieldType: Scalars['String']['output'];
  groupName: Scalars['String']['output'];
  hubspotDefined: Scalars['Boolean']['output'];
  label: Scalars['String']['output'];
  name: Scalars['String']['output'];
  readOnly: Scalars['Boolean']['output'];
  type: Scalars['String']['output'];
};

export type IntegrationSyncRun = {
  __typename?: 'IntegrationSyncRun';
  error?: Maybe<Scalars['String']['output']>;
  finishedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['String']['output'];
  kind: Scalars['String']['output'];
  localObject?: Maybe<Scalars['String']['output']>;
  mappingId?: Maybe<Scalars['String']['output']>;
  matchedCount: Scalars['Int']['output'];
  records: Scalars['Int']['output'];
  remoteIds?: Maybe<Scalars['JSON']['output']>;
  remoteObject?: Maybe<Scalars['String']['output']>;
  startedAt: Scalars['DateTime']['output'];
  status: Scalars['String']['output'];
  unresolvedCount: Scalars['Int']['output'];
};

export type IntegrationSyncedSegment = {
  __typename?: 'IntegrationSyncedSegment';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  lastSyncedAt?: Maybe<Scalars['DateTime']['output']>;
  memberCount: Scalars['Int']['output'];
  segmentId: Scalars['String']['output'];
  segmentName: Scalars['String']['output'];
  sourceCohortId: Scalars['String']['output'];
  sourceCohortName: Scalars['String']['output'];
  unresolvedCount: Scalars['Int']['output'];
};

export type Invite = {
  __typename?: 'Invite';
  allowedEnvironmentIds?: Maybe<Array<Scalars['String']['output']>>;
  code?: Maybe<Scalars['String']['output']>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  email?: Maybe<Scalars['String']['output']>;
  expired: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  project?: Maybe<Project>;
  projectId?: Maybe<Scalars['String']['output']>;
  recipientExists: Scalars['Boolean']['output'];
  requireSso: Scalars['Boolean']['output'];
  role: Scalars['String']['output'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  user?: Maybe<User>;
  userId?: Maybe<Scalars['String']['output']>;
};

export type InviteTeamMemberInput = {
  allowedEnvironmentIds?: InputMaybe<Array<Scalars['String']['input']>>;
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
  role: Role;
};

export type Lang = {
  __typename?: 'Lang';
  lng: Scalars['String']['output'];
};

export type LicenseInfo = {
  __typename?: 'LicenseInfo';
  daysRemaining?: Maybe<Scalars['Int']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  isExpired?: Maybe<Scalars['Boolean']['output']>;
  isValid?: Maybe<Scalars['Boolean']['output']>;
  payload?: Maybe<LicensePayload>;
};

export type LicensePayload = {
  __typename?: 'LicensePayload';
  exp: Scalars['Int']['output'];
  features: Array<Scalars['String']['output']>;
  iat: Scalars['Int']['output'];
  issuer: Scalars['String']['output'];
  plan: Scalars['String']['output'];
  projectId: Scalars['String']['output'];
  sub: Scalars['String']['output'];
};

export type LocalUser = {
  __typename?: 'LocalUser';
  isLoggedIn: Scalars['Boolean']['output'];
};

export type Localization = {
  __typename?: 'Localization';
  code: Scalars['String']['output'];
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  isDefault: Scalars['Boolean']['output'];
  locale: Scalars['String']['output'];
  name: Scalars['String']['output'];
  projectId: Scalars['String']['output'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

export type LoginInput = {
  email: Scalars['String']['input'];
  inviteCode?: InputMaybe<Scalars['String']['input']>;
  password: Scalars['String']['input'];
};

export type MagicLinkInput = {
  email: Scalars['String']['input'];
};

export type Mutation = {
  __typename?: 'Mutation';
  UpdateLocalUser?: Maybe<Scalars['Boolean']['output']>;
  acceptInvite: Auth;
  activeUserProject: Scalars['Boolean']['output'];
  adminAddProjectMember: Scalars['Boolean']['output'];
  adminChangeProjectMemberRole: Scalars['Boolean']['output'];
  adminCreateProject: Project;
  adminCreateUser: User;
  adminRemoveProjectMember: Scalars['Boolean']['output'];
  adminTransferProjectOwnership: Scalars['Boolean']['output'];
  cancelInvite: Scalars['Boolean']['output'];
  changeEmail: User;
  changePassword: User;
  changeTeamMemberRole: Scalars['Boolean']['output'];
  confirmTwoFactorSetup: TwoFactorEnableResult;
  confirmTwoFactorSetupWithChallenge: TwoFactorEnableResult;
  copyTheme: Theme;
  createAccessToken: AccessToken;
  createApiToken: CreatedApiToken;
  createAttribute: Attribute;
  createBizCompanyOnSegment: Common;
  createBizUserOnSegment: Common;
  createCheckoutSession: Scalars['String']['output'];
  createContent: Content;
  createContentVersion: Version;
  createEnvironments: Environment;
  createEvent: Events;
  createLocalization: Localization;
  createMagicLink: Register;
  createOidcSsoProvider: SsoProviderModel;
  createOwnedProject: Project;
  createPortalSession: Scalars['String']['output'];
  createPresignedUrl: Storage;
  createSegment: Segment;
  createSigningSecret: EnvironmentSigningSecret;
  createTheme: Theme;
  createWebhook: Webhook;
  deleteAccessToken: Scalars['Boolean']['output'];
  deleteApiToken: Scalars['Boolean']['output'];
  deleteAttribute: Attribute;
  deleteBizCompany: Common;
  deleteBizCompanyOnSegment: Common;
  deleteBizUser: Common;
  deleteBizUserOnSegment: Common;
  deleteContent: Common;
  deleteEnvironments: Environment;
  deleteEvent: Events;
  deleteIntegration: Integration;
  deleteIntegrationObjectMapping: Scalars['Boolean']['output'];
  deleteLocalization: Localization;
  deleteSegment: Common;
  deleteSession: Scalars['Boolean']['output'];
  deleteSsoProvider: Scalars['Boolean']['output'];
  deleteTheme: Theme;
  deleteWebhook: Webhook;
  disableTwoFactor: Scalars['Boolean']['output'];
  disconnectIntegrationOAuth: Integration;
  duplicateContent: Content;
  endSession: Scalars['Boolean']['output'];
  inviteTeamMember: Scalars['Boolean']['output'];
  login: Auth;
  logout: Scalars['Boolean']['output'];
  publishedContentVersion: Version;
  regenerateRecoveryCodes: TwoFactorEnableResult;
  removeTeamMember: Scalars['Boolean']['output'];
  resendMagicLink: Register;
  resendWebhookMessage: WebhookMessage;
  resetUserPassword: Common;
  resetUserPasswordByCode: Common;
  restoreContentVersion: Version;
  revokeOAuthConnection: Scalars['Boolean']['output'];
  revokeSigningSecret: Scalars['Boolean']['output'];
  rotateApiToken: CreatedApiToken;
  rotateIntegrationInboundToken: Integration;
  rotateWebhookSecret: Webhook;
  runIntegrationObjectMappingSync: IntegrationObjectMapping;
  sendIntegrationTestEvent: Integration;
  sendWebhookTestEvent: Webhook;
  setDefaultLocalization: Localization;
  setDefaultTheme: Theme;
  setRequireIdentityVerification: Environment;
  setupSystemAdmin: Auth;
  signOut?: Maybe<Scalars['Boolean']['output']>;
  signup: Auth;
  startIntegrationOAuth: IntegrationOAuthStart;
  startTwoFactorSetup: TwoFactorSetupPayload;
  startTwoFactorSetupWithChallenge: TwoFactorSetupPayload;
  transferProjectOwnership: Scalars['Boolean']['output'];
  translateLocalizationUnits: Array<TranslatedUnit>;
  unpublishedContentVersion: Common;
  updateApiToken: ApiToken;
  updateAttribute: Attribute;
  updateContent: Content;
  updateContentVersion: Version;
  updateEnvironments: Environment;
  updateEvent: Events;
  updateInstanceAuthenticationSettings: InstanceSetting;
  updateInstanceGeneralSettings: InstanceSetting;
  updateInstanceLicense: InstanceSetting;
  updateInstanceRequire2FA: InstanceSetting;
  updateIntegrationEvents: Integration;
  updateIntegrationInbound: Integration;
  updateLanguage?: Maybe<Scalars['Boolean']['output']>;
  updateLocalization: Localization;
  updateProject: Project;
  updateProjectLicense: Project;
  updateProjectSsoSettings: ProjectSsoSettingsModel;
  updateProjectUsesInstanceLicense: Scalars['Boolean']['output'];
  updateSegment: Segment;
  updateSsoProvider: SsoProviderModel;
  updateTheme: Theme;
  updateUser: User;
  updateUserDisabled: User;
  updateUserSystemAdmin: User;
  updateVersionLocalization?: Maybe<VersionOnLocalization>;
  updateWebhook: Webhook;
  upsertIntegration: Integration;
  upsertIntegrationObjectMapping: IntegrationObjectMapping;
  verifyTwoFactor: Auth;
};


export type MutationUpdateLocalUserArgs = {
  isLoggedIn: Scalars['Boolean']['input'];
};


export type MutationAcceptInviteArgs = {
  data: AcceptInviteInput;
};


export type MutationActiveUserProjectArgs = {
  data: ActiveUserProjectInput;
};


export type MutationAdminAddProjectMemberArgs = {
  projectId: Scalars['String']['input'];
  role: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};


export type MutationAdminChangeProjectMemberRoleArgs = {
  projectId: Scalars['String']['input'];
  role: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};


export type MutationAdminCreateProjectArgs = {
  name: Scalars['String']['input'];
  ownerUserId: Scalars['String']['input'];
};


export type MutationAdminCreateUserArgs = {
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
  password: Scalars['String']['input'];
};


export type MutationAdminRemoveProjectMemberArgs = {
  projectId: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};


export type MutationAdminTransferProjectOwnershipArgs = {
  projectId: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};


export type MutationCancelInviteArgs = {
  data: CancelInviteInput;
};


export type MutationChangeEmailArgs = {
  data: ChangeEmailInput;
};


export type MutationChangePasswordArgs = {
  data: ChangePasswordInput;
};


export type MutationChangeTeamMemberRoleArgs = {
  data: ChangeTeamMemberRoleInput;
};


export type MutationConfirmTwoFactorSetupArgs = {
  data: ConfirmTwoFactorSetupInput;
};


export type MutationConfirmTwoFactorSetupWithChallengeArgs = {
  data: ConfirmTwoFactorSetupInput;
};


export type MutationCopyThemeArgs = {
  data: CopyThemeInput;
};


export type MutationCreateAccessTokenArgs = {
  environmentId: Scalars['String']['input'];
  input: CreateAccessTokenInput;
};


export type MutationCreateApiTokenArgs = {
  input: CreateApiTokenInput;
};


export type MutationCreateAttributeArgs = {
  data: CreateAttributeInput;
};


export type MutationCreateBizCompanyOnSegmentArgs = {
  data: CreateBizCompanyOnSegment;
};


export type MutationCreateBizUserOnSegmentArgs = {
  data: CreateBizUserOnSegment;
};


export type MutationCreateCheckoutSessionArgs = {
  data: CreateCheckoutSessionRequest;
};


export type MutationCreateContentArgs = {
  data: ContentInput;
};


export type MutationCreateContentVersionArgs = {
  data: ContentVersionInput;
};


export type MutationCreateEnvironmentsArgs = {
  data: CreateEnvironmentInput;
};


export type MutationCreateEventArgs = {
  data: CreateEventInput;
};


export type MutationCreateLocalizationArgs = {
  data: CreateLocalizationInput;
};


export type MutationCreateMagicLinkArgs = {
  data: MagicLinkInput;
};


export type MutationCreateOidcSsoProviderArgs = {
  input: CreateOidcSsoProviderInput;
  projectId: Scalars['String']['input'];
};


export type MutationCreateOwnedProjectArgs = {
  data: CreateOwnedProjectInput;
};


export type MutationCreatePortalSessionArgs = {
  projectId: Scalars['String']['input'];
};


export type MutationCreatePresignedUrlArgs = {
  data: CreatePresignedUrlInput;
};


export type MutationCreateSegmentArgs = {
  data: CreatSegment;
};


export type MutationCreateSigningSecretArgs = {
  environmentId: Scalars['String']['input'];
};


export type MutationCreateThemeArgs = {
  data: CreateThemeInput;
};


export type MutationCreateWebhookArgs = {
  data: CreateWebhookInput;
};


export type MutationDeleteAccessTokenArgs = {
  accessTokenId: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
};


export type MutationDeleteApiTokenArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteAttributeArgs = {
  data: DeleteAttributeInput;
};


export type MutationDeleteBizCompanyArgs = {
  data: BizUserOrCompanyIdsInput;
};


export type MutationDeleteBizCompanyOnSegmentArgs = {
  data: DeleteBizCompanyOnSegment;
};


export type MutationDeleteBizUserArgs = {
  data: BizUserOrCompanyIdsInput;
};


export type MutationDeleteBizUserOnSegmentArgs = {
  data: DeleteBizUserOnSegment;
};


export type MutationDeleteContentArgs = {
  data: ContentIdInput;
};


export type MutationDeleteEnvironmentsArgs = {
  data: DeleteEnvironmentInput;
};


export type MutationDeleteEventArgs = {
  data: DeleteEventInput;
};


export type MutationDeleteIntegrationArgs = {
  data: IntegrationIdInput;
};


export type MutationDeleteIntegrationObjectMappingArgs = {
  data: IntegrationObjectMappingIdInput;
};


export type MutationDeleteLocalizationArgs = {
  data: DeleteLocalizationInput;
};


export type MutationDeleteSegmentArgs = {
  data: DeleteSegment;
};


export type MutationDeleteSessionArgs = {
  sessionId: Scalars['String']['input'];
};


export type MutationDeleteSsoProviderArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteThemeArgs = {
  data: DeleteThemeInput;
};


export type MutationDeleteWebhookArgs = {
  data: WebhookIdInput;
};


export type MutationDisableTwoFactorArgs = {
  data: TwoFactorStepUpInput;
};


export type MutationDisconnectIntegrationOAuthArgs = {
  data: IntegrationIdInput;
};


export type MutationDuplicateContentArgs = {
  data: ContentDuplicateInput;
};


export type MutationEndSessionArgs = {
  sessionId: Scalars['String']['input'];
};


export type MutationInviteTeamMemberArgs = {
  data: InviteTeamMemberInput;
};


export type MutationLoginArgs = {
  data: LoginInput;
};


export type MutationPublishedContentVersionArgs = {
  data: VersionIdInput;
};


export type MutationRegenerateRecoveryCodesArgs = {
  data: TwoFactorStepUpInput;
};


export type MutationRemoveTeamMemberArgs = {
  data: RemoveTeamMemberInput;
};


export type MutationResendMagicLinkArgs = {
  data: ResendLinkInput;
};


export type MutationResendWebhookMessageArgs = {
  data: WebhookMessageInput;
};


export type MutationResetUserPasswordArgs = {
  data: ResetPasswordInput;
};


export type MutationResetUserPasswordByCodeArgs = {
  data: ResetPasswordByCodeInput;
};


export type MutationRestoreContentVersionArgs = {
  data: VersionIdInput;
};


export type MutationRevokeOAuthConnectionArgs = {
  id: Scalars['String']['input'];
};


export type MutationRevokeSigningSecretArgs = {
  environmentId: Scalars['String']['input'];
  signingSecretId: Scalars['String']['input'];
};


export type MutationRotateApiTokenArgs = {
  id: Scalars['String']['input'];
};


export type MutationRotateIntegrationInboundTokenArgs = {
  data: IntegrationIdInput;
};


export type MutationRotateWebhookSecretArgs = {
  data: WebhookIdInput;
};


export type MutationRunIntegrationObjectMappingSyncArgs = {
  data: IntegrationObjectMappingIdInput;
};


export type MutationSendIntegrationTestEventArgs = {
  data: IntegrationIdInput;
};


export type MutationSendWebhookTestEventArgs = {
  data: WebhookIdInput;
};


export type MutationSetDefaultLocalizationArgs = {
  id: Scalars['String']['input'];
};


export type MutationSetDefaultThemeArgs = {
  themeId: Scalars['String']['input'];
};


export type MutationSetRequireIdentityVerificationArgs = {
  environmentId: Scalars['String']['input'];
  required: Scalars['Boolean']['input'];
};


export type MutationSetupSystemAdminArgs = {
  data: SetupSystemAdminInput;
};


export type MutationSignupArgs = {
  data: SignupInput;
};


export type MutationStartIntegrationOAuthArgs = {
  data: StartIntegrationOAuthInput;
};


export type MutationStartTwoFactorSetupWithChallengeArgs = {
  challengeToken: Scalars['String']['input'];
};


export type MutationTransferProjectOwnershipArgs = {
  data: TransferProjectOwnershipInput;
};


export type MutationTranslateLocalizationUnitsArgs = {
  data: TranslateLocalizationUnitsInput;
};


export type MutationUnpublishedContentVersionArgs = {
  data: ContentIdInput;
};


export type MutationUpdateApiTokenArgs = {
  id: Scalars['String']['input'];
  input: UpdateApiTokenInput;
};


export type MutationUpdateAttributeArgs = {
  data: UpdateAttributeInput;
};


export type MutationUpdateContentArgs = {
  data: ContentUpdateInput;
};


export type MutationUpdateContentVersionArgs = {
  data: VersionUpdateInput;
};


export type MutationUpdateEnvironmentsArgs = {
  data: UpdateEnvironmentInput;
};


export type MutationUpdateEventArgs = {
  data: UpdateEventInput;
};


export type MutationUpdateInstanceAuthenticationSettingsArgs = {
  allowUserRegistration: Scalars['Boolean']['input'];
};


export type MutationUpdateInstanceGeneralSettingsArgs = {
  allowProjectLevelSubscriptionManagement?: InputMaybe<Scalars['Boolean']['input']>;
  contactEmail?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUpdateInstanceLicenseArgs = {
  license: Scalars['String']['input'];
};


export type MutationUpdateInstanceRequire2FaArgs = {
  value: Scalars['Boolean']['input'];
};


export type MutationUpdateIntegrationEventsArgs = {
  data: UpdateIntegrationEventsInput;
};


export type MutationUpdateIntegrationInboundArgs = {
  data: UpdateIntegrationInboundInput;
};


export type MutationUpdateLanguageArgs = {
  language: Scalars['String']['input'];
};


export type MutationUpdateLocalizationArgs = {
  data: UpdateLocalizationInput;
};


export type MutationUpdateProjectArgs = {
  logoUrl?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  projectId: Scalars['String']['input'];
};


export type MutationUpdateProjectLicenseArgs = {
  license: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
};


export type MutationUpdateProjectSsoSettingsArgs = {
  input: UpdateProjectSsoSettingsInput;
  projectId: Scalars['String']['input'];
};


export type MutationUpdateProjectUsesInstanceLicenseArgs = {
  enabled: Scalars['Boolean']['input'];
  projectId: Scalars['String']['input'];
};


export type MutationUpdateSegmentArgs = {
  data: UpdateSegment;
};


export type MutationUpdateSsoProviderArgs = {
  id: Scalars['String']['input'];
  input: UpdateSsoProviderInput;
};


export type MutationUpdateThemeArgs = {
  data: UpdateThemeInput;
};


export type MutationUpdateUserArgs = {
  data: UpdateUserInput;
};


export type MutationUpdateUserDisabledArgs = {
  disabled: Scalars['Boolean']['input'];
  userId: Scalars['String']['input'];
};


export type MutationUpdateUserSystemAdminArgs = {
  isSystemAdmin: Scalars['Boolean']['input'];
  userId: Scalars['String']['input'];
};


export type MutationUpdateVersionLocalizationArgs = {
  data: UpdateVersionLocalizationInput;
};


export type MutationUpdateWebhookArgs = {
  data: UpdateWebhookInput;
};


export type MutationUpsertIntegrationArgs = {
  data: UpsertIntegrationInput;
};


export type MutationUpsertIntegrationObjectMappingArgs = {
  data: UpsertIntegrationObjectMappingInput;
};


export type MutationVerifyTwoFactorArgs = {
  data: VerifyTwoFactorInput;
};

export type OAuthConnection = {
  __typename?: 'OAuthConnection';
  clientName: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  environmentNames?: Maybe<Array<Scalars['String']['output']>>;
  id: Scalars['ID']['output'];
  lastUsedAt?: Maybe<Scalars['DateTime']['output']>;
  projectId: Scalars['String']['output'];
  projectName: Scalars['String']['output'];
  scopes: Array<Scalars['String']['output']>;
};

export type OEmbed = {
  __typename?: 'OEmbed';
  height: Scalars['String']['output'];
  html: Scalars['String']['output'];
  width: Scalars['String']['output'];
};

/** Possible directions in which to order a list of items when provided an `orderBy` argument. */
export type OrderDirection =
  | 'asc'
  | 'desc';

export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type Project = {
  __typename?: 'Project';
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  customerId?: Maybe<Scalars['String']['output']>;
  environments?: Maybe<Array<Environment>>;
  id: Scalars['String']['output'];
  license?: Maybe<Scalars['String']['output']>;
  logoUrl?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  subscriptionId?: Maybe<Scalars['String']['output']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

export type ProjectConfigModel = {
  __typename?: 'ProjectConfigModel';
  auditLogRetentionDays: Scalars['Int']['output'];
  auditLogs: Scalars['Boolean']['output'];
  crmIntegrations: Scalars['Boolean']['output'];
  customCss: Scalars['Boolean']['output'];
  integrations: Scalars['Boolean']['output'];
  planType: Scalars['String']['output'];
  removeBranding: Scalars['Boolean']['output'];
  ssoOidc: Scalars['Boolean']['output'];
  ssoSaml: Scalars['Boolean']['output'];
  webhooks: Scalars['Boolean']['output'];
};

export type ProjectSsoSettingsModel = {
  __typename?: 'ProjectSsoSettingsModel';
  allowedDomains: Array<Scalars['String']['output']>;
  autoProvision: Scalars['Boolean']['output'];
  defaultRole: Role;
  projectId: Scalars['String']['output'];
  requireSso: Scalars['Boolean']['output'];
};

export type PublicSsoLoginModel = {
  __typename?: 'PublicSsoLoginModel';
  logoUrl?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  providers: Array<PublicSsoProviderModel>;
};

export type PublicSsoProviderModel = {
  __typename?: 'PublicSsoProviderModel';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  type: SsoProviderType;
};

export type Query = {
  __typename?: 'Query';
  adminInstanceSettings: InstanceSetting;
  adminProjectMembers: Array<AdminProjectMember>;
  adminProjects: AdminProjectList;
  adminSettings: AdminSettingsInfo;
  adminUsers: AdminUserList;
  apiTokens: Array<ApiToken>;
  auditLogs: AuditLogConnection;
  getAccessToken: Scalars['String']['output'];
  getContent?: Maybe<Content>;
  getContentVersion: Version;
  getIdentityVerificationStats: Array<IdentityVerificationStats>;
  getInvite?: Maybe<Invite>;
  getInvites: Array<Invite>;
  getProjectConfig: ProjectConfigModel;
  getProjectLicenseInfo?: Maybe<LicenseInfo>;
  getProjectSsoLogin: PublicSsoLoginModel;
  getProjectSsoProviders: Array<PublicSsoProviderModel>;
  getProjectSsoSettings: ProjectSsoSettingsModel;
  getSigningSecret: Scalars['String']['output'];
  getSubscriptionByProjectId: SubscriptionModel;
  getSubscriptionPlans: Array<SubscriptionPlanModel>;
  getSubscriptionUsage: Scalars['Int']['output'];
  getTeamMembers: Array<UserOnProject>;
  getTheme: Theme;
  getWebhook: Webhook;
  globalConfig: GlobalConfig;
  hello: Scalars['String']['output'];
  helloWorld: Scalars['String']['output'];
  i18n: Lang;
  listAccessTokens: Array<AccessToken>;
  listAttributeOnEvents: Array<AttributeOnEvent>;
  listAttributes: Array<Attribute>;
  listContentPublishRecords: ContentPublishRecordConnection;
  listContentVersions: VersionConnection;
  listDefinitionReferences: Array<DefinitionReference>;
  listEvents: Array<Events>;
  listIntegrationObjectMappings: Array<IntegrationObjectMapping>;
  listIntegrationRemoteProperties: Array<IntegrationRemoteProperty>;
  listIntegrationSyncRuns: Array<IntegrationSyncRun>;
  listIntegrations: Array<Integration>;
  listLocalizations: Array<Localization>;
  listProjectSsoProviders: Array<SsoProviderModel>;
  listSegment: Array<Segment>;
  listSessionsDetail: BizSessionConnection;
  listSigningSecrets: Array<EnvironmentSigningSecret>;
  listThemes: Array<Theme>;
  listVersionLocalizations: Array<VersionOnLocalization>;
  listWebhooks: Array<Webhook>;
  localUser: LocalUser;
  me: User;
  oauthConnections: Array<OAuthConnection>;
  projectHasEnvironmentAccessTokens: Scalars['Boolean']['output'];
  queryBizCompany: BizConnection;
  queryBizCompanyEvents: BizEventConnection;
  queryBizSession: BizSessionConnection;
  queryBizUser: BizUserConnection;
  queryBizUserEvents: BizEventConnection;
  queryContent: ContentConnection;
  queryContentAnalytics: Analytics;
  queryContentQuestionAnalytics: Scalars['JSON']['output'];
  queryIntegrationMessages: IntegrationMessageConnection;
  queryIntegrationSyncedSegments: Array<IntegrationSyncedSegment>;
  queryOembedInfo: OEmbed;
  querySessionDetail?: Maybe<BizSession>;
  querySessionsByExternalId: BizSessionConnection;
  queryTooltipTargetMissingSessions: TooltipTargetMissingResponse;
  queryTrackerUsers: TrackerUserConnection;
  queryWebhookMessages: WebhookMessageConnection;
  userEnvironments: Array<Environment>;
  validateIdentityToken: IdentityTokenDiagnosisModel;
  verifyInstallation: InstallationStatus;
};


export type QueryAdminProjectMembersArgs = {
  projectId: Scalars['String']['input'];
};


export type QueryAdminProjectsArgs = {
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  usesInstanceLicense?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAdminUsersArgs = {
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  role?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAuditLogsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<AuditLogOrder>;
  projectId: Scalars['String']['input'];
  query?: InputMaybe<AuditLogQuery>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryGetAccessTokenArgs = {
  accessTokenId: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
};


export type QueryGetContentArgs = {
  contentId: Scalars['String']['input'];
};


export type QueryGetContentVersionArgs = {
  versionId: Scalars['String']['input'];
};


export type QueryGetIdentityVerificationStatsArgs = {
  environmentId: Scalars['String']['input'];
};


export type QueryGetInviteArgs = {
  inviteId: Scalars['String']['input'];
};


export type QueryGetInvitesArgs = {
  projectId: Scalars['String']['input'];
};


export type QueryGetProjectConfigArgs = {
  projectId: Scalars['String']['input'];
};


export type QueryGetProjectLicenseInfoArgs = {
  projectId: Scalars['String']['input'];
};


export type QueryGetProjectSsoLoginArgs = {
  projectId: Scalars['String']['input'];
};


export type QueryGetProjectSsoProvidersArgs = {
  projectId: Scalars['String']['input'];
};


export type QueryGetProjectSsoSettingsArgs = {
  projectId: Scalars['String']['input'];
};


export type QueryGetSigningSecretArgs = {
  environmentId: Scalars['String']['input'];
  signingSecretId: Scalars['String']['input'];
};


export type QueryGetSubscriptionByProjectIdArgs = {
  projectId: Scalars['String']['input'];
};


export type QueryGetSubscriptionUsageArgs = {
  projectId: Scalars['String']['input'];
};


export type QueryGetTeamMembersArgs = {
  projectId: Scalars['String']['input'];
};


export type QueryGetThemeArgs = {
  themeId: Scalars['String']['input'];
};


export type QueryGetWebhookArgs = {
  id: Scalars['String']['input'];
};


export type QueryHelloArgs = {
  name: Scalars['String']['input'];
};


export type QueryListAccessTokensArgs = {
  environmentId: Scalars['String']['input'];
};


export type QueryListAttributeOnEventsArgs = {
  eventId: Scalars['String']['input'];
};


export type QueryListAttributesArgs = {
  bizType: Scalars['Int']['input'];
  projectId: Scalars['String']['input'];
};


export type QueryListContentPublishRecordsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  contentId: Scalars['String']['input'];
  environmentId?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryListContentVersionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  contentId: Scalars['String']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryListDefinitionReferencesArgs = {
  id: Scalars['String']['input'];
  kind: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
};


export type QueryListEventsArgs = {
  projectId: Scalars['String']['input'];
};


export type QueryListIntegrationObjectMappingsArgs = {
  integrationId: Scalars['String']['input'];
};


export type QueryListIntegrationRemotePropertiesArgs = {
  integrationId: Scalars['String']['input'];
  remoteObject: Scalars['String']['input'];
};


export type QueryListIntegrationSyncRunsArgs = {
  integrationId: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryListIntegrationsArgs = {
  environmentId: Scalars['String']['input'];
};


export type QueryListLocalizationsArgs = {
  projectId: Scalars['String']['input'];
};


export type QueryListProjectSsoProvidersArgs = {
  projectId: Scalars['String']['input'];
};


export type QueryListSegmentArgs = {
  environmentId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryListSessionsDetailArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy: AnalyticsOrder;
  query: AnalyticsQuery;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryListSigningSecretsArgs = {
  environmentId: Scalars['String']['input'];
};


export type QueryListThemesArgs = {
  projectId: Scalars['String']['input'];
};


export type QueryListVersionLocalizationsArgs = {
  versionId: Scalars['String']['input'];
};


export type QueryListWebhooksArgs = {
  environmentId: Scalars['String']['input'];
};


export type QueryProjectHasEnvironmentAccessTokensArgs = {
  projectId: Scalars['String']['input'];
};


export type QueryQueryBizCompanyArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy: BizOrder;
  query: BizQuery;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryQueryBizCompanyEventsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy: BizOrder;
  query: BizEventQuery;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryQueryBizSessionArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy: AnalyticsOrder;
  query: AnalyticsQuery;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryQueryBizUserArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy: BizOrder;
  query: BizQuery;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryQueryBizUserEventsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy: BizOrder;
  query: BizEventQuery;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryQueryContentArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<ContentOrder>;
  query?: InputMaybe<ContentQuery>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryQueryContentAnalyticsArgs = {
  contentId: Scalars['String']['input'];
  endDate: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  startDate: Scalars['String']['input'];
  timezone: Scalars['String']['input'];
};


export type QueryQueryContentQuestionAnalyticsArgs = {
  contentId: Scalars['String']['input'];
  endDate: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  startDate: Scalars['String']['input'];
  timezone: Scalars['String']['input'];
};


export type QueryQueryIntegrationMessagesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  integrationId: Scalars['String']['input'];
  last?: InputMaybe<Scalars['Int']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryQueryIntegrationSyncedSegmentsArgs = {
  integrationId: Scalars['String']['input'];
};


export type QueryQueryOembedInfoArgs = {
  url: Scalars['String']['input'];
};


export type QueryQuerySessionDetailArgs = {
  sessionId: Scalars['String']['input'];
};


export type QueryQuerySessionsByExternalIdArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy: AnalyticsOrder;
  query: SessionQuery;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryQueryTooltipTargetMissingSessionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy: AnalyticsOrder;
  query: TooltipTargetMissingQuery;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryQueryTrackerUsersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  orderBy: AnalyticsOrder;
  query: AnalyticsQuery;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryQueryWebhookMessagesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  webhookId: Scalars['String']['input'];
};


export type QueryUserEnvironmentsArgs = {
  projectId: Scalars['String']['input'];
};


export type QueryValidateIdentityTokenArgs = {
  environmentId: Scalars['String']['input'];
  token: Scalars['String']['input'];
};


export type QueryVerifyInstallationArgs = {
  environmentId: Scalars['String']['input'];
};

export type Register = {
  __typename?: 'Register';
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

export type RemoveTeamMemberInput = {
  projectId: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};

export type ResendLinkInput = {
  id: Scalars['String']['input'];
};

export type ResetPasswordByCodeInput = {
  code: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type ResetPasswordInput = {
  email: Scalars['String']['input'];
};

/** User role */
export type Role =
  | 'ADMIN'
  | 'EDITOR'
  | 'OWNER'
  | 'VIEWER';

export type Segment = {
  __typename?: 'Segment';
  bizType: SegmentBizType;
  columns?: Maybe<Scalars['JSON']['output']>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  data?: Maybe<Scalars['JSON']['output']>;
  dataType: SegmentDataType;
  environmentId?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  projectId?: Maybe<Scalars['String']['output']>;
  source?: Maybe<Scalars['String']['output']>;
  sourceId?: Maybe<Scalars['String']['output']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

export type SegmentBizType =
  | 'COMPANY'
  | 'USER';

export type SegmentDataType =
  | 'ALL'
  | 'CONDITION'
  | 'MANUAL';

export type SessionQuery = {
  contentId?: InputMaybe<Scalars['String']['input']>;
  endDate?: InputMaybe<Scalars['String']['input']>;
  environmentId: Scalars['String']['input'];
  externalCompanyId?: InputMaybe<Scalars['String']['input']>;
  externalUserId?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['String']['input']>;
};

export type SetupSystemAdminInput = {
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type SignupInput = {
  code: Scalars['String']['input'];
  companyName: Scalars['String']['input'];
  password: Scalars['String']['input'];
  userName: Scalars['String']['input'];
};

export type SsoProviderModel = {
  __typename?: 'SsoProviderModel';
  authorizationUrl?: Maybe<Scalars['String']['output']>;
  clientId: Scalars['String']['output'];
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  issuer: Scalars['String']['output'];
  name: Scalars['String']['output'];
  projectId: Scalars['String']['output'];
  status: Scalars['String']['output'];
  tokenUrl?: Maybe<Scalars['String']['output']>;
  type: SsoProviderType;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  userInfoUrl?: Maybe<Scalars['String']['output']>;
};

/** SSO identity provider protocol */
export type SsoProviderType =
  | 'OIDC'
  | 'SAML';

export type StartIntegrationOAuthInput = {
  environmentId: Scalars['String']['input'];
  provider: Scalars['String']['input'];
  returnUrl?: InputMaybe<Scalars['String']['input']>;
};

export type Step = {
  __typename?: 'Step';
  contentId?: Maybe<Scalars['String']['output']>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  cvid: Scalars['String']['output'];
  data?: Maybe<Scalars['JSON']['output']>;
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  screenshot?: Maybe<Scalars['JSON']['output']>;
  sequence?: Maybe<Scalars['Int']['output']>;
  setting?: Maybe<Scalars['JSON']['output']>;
  target?: Maybe<Scalars['JSON']['output']>;
  themeId?: Maybe<Scalars['String']['output']>;
  trigger?: Maybe<Scalars['JSON']['output']>;
  type: Scalars['String']['output'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  versionId: Scalars['String']['output'];
};

export type StepAnalytics = {
  __typename?: 'StepAnalytics';
  tooltipTargetMissingCount: Scalars['Int']['output'];
  totalCompletions: Scalars['Int']['output'];
  totalViews: Scalars['Int']['output'];
  uniqueCompletions: Scalars['Int']['output'];
  uniqueTooltipTargetMissingCount: Scalars['Int']['output'];
  uniqueViews: Scalars['Int']['output'];
};

export type StepInput = {
  cvid?: InputMaybe<Scalars['String']['input']>;
  data?: InputMaybe<Scalars['JSON']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  screenshot?: InputMaybe<Scalars['JSON']['input']>;
  sequence?: InputMaybe<Scalars['Int']['input']>;
  setting?: InputMaybe<Scalars['JSON']['input']>;
  target?: InputMaybe<Scalars['JSON']['input']>;
  themeId?: InputMaybe<Scalars['String']['input']>;
  trigger?: InputMaybe<Scalars['JSON']['input']>;
  type: Scalars['String']['input'];
};

export type Storage = {
  __typename?: 'Storage';
  cdnUrl: Scalars['String']['output'];
  signedUrl: Scalars['String']['output'];
};

export type SubscriptionModel = {
  __typename?: 'SubscriptionModel';
  cancelAt?: Maybe<Scalars['String']['output']>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  interval: Scalars['String']['output'];
  isTrial: Scalars['Boolean']['output'];
  lookupKey: Scalars['String']['output'];
  overridePlan?: Maybe<Scalars['JSON']['output']>;
  planType: Scalars['String']['output'];
  projectId: Scalars['String']['output'];
  status: Scalars['String']['output'];
  subscriptionId: Scalars['String']['output'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

export type SubscriptionPlanModel = {
  __typename?: 'SubscriptionPlanModel';
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  interval: Scalars['String']['output'];
  lookupKey: Scalars['String']['output'];
  mauQuota: Scalars['Int']['output'];
  planType: Scalars['String']['output'];
  sessionCountQuota: Scalars['Int']['output'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

export type SyncInboundFieldInput = {
  local: Scalars['String']['input'];
  remote: Scalars['String']['input'];
};

export type SyncOutboundFieldInput = {
  local: Scalars['String']['input'];
};

export type Theme = {
  __typename?: 'Theme';
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  isDefault: Scalars['Boolean']['output'];
  isSystem: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  projectId: Scalars['String']['output'];
  settings: Scalars['JSON']['output'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  variations?: Maybe<Scalars['JSON']['output']>;
};

export type TooltipTargetMissingQuery = {
  contentId: Scalars['String']['input'];
  endDate: Scalars['String']['input'];
  environmentId: Scalars['String']['input'];
  startDate: Scalars['String']['input'];
  stepCvid: Scalars['String']['input'];
  timezone: Scalars['String']['input'];
};

export type TooltipTargetMissingResponse = {
  __typename?: 'TooltipTargetMissingResponse';
  sessions: BizSessionConnection;
  stepAnalytics: StepAnalytics;
};

export type TrackerUser = {
  __typename?: 'TrackerUser';
  bizCompany?: Maybe<BizModel>;
  bizUser: BizUser;
  companiesCount: Scalars['Int']['output'];
  eventsCount: Scalars['Int']['output'];
  firstTrackedAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  lastTrackedAt: Scalars['DateTime']['output'];
};

export type TrackerUserConnection = {
  __typename?: 'TrackerUserConnection';
  edges?: Maybe<Array<TrackerUserEdge>>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type TrackerUserEdge = {
  __typename?: 'TrackerUserEdge';
  cursor: Scalars['String']['output'];
  node: TrackerUser;
};

export type TransferProjectOwnershipInput = {
  projectId: Scalars['String']['input'];
  userId: Scalars['String']['input'];
};

export type TranslateLocalizationUnitsInput = {
  localizationId: Scalars['String']['input'];
  units: Array<TranslationUnitInput>;
  versionId: Scalars['String']['input'];
};

export type TranslatedUnit = {
  __typename?: 'TranslatedUnit';
  path: Scalars['String']['output'];
  translatedText: Scalars['String']['output'];
};

export type TranslationUnitInput = {
  path: Scalars['String']['input'];
  sourceText: Scalars['String']['input'];
};

export type TwoFactorEnableResult = {
  __typename?: 'TwoFactorEnableResult';
  auth?: Maybe<Auth>;
  recoveryCodes: Array<Scalars['String']['output']>;
};

export type TwoFactorSetupPayload = {
  __typename?: 'TwoFactorSetupPayload';
  otpauthUri: Scalars['String']['output'];
  qrDataUri: Scalars['String']['output'];
  secret: Scalars['String']['output'];
};

export type TwoFactorStepUpInput = {
  code: Scalars['String']['input'];
  isRecoveryCode?: Scalars['Boolean']['input'];
};

export type UpdateApiTokenInput = {
  environmentIds?: InputMaybe<Array<Scalars['String']['input']>>;
  name?: InputMaybe<Scalars['String']['input']>;
  projectIds?: InputMaybe<Array<Scalars['String']['input']>>;
  scopes?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type UpdateAttributeInput = {
  bizType?: InputMaybe<Scalars['Int']['input']>;
  codeName?: InputMaybe<Scalars['String']['input']>;
  dataType?: InputMaybe<Scalars['Int']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
};

export type UpdateContentInput = {
  buildUrl?: InputMaybe<Scalars['String']['input']>;
  config?: InputMaybe<Scalars['JSON']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateEnvironmentInput = {
  id: Scalars['String']['input'];
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
};

export type UpdateEventInput = {
  attributeIds?: InputMaybe<Array<Scalars['String']['input']>>;
  codeName?: InputMaybe<Scalars['String']['input']>;
  deleted?: InputMaybe<Scalars['Boolean']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  eventId?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
};

export type UpdateIntegrationEventsInput = {
  codeNames?: InputMaybe<Array<Scalars['String']['input']>>;
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['String']['input'];
};

export type UpdateIntegrationInboundInput = {
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['String']['input'];
  userIdProperty?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateLocalizationInput = {
  code?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  locale?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateProjectSsoSettingsInput = {
  allowedDomains?: InputMaybe<Array<Scalars['String']['input']>>;
  autoProvision?: InputMaybe<Scalars['Boolean']['input']>;
  defaultRole?: InputMaybe<Role>;
  requireSso?: InputMaybe<Scalars['Boolean']['input']>;
};

export type UpdateSegment = {
  columns?: InputMaybe<Scalars['JSON']['input']>;
  data?: InputMaybe<Scalars['JSON']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateSsoProviderInput = {
  authorizationUrl?: InputMaybe<Scalars['String']['input']>;
  clientId?: InputMaybe<Scalars['String']['input']>;
  clientSecret?: InputMaybe<Scalars['String']['input']>;
  issuer?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  tokenUrl?: InputMaybe<Scalars['String']['input']>;
  userInfoUrl?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateThemeInput = {
  id: Scalars['String']['input'];
  isDefault?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  settings?: InputMaybe<Scalars['JSON']['input']>;
  variations?: InputMaybe<Scalars['JSON']['input']>;
};

export type UpdateUserInput = {
  avatarUrl?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type UpdateVersionLocalizationInput = {
  code: Scalars['String']['input'];
  contentId: Scalars['String']['input'];
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  translations?: InputMaybe<Array<VersionTranslationUnitInput>>;
  versionId: Scalars['String']['input'];
};

export type UpdateWebhookInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['String']['input'];
  topics?: InputMaybe<Array<Scalars['String']['input']>>;
  url?: InputMaybe<Scalars['String']['input']>;
};

export type UpsertIntegrationInput = {
  config?: InputMaybe<IntegrationConfigInput>;
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  environmentId: Scalars['String']['input'];
  key?: InputMaybe<Scalars['String']['input']>;
  provider: Scalars['String']['input'];
};

export type UpsertIntegrationObjectMappingInput = {
  adoptExisting?: InputMaybe<Scalars['Boolean']['input']>;
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  inboundFields: Array<SyncInboundFieldInput>;
  integrationId: Scalars['String']['input'];
  localObject: Scalars['String']['input'];
  matchRemoteField?: InputMaybe<Scalars['String']['input']>;
  matchStrategy: Scalars['String']['input'];
  outboundFields: Array<SyncOutboundFieldInput>;
  remoteObject: Scalars['String']['input'];
};

export type User = {
  __typename?: 'User';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  disabled: Scalars['Boolean']['output'];
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isOAuthUser?: Maybe<Scalars['Boolean']['output']>;
  isSystemAdmin: Scalars['Boolean']['output'];
  name?: Maybe<Scalars['String']['output']>;
  projects?: Maybe<Array<UserOnProject>>;
  twoFactorAvailable?: Maybe<Scalars['Boolean']['output']>;
  twoFactorEnabled: Scalars['Boolean']['output'];
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};

export type UserOnProject = {
  __typename?: 'UserOnProject';
  actived: Scalars['Boolean']['output'];
  allowedEnvironmentIds?: Maybe<Array<Scalars['String']['output']>>;
  capabilities: Array<Scalars['String']['output']>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  project: Project;
  role: Role;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  user?: Maybe<User>;
};

export type VerifyTwoFactorInput = {
  challengeToken: Scalars['String']['input'];
  code: Scalars['String']['input'];
  isRecoveryCode?: Scalars['Boolean']['input'];
};

export type Version = {
  __typename?: 'Version';
  config?: Maybe<Scalars['JSON']['output']>;
  contentId?: Maybe<Scalars['String']['output']>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  createdByUserId?: Maybe<Scalars['String']['output']>;
  data?: Maybe<Scalars['JSON']['output']>;
  id: Scalars['ID']['output'];
  publishedAt?: Maybe<Scalars['DateTime']['output']>;
  scheduledAt?: Maybe<Scalars['DateTime']['output']>;
  sequence: Scalars['Int']['output'];
  steps?: Maybe<Array<Step>>;
  themeId?: Maybe<Scalars['String']['output']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  updatedByName?: Maybe<Scalars['String']['output']>;
  updatedByUserId?: Maybe<Scalars['String']['output']>;
};

export type VersionConnection = {
  __typename?: 'VersionConnection';
  edges?: Maybe<Array<VersionEdge>>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type VersionEdge = {
  __typename?: 'VersionEdge';
  cursor: Scalars['String']['output'];
  node: Version;
};

export type VersionIdInput = {
  environmentId?: InputMaybe<Scalars['String']['input']>;
  versionId?: InputMaybe<Scalars['String']['input']>;
};

export type VersionInput = {
  config?: InputMaybe<Scalars['JSON']['input']>;
  data?: InputMaybe<Scalars['JSON']['input']>;
  scheduledAt?: InputMaybe<Scalars['DateTime']['input']>;
  steps?: InputMaybe<Array<StepInput>>;
  themeId?: InputMaybe<Scalars['String']['input']>;
};

export type VersionOnLocalization = {
  __typename?: 'VersionOnLocalization';
  backup?: Maybe<Scalars['JSON']['output']>;
  /** Identifies the date and time when the object was created. */
  createdAt: Scalars['DateTime']['output'];
  enabled: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  localizationId: Scalars['String']['output'];
  localized?: Maybe<Scalars['JSON']['output']>;
  /** Identifies the date and time when the object was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  version?: Maybe<Version>;
  versionId: Scalars['String']['output'];
};

export type VersionTranslationUnitInput = {
  path: Scalars['String']['input'];
  translation?: InputMaybe<Scalars['String']['input']>;
};

export type VersionUpdateInput = {
  content: VersionInput;
  expectedUpdatedAt?: InputMaybe<Scalars['DateTime']['input']>;
  versionId?: InputMaybe<Scalars['String']['input']>;
};

export type Webhook = {
  __typename?: 'Webhook';
  autoDisabledAt?: Maybe<Scalars['DateTime']['output']>;
  consecutiveFailures: Scalars['Int']['output'];
  cooldownUntil?: Maybe<Scalars['DateTime']['output']>;
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  enabled: Scalars['Boolean']['output'];
  environmentId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  secret?: Maybe<Scalars['String']['output']>;
  topics: Scalars['JSON']['output'];
  updatedAt: Scalars['DateTime']['output'];
  url: Scalars['String']['output'];
};

export type WebhookDelivery = {
  __typename?: 'WebhookDelivery';
  attempt: Scalars['Int']['output'];
  createdAt: Scalars['DateTime']['output'];
  durationMs?: Maybe<Scalars['Int']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  responseBody?: Maybe<Scalars['String']['output']>;
  responseStatus?: Maybe<Scalars['Int']['output']>;
  success: Scalars['Boolean']['output'];
};

export type WebhookIdInput = {
  id: Scalars['String']['input'];
};

export type WebhookMessage = {
  __typename?: 'WebhookMessage';
  createdAt: Scalars['DateTime']['output'];
  deliveries: Array<WebhookDelivery>;
  id: Scalars['String']['output'];
  payload: Scalars['JSON']['output'];
  status: Scalars['String']['output'];
  topic: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type WebhookMessageConnection = {
  __typename?: 'WebhookMessageConnection';
  edges?: Maybe<Array<WebhookMessageEdge>>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type WebhookMessageEdge = {
  __typename?: 'WebhookMessageEdge';
  cursor: Scalars['String']['output'];
  node: WebhookMessage;
};

export type WebhookMessageInput = {
  messageId: Scalars['String']['input'];
  webhookId: Scalars['String']['input'];
};

export type CreatePresignedUrlInput = {
  contentType?: InputMaybe<Scalars['String']['input']>;
  fileName: Scalars['String']['input'];
  storageType: Scalars['String']['input'];
};
