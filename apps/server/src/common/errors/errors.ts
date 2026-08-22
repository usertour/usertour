import { HttpStatus } from '@nestjs/common';
import { BaseError } from './base';

export class UnknownError extends BaseError {
  code = 'E0000';
  messageDict = {
    en: 'An unknown error has occurred. The Usertour team is working quickly to resolve it. Please try again later.',
    'zh-CN': '出现未知错误，Usertour 团队正在火速处理中，请稍后重试。',
  };
}

export class ParamsError extends BaseError {
  code = 'E0003';
  messageDict = {
    en: 'System parameter error. The Usertour team is working quickly to address it. Please try again later.',
    'zh-CN': '系统参数错误，Usertour 团队正在火速处理中，请稍后重试。',
  };
}

export class OAuthError extends BaseError {
  code = 'E0004';
  messageDict = {
    en: 'Authorization process failed, please try again',
    'zh-CN': '授权过程失败，请重试',
  };
}

export class AccountNotFoundError extends BaseError {
  code = 'E0005';
  messageDict = {
    en: 'Account not found, please sign up',
    'zh-CN': '账户不存在，请注册',
  };
}

export class PasswordIncorrect extends BaseError {
  code = 'E0006';
  messageDict = {
    en: 'Password incorrect, please try again',
    'zh-CN': '密码错误，请重试',
  };
}

export class EmailAlreadyRegistered extends BaseError {
  code = 'E0007';
  messageDict = {
    en: 'Email already registered, please log in or try another one',
    'zh-CN': '邮箱已被注册，请登录或尝试其他邮箱',
  };
}

export class InvalidVerificationSession extends BaseError {
  code = 'E0008';
  messageDict = {
    en: 'Verification session not found or expired, please try again',
    'zh-CN': '验证会话不存在或已过期，请重试',
  };
}

export class AuthenticationExpiredError extends BaseError {
  code = 'E0011';
  messageDict = {
    en: 'Authentication expired, please log in again',
    'zh-CN': '身份验证已过期，请重新登录',
  };
}

export class NoPermissionError extends BaseError {
  code = 'E0013';
  messageDict = {
    en: 'You do not have permission to access this project',
    'zh-CN': '您没有权限访问该项目',
  };
}

/**
 * The member's project membership restricts which environments they may act on
 * (UserOnProject.allowedEnvironmentIds), and this request targets one outside
 * that set — e.g. publishing to Production with a Development-only membership.
 */
export class MemberEnvironmentNotAllowedError extends BaseError {
  code = 'E0060';
  messageDict = {
    en: 'Your project membership does not allow acting on this environment',
    'zh-CN': '您的成员权限不包含该环境，无法在此环境执行操作',
  };
}

export class TeamMemberLimitError extends BaseError {
  code = 'E0015';
  messageDict = {
    en: 'You have reached your team member limit. Please upgrade your Usertour account under Settings → Billing.',
    'zh-CN': '您已经达到了团队成员的限制，请在设置 → 账单中升级您的 Usertour 账户。',
  };
}

export class InvalidLicenseError extends BaseError {
  code = 'E0016';
  messageDict = {
    en: "We couldn't verify this license. Please make sure you're using the correct license and try again.",
    'zh-CN': '无法验证该许可证。请确认您使用的是正确的许可证后重试。',
  };
}

export class LicenseExpiredError extends BaseError {
  code = 'E0017';
  messageDict = {
    en: 'License has expired',
    'zh-CN': '许可证已过期',
  };
}

export class LicenseProjectMismatchError extends BaseError {
  code = 'E0018';
  messageDict = {
    en: 'License is not valid for this project',
    'zh-CN': '许可证不适用于此项目',
  };
}

export class LicenseDecodeError extends BaseError {
  code = 'E0019';
  messageDict = {
    en: 'Failed to decode license payload',
    'zh-CN': '无法解码许可证内容',
  };
}

export abstract class OpenAPIError extends BaseError {
  statusCode: HttpStatus;
}

export class InvalidApiKeyError extends OpenAPIError {
  code = 'E1000';
  statusCode = HttpStatus.FORBIDDEN;
  messageDict = {
    en: 'Invalid API key provided',
    'zh-CN': '提供的 API 密钥无效',
  };
}

export class MissingApiKeyError extends OpenAPIError {
  code = 'E1010';
  statusCode = HttpStatus.UNAUTHORIZED;
  messageDict = {
    en: 'Missing API key',
    'zh-CN': '缺少 API 密钥',
  };
}

export class ExpiredApiKeyError extends OpenAPIError {
  code = 'E1020';
  statusCode = HttpStatus.UNAUTHORIZED;
  messageDict = {
    en: 'API key has expired',
    'zh-CN': 'API 密钥已过期',
  };
}

export class ProjectNotInTokenScopeError extends OpenAPIError {
  code = 'E1011';
  statusCode = HttpStatus.FORBIDDEN;
  messageDict = {
    en: 'API key is not scoped to the requested project',
    'zh-CN': 'API 密钥未授权访问该项目',
  };
}

export class InsufficientScopeError extends OpenAPIError {
  code = 'E1012';
  statusCode = HttpStatus.FORBIDDEN;
  messageDict = {
    en: 'API key lacks the required scope for this operation',
    'zh-CN': 'API 密钥缺少此操作所需的权限范围',
  };
}

export class EnvironmentProjectMismatchError extends OpenAPIError {
  code = 'E1019';
  statusCode = HttpStatus.FORBIDDEN;
  messageDict = {
    en: 'Environment does not belong to the requested project',
    'zh-CN': '环境不属于该项目',
  };
}

export class EnvironmentNotInTokenScopeError extends OpenAPIError {
  code = 'E1029';
  statusCode = HttpStatus.FORBIDDEN;
  messageDict = {
    en:
      'API key is not scoped to the requested environment. List environments ' +
      '(list_environments / GET /environments) — entries with inTokenScope: true are the ones ' +
      'this credential may act on.',
    'zh-CN': 'API 密钥未授权访问该环境。可通过环境列表查看 inTokenScope 为 true 的可用环境。',
  };

  /**
   * Optionally name the environments the token MAY act on, turning a dead-end ("not
   * scoped") into a redirect ("use one of these") — caller passes them when the names
   * are on hand (e.g. the MCP env resolver). Omit for the bare, stable message.
   */
  constructor(allowed?: { name: string; id: string }[]) {
    super();
    if (allowed?.length) {
      const list = allowed.map((e) => `${e.name} (${e.id})`).join(', ');
      this.messageDict = {
        en: `API key is not scoped to the requested environment. It may only act on: ${list}.`,
        'zh-CN': `API 密钥未授权访问该环境。仅可操作:${list}。`,
      };
    }
  }
}

/**
 * Creating an environment with a token restricted to an environment allowlist
 * would mint an environment OUTSIDE that allowlist — the token could neither use
 * nor delete it (every follow-up op 403s E1029, an undeletable orphan). Refuse up
 * front: environment creation needs a token scoped to ALL environments (no
 * allowlist, and an owner with no environment ceiling). Rename/delete of an
 * in-scope environment stay allowed for allowlist tokens.
 */
export class EnvironmentCreateRequiresFullScopeError extends OpenAPIError {
  code = 'E1032';
  statusCode = HttpStatus.FORBIDDEN;
  messageDict = {
    // NOT "use a token scoped to all environments": tokens holding env-targeted
    // capabilities (user/company/session/segment/analytics, content:publish) are
    // REQUIRED to name environments at creation — "all environments" is not
    // grantable for them, so that advice would be impossible to follow. The
    // executable fix is a separate project-level-only token.
    en: 'Cannot create an environment with this token — its environment allowlist cannot cover an environment that does not exist yet. Tokens holding env-targeted capabilities (user/company/session/segment/analytics, content:publish) always carry an allowlist, so use a separate token with project-level capabilities only (e.g. environment:manage, themes, attribute/event definitions, content read/write).',
    'zh-CN':
      '此密钥无法创建环境——它的环境名单不可能覆盖一个还不存在的环境。带用户/公司/会话/分群/分析或发布能力的密钥在创建时必须指名环境,因此请另建一把只含项目级能力(环境管理、主题、属性/事件定义、内容读写)的密钥来创建环境。',
  };
}

/**
 * A /v2 request that matched no route at all. Emitted by the global fallback
 * filter so even "Cannot GET /v2/..." keeps the v2 error envelope (the Nest
 * default renders a bare {message, error, statusCode} shape).
 */
/**
 * State-conflict deletes on themes, same family as E1028/E1030/E1031 (and the
 * environments' E0022/E0023): the request is well-formed, the CURRENT STATE
 * refuses it. E1034 is resolvable (move the default first); E1035 is a
 * permanent property — the message offers no fake way out.
 */
export class DefaultThemeCannotBeDeletedError extends OpenAPIError {
  code = 'E1034';
  statusCode = HttpStatus.CONFLICT;
  messageDict = {
    en: 'Cannot delete the default theme — set another theme as the project default first.',
    'zh-CN': '无法删除默认主题——请先将其他主题设为项目默认。',
  };
}

/**
 * Writing custom CSS on a plan that doesn't include it. The builder blocks the
 * same field behind an upsell at this predicate; if the API accepted the write,
 * the CSS would store and round-trip on reads while the session builder strips
 * it at delivery — the author sees success everywhere and users see nothing.
 * Refuse upfront and name the requirement instead. Echoing a STORED customCss
 * back unchanged stays legal (read-modify-write), as does clearing it.
 */
export class CustomCssPlanRequiredError extends OpenAPIError {
  code = 'E1038';
  statusCode = HttpStatus.FORBIDDEN;
  messageDict = {
    en:
      "Custom CSS requires the Growth plan or above — on the project's current plan the " +
      'runtime strips `customCss` before delivery, so the write is refused rather than ' +
      'silently stored. Remove `customCss` from the settings patch, or upgrade the plan ' +
      '(Settings → Billing).',
    'zh-CN':
      '自定义 CSS 需要 Growth 及以上套餐——当前套餐下运行时会在下发前剥离 customCss,' +
      '因此写入被拒绝而非静默存储。请从 settings 中移除 customCss,或升级套餐(设置 → 账单)。',
  };
}

export class SystemThemeCannotBeChangedError extends OpenAPIError {
  code = 'E1035';
  statusCode = HttpStatus.CONFLICT;
  messageDict = {
    en: 'System themes cannot be modified or deleted. Duplicate one into your own theme if you need a variant. (Setting a system theme as the project default IS allowed.)',
    'zh-CN':
      '系统主题不可修改或删除。如需自定义,请基于它创建自己的主题副本。(允许将系统主题设为项目默认。)',
  };
}

/**
 * Predefined attribute/event definitions are a permanent property — like
 * E1035 (system themes): 409, no un-predefine action exists, so the message
 * points at the real alternative instead of a fake way out. Shared by all
 * four sites (attribute/event x modify/delete).
 */
export class PredefinedDefinitionCannotBeChangedError extends OpenAPIError {
  code = 'E1036';
  statusCode = HttpStatus.CONFLICT;
  messageDict = {
    en: 'Predefined definitions cannot be modified or deleted — create your own definition instead.',
    'zh-CN': '预定义的属性/事件不可修改或删除——如需自定义,请新建一个自己的定义。',
  };
}

/**
 * The built-in "all" segment (every user / every company) is a fixture, not
 * user data — same permanent-property family as E1035/E1036: 409, no way to
 * un-built-in it, the message points at the real alternative.
 */
export class BuiltInSegmentCannotBeChangedError extends OpenAPIError {
  code = 'E1037';
  statusCode = HttpStatus.CONFLICT;
  messageDict = {
    en: 'The built-in "all" segment cannot be modified or deleted — create a condition segment if you need a filtered audience.',
    'zh-CN': '内置的"all"分群不可修改或删除——如需筛选人群,请新建一个条件分群。',
  };
}

export class UnknownRouteError extends OpenAPIError {
  code = 'E1033';
  statusCode = HttpStatus.NOT_FOUND;
  messageDict = {
    en: 'Unknown API route',
    'zh-CN': '未知的 API 路径',
  };
}

export class ThemeNotFoundError extends OpenAPIError {
  code = 'E1021';
  statusCode = HttpStatus.NOT_FOUND;
  messageDict = {
    en: 'Theme not found',
    'zh-CN': '主题未找到',
  };
}

export class AttributeDefinitionNotFoundError extends OpenAPIError {
  code = 'E1022';
  statusCode = HttpStatus.NOT_FOUND;
  messageDict = {
    en: 'Attribute definition not found',
    'zh-CN': '属性定义未找到',
  };
}

export class ResourceConflictError extends OpenAPIError {
  code = 'E1023';
  statusCode = HttpStatus.CONFLICT;
  messageDict = {
    en: 'A resource with this identifier already exists',
    'zh-CN': '该标识的资源已存在',
  };
}

export class EventDefinitionNotFoundError extends OpenAPIError {
  code = 'E1024';
  statusCode = HttpStatus.NOT_FOUND;
  messageDict = {
    en: 'Event definition not found',
    'zh-CN': '事件定义未找到',
  };
}

/**
 * Deleting an event definition that already has recorded events (BizEvent rows —
 * e.g. fired by a tracker or `usertour.track()`) is blocked by a DB foreign-key
 * RESTRICT. Translate that into a clean domain error instead of leaking the raw
 * Postgres constraint message to API / MCP callers.
 */
export class EventDefinitionInUseError extends OpenAPIError {
  code = 'E1030';
  statusCode = HttpStatus.CONFLICT;
  messageDict = {
    en: 'Cannot delete an event definition that has recorded events. Trackers or usertour.track() calls have already logged events against it.',
    'zh-CN': '无法删除已记录事件的事件定义（已有 tracker 或 usertour.track() 记录的事件引用它）。',
  };
}

/**
 * Deleting a theme that is still ACTIVELY used — referenced by a live published
 * version or a content's current draft (version-level themeId or a per-step
 * override). Without this guard the FK's ON DELETE SET NULL silently strips the
 * theme from those versions and the SDK stops rendering them (there is no
 * fallback theme at runtime). Historical-version references don't block.
 */
export class ThemeInUseError extends OpenAPIError {
  code = 'E1031';
  statusCode = HttpStatus.CONFLICT;
  messageDict = {
    en: 'Cannot delete a theme that is used by live or draft content. Switch that content to another theme first.',
    'zh-CN': '无法删除正被线上或草稿内容使用的主题，请先为这些内容更换主题。',
  };

  // Same shape as ContentNotPublishableError: the caller may inline the
  // offending content names so people/agents know what to re-theme.
  constructor(message?: string) {
    super();
    if (message) {
      this.messageDict.en = message;
      this.messageDict['zh-CN'] = message;
    }
  }
}

export class SegmentNotFoundError extends OpenAPIError {
  code = 'E1025';
  statusCode = HttpStatus.NOT_FOUND;
  messageDict = {
    en: 'Segment not found',
    'zh-CN': '分群未找到',
  };
}

export class EnvironmentNotFoundError extends OpenAPIError {
  code = 'E1026';
  statusCode = HttpStatus.NOT_FOUND;
  messageDict = {
    en: 'Environment not found',
    'zh-CN': '环境未找到',
  };
}

/**
 * The content version is structurally valid but not usable — it would not
 * render or function in the SDK (e.g. a tooltip step with no target, an empty
 * checklist, content with no theme). Carries the list of issues in the message.
 */
export class ContentNotPublishableError extends OpenAPIError {
  code = 'E1027';
  statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
  messageDict = {
    en: 'Content is not publishable',
    'zh-CN': '内容不可发布',
  };

  constructor(message?: string) {
    super();
    if (message) {
      this.messageDict.en = message;
      this.messageDict['zh-CN'] = message;
    }
  }
}

/**
 * Deleting content that is still published in one or more environments would
 * pull a live experience out from under users. Unpublish from all environments
 * first, then delete. The web UI disables delete while content is published;
 * this enforces the same rule at the service layer so the API / MCP (which
 * bypass the UI) can't do what the UI forbids.
 */
export class ContentPublishedDeleteError extends OpenAPIError {
  code = 'E1028';
  statusCode = HttpStatus.CONFLICT;
  messageDict = {
    en: 'Cannot delete content that is still published. Unpublish it from all environments first.',
    'zh-CN': '无法删除仍处于发布状态的内容，请先在所有环境中取消发布。',
  };
}

export class UserNotFoundError extends OpenAPIError {
  code = 'E1001';
  statusCode = HttpStatus.NOT_FOUND;
  messageDict = {
    en: 'User not found',
    'zh-CN': '用户未找到',
  };

  /**
   * Optionally add call-site context (E1029 precedent) — e.g. the segment
   * member endpoints look the externalId up in the table the SEGMENT's bizType
   * dictates, and a bare "User not found" reads as a typo hunt when the real
   * issue is a company externalId aimed at a user segment.
   */
  constructor(context?: string) {
    super();
    if (context) {
      this.messageDict = {
        en: `User not found — ${context}`,
        'zh-CN': `用户未找到——${context}`,
      };
    }
  }
}

export class UserRegistrationDisabledError extends BaseError {
  code = 'E0025';
  messageDict = {
    en: 'User registration is disabled for this instance. Please contact your administrator.',
    'zh-CN': '当前实例已关闭用户注册，请联系管理员。',
  };
}

export class SystemAdminAlreadyInitializedError extends BaseError {
  code = 'E0026';
  messageDict = {
    en: 'A System Admin has already been set up for this instance.',
    'zh-CN': '当前实例已经完成 System Admin 初始化。',
  };
}

export class SystemAdminSetupUnavailableError extends BaseError {
  code = 'E0027';
  messageDict = {
    en: 'System Admin setup is only available for self-hosted instances before initialization is complete.',
    'zh-CN': 'System Admin 初始化仅适用于尚未完成初始化的 self-host 实例。',
  };
}

export class SystemAdminSetupRequiredError extends BaseError {
  code = 'E0028';
  messageDict = {
    en: 'Set up the first admin account for this self-hosted instance before creating other users.',
    'zh-CN': '请先为当前 self-host 实例完成首个管理员初始化，再创建其他用户。',
  };
}

export class InstanceLicenseProjectLimitReachedError extends BaseError {
  code = 'E0029';
  messageDict = {
    en: 'The instance license project limit has been reached. Existing assignments still work, but no additional projects can use the instance license.',
    'zh-CN':
      '当前实例许可证的项目数量上限已达到。现有分配仍然有效，但无法再为更多项目启用实例许可证。',
  };
}

export class EnvironmentLimitError extends BaseError {
  code = 'E0030';
  messageDict = {
    en: 'You have reached your environment limit. Please upgrade your Usertour account under Settings → Billing.',
    'zh-CN': '您已经达到了 Environment 数量的限制，请在设置 → 账单中升级您的 Usertour 账户。',
  };
}

export class TeamMemberAlreadyInvitedError extends BaseError {
  code = 'E0031';
  messageDict = {
    en: 'This email already has a pending invitation for this project.',
    'zh-CN': '该邮箱在当前项目已存在待接受的邀请。',
  };
}

export class TeamMemberAlreadyInProjectError extends BaseError {
  code = 'E0032';
  messageDict = {
    en: 'This email is already a member of this project.',
    'zh-CN': '该邮箱已经是当前项目的成员。',
  };
}

export class InvitationDeliveryFailedError extends BaseError {
  code = 'E0033';
  messageDict = {
    en: 'Failed to send the invitation email. Please double-check the address and try again.',
    'zh-CN': '邀请邮件发送失败,请确认邮箱地址后重试。',
  };
}

export class CompanyNotFoundError extends OpenAPIError {
  code = 'E1002';
  statusCode = HttpStatus.NOT_FOUND;
  messageDict = {
    en: 'Company not found',
    'zh-CN': '公司未找到',
  };

  /** Optional call-site context; see {@link UserNotFoundError}. */
  constructor(context?: string) {
    super();
    if (context) {
      this.messageDict = {
        en: `Company not found — ${context}`,
        'zh-CN': `公司未找到——${context}`,
      };
    }
  }
}

export class CompanyMembershipNotFoundError extends OpenAPIError {
  code = 'E1003';
  statusCode = HttpStatus.NOT_FOUND;
  messageDict = {
    en: 'Company membership not found',
    'zh-CN': '公司成员关系未找到',
  };
}

export class ContentNotFoundError extends OpenAPIError {
  code = 'E1004';
  statusCode = HttpStatus.NOT_FOUND;
  messageDict = {
    en: 'Content not found',
    'zh-CN': '内容未找到',
  };

  // Same code, optionally sharper message (mirrors ValidationError): "no such
  // id" and "exists but archived" demand opposite next moves, and the envelope
  // renders from messageDict — a bare `super(message)` never reaches it.
  constructor(message?: string) {
    super();
    if (message) {
      this.messageDict.en = message;
      this.messageDict['zh-CN'] = message;
    }
  }
}

export class ContentSessionNotFoundError extends OpenAPIError {
  code = 'E1005';
  statusCode = HttpStatus.NOT_FOUND;
  messageDict = {
    en: 'Content session not found',
    'zh-CN': '内容会话未找到',
  };
}

export class InvalidLimitError extends OpenAPIError {
  code = 'E1006';
  statusCode = HttpStatus.BAD_REQUEST;
  messageDict = {
    en: 'Invalid limit parameter',
    'zh-CN': '无效的限制参数',
  };
}

export class InvalidCursorError extends OpenAPIError {
  code = 'E1007';
  statusCode = HttpStatus.BAD_REQUEST;
  messageDict = {
    en: 'Invalid cursor parameter',
    'zh-CN': '无效的游标参数',
  };
}

export class RateLimitExceededError extends OpenAPIError {
  code = 'E1013';
  statusCode = HttpStatus.TOO_MANY_REQUESTS;
  messageDict = {
    en: 'Too many requests',
    'zh-CN': '请求过于频繁',
  };
}

export class ServiceUnavailableError extends OpenAPIError {
  code = 'E1014';
  statusCode = HttpStatus.SERVICE_UNAVAILABLE;
  messageDict = {
    en: 'Service unavailable',
    'zh-CN': '服务不可用',
  };
}

export class InvalidScopeError extends OpenAPIError {
  code = 'E1015';
  statusCode = HttpStatus.BAD_REQUEST;
  messageDict = {
    en: 'Invalid scope parameter',
    'zh-CN': '无效的范围参数',
  };
}

/**
 * The rule families a structured validation problem can name. Runtime array so
 * every surface that lists them (the OpenAPI `issues[].rule` describe, docs)
 * derives from ONE vocabulary — the `media_url` addition updated the type and
 * errors.mdx but not the hand-written spec describe, and nothing noticed.
 * Adding a member here updates the spec text automatically.
 */
export const VALIDATION_ISSUE_RULES = [
  'schema',
  'reactive_condition',
  'action_not_allowed',
  'step_shape',
  'reference_target',
  'auto_start',
  'media_url',
] as const;

/**
 * One structured validation problem. `rule` names the rule family so a client
 * can group or react programmatically:
 *  - `schema`             — the request body doesn't match the write schema;
 *  - `reactive_condition` — a server-evaluated condition in a reactive (client-polled) slot;
 *  - `action_not_allowed` — an action type this content type's slots don't offer;
 *  - `step_shape`         — placement shape / onClick not matching the step kind;
 *  - `reference_target`   — a cross-content reference to a type that can't be targeted;
 *  - `auto_start`         — a start/hide-rule knob the content type doesn't support;
 *  - `media_url`          — an image/embed URL that isn't http(s).
 */
export type ValidationIssue = {
  rule: (typeof VALIDATION_ISSUE_RULES)[number];
  message: string;
  /** Path into the request body (e.g. `steps[0].triggers[0].when[1]`). */
  path?: string;
};

export class ValidationError extends OpenAPIError {
  code = 'E1017';
  statusCode = HttpStatus.BAD_REQUEST;
  /** Present when the request had one or more structured issues. */
  issues?: ValidationIssue[];
  messageDict = {
    en: 'Validation error',
    'zh-CN': '验证错误',
  };

  constructor(message: string, issues?: ValidationIssue[]) {
    super();
    this.messageDict.en = message;
    this.messageDict['zh-CN'] = message;
    if (issues?.length) {
      this.issues = issues;
    }
  }

  /**
   * Aggregate several issues into one error. The message carries EVERY issue
   * (joined), so single-string surfaces (the MCP tool error text) show them all;
   * structured clients read `issues` from the REST error body instead. Each
   * message is prefixed with its field path when one exists — the MCP surface
   * has no `issues[]`, so without the prefix a schema error in a large payload
   * is unlocatable.
   */
  static fromIssues(issues: ValidationIssue[]): ValidationError {
    return new ValidationError(
      issues.map((i) => (i.path ? `${i.path}: ${i.message}` : i.message)).join(' | '),
      issues,
    );
  }
}

export class SDKAuthenticationError extends BaseError {
  code = 'E1018';
  messageDict = {
    en: 'SDK authentication failed',
    'zh-CN': 'SDK 认证失败',
  };
}

export class EmailConfigNotSetError extends BaseError {
  code = 'E0020';
  messageDict = {
    en: 'Email service is not configured. Please set up email environment variables to use this feature. See: https://docs.usertour.io/open-source/env',
    'zh-CN':
      '邮件服务未配置，请设置邮件相关的环境变量以使用此功能。参考文档：https://docs.usertour.io/open-source/env',
  };
}

export class S3ConfigNotSetError extends BaseError {
  code = 'E0021';
  messageDict = {
    en: 'AWS S3 service is not configured. Please set up S3 environment variables to use this feature. See: https://docs.usertour.io/open-source/env',
    'zh-CN':
      'AWS S3 服务未配置，请设置 S3 相关的环境变量以使用此功能。参考文档：https://docs.usertour.io/open-source/env',
  };
}

export class LastEnvironmentCannotBeDeletedError extends BaseError {
  code = 'E0022';
  messageDict = {
    en: 'Cannot delete the last environment. At least one environment is required.',
    'zh-CN': '无法删除最后一个环境。至少需要保留一个环境。',
  };
}

export class PrimaryEnvironmentCannotBeDeletedError extends BaseError {
  code = 'E0023';
  messageDict = {
    en: 'Cannot delete the primary environment. Please set another environment as primary first.',
    'zh-CN': '无法删除主环境。请先将其他环境设置为主环境。',
  };
}

export class UserDisabledError extends BaseError {
  code = 'E0024';
  messageDict = {
    en: 'Your account has been disabled. Please contact your administrator.',
    'zh-CN': '您的账户已被禁用，请联系管理员。',
  };
}

export class TooManyLoginAttemptsError extends BaseError {
  code = 'E0034';
  messageDict = {
    en: 'Too many failed log-in attempts. Please try again in a few minutes.',
    'zh-CN': '登录失败次数过多，请稍后重试。',
  };
}

export class InvalidTwoFactorCodeError extends BaseError {
  code = 'E0035';
  messageDict = {
    en: 'Invalid authentication code, please try again.',
    'zh-CN': '验证码错误，请重试。',
  };
}

export class InvalidRecoveryCodeError extends BaseError {
  code = 'E0036';
  messageDict = {
    en: 'Invalid recovery code, please try again.',
    'zh-CN': '恢复码错误，请重试。',
  };
}

export class TwoFactorAlreadyEnabledError extends BaseError {
  code = 'E0037';
  messageDict = {
    en: 'Two-factor authentication is already enabled on this account.',
    'zh-CN': '该账号已开启二步验证。',
  };
}

export class TwoFactorNotEnabledError extends BaseError {
  code = 'E0038';
  messageDict = {
    en: 'Two-factor authentication is not enabled on this account.',
    'zh-CN': '该账号未开启二步验证。',
  };
}

export class TooManyTwoFactorAttemptsError extends BaseError {
  code = 'E0039';
  messageDict = {
    en: 'Too many failed verification attempts. Please try again in a few minutes.',
    'zh-CN': '验证失败次数过多，请稍后重试。',
  };
}

export class InvalidTwoFactorChallengeError extends BaseError {
  code = 'E0040';
  messageDict = {
    en: 'Verification session has expired or is invalid. Please log in again.',
    'zh-CN': '验证会话已失效，请重新登录。',
  };
}

export class SystemAdminMustEnable2FAFirstError extends BaseError {
  code = 'E0041';
  messageDict = {
    en: 'Enable 2FA on your own account before requiring it for all users.',
    'zh-CN': '请先为自己启用二步验证，再为全员开启强制要求。',
  };
}

export class TwoFactorEnforcedDisableNotAllowedError extends BaseError {
  code = 'E0042';
  messageDict = {
    en: 'Your administrator requires 2FA for all users. You cannot disable it.',
    'zh-CN': '管理员要求所有用户必须开启二步验证，无法关闭。',
  };
}

export class FeatureRequiresLicenseError extends BaseError {
  code = 'E0043';
  messageDict = {
    en: 'This feature requires an active license. Please upgrade or update your license.',
    'zh-CN': '该功能需要有效的授权许可，请升级或更新 License。',
  };
}

export class TwoFactorEnrollmentRequiredError extends BaseError {
  code = 'E0044';
  messageDict = {
    en: 'This instance requires two-factor authentication. Please enable 2FA on your account before continuing.',
    'zh-CN': '当前实例要求开启二步验证，请先在账号设置中启用 2FA。',
  };
}

export class WrongInviteAccountError extends BaseError {
  code = 'E0045';
  messageDict = {
    en: 'This invitation was sent to a different email address. Please log in with the account that received the invitation.',
    'zh-CN': '此邀请是发送给另一个邮箱的，请使用收到邀请的账号登录。',
  };
}

export class OAuthOnlyAccountError extends BaseError {
  code = 'E0046';
  messageDict = {
    en: 'This account logs in with an identity provider. Please use the matching log-in button.',
    'zh-CN': '此账号通过第三方登录，请使用对应的登录方式。',
  };
}

export class InviteSeatExhaustedError extends BaseError {
  code = 'E0047';
  messageDict = {
    en: 'This team has reached its seat limit. Please ask the inviter to free up a seat or upgrade the plan.',
    'zh-CN': '该团队的成员席位已满，请联系邀请人释放席位或升级套餐。',
  };
}

export class ResourceAlreadyExistsError extends BaseError {
  code = 'E0048';
  messageDict = {
    en: 'A resource with this identifier already exists.',
    'zh-CN': '该资源已存在。',
  };
}

export class VersionNotEditableError extends BaseError {
  code = 'E0049';
  messageDict = {
    en: 'This version can no longer be edited — it is live now, HAS been live before (a version that ever shipped is frozen as history, unpublishing does not unlock it), or has been superseded by a newer draft. Create a new editable version to make changes.',
    'zh-CN':
      '该版本不可编辑——它正在线上、曾经上过线(上过线的版本永久封存为历史,下线也不会解锁),或已被更新的草稿取代。请创建新的可编辑版本后再修改。',
  };
}

export class VersionConflictError extends BaseError {
  code = 'E0050';
  messageDict = {
    en: 'This version was modified by someone else. Refresh to load the latest version.',
    'zh-CN': '该版本已被其他人修改。请刷新加载最新版本。',
  };
}

/**
 * Raised at login when the user's project enforces SSO and this is not an SSO
 * sign-in (password / social / magic-link). Carries the enforcing project's id
 * in `details` so the client can route the user to that project's SSO entry.
 * Only thrown after the password is verified, so surfacing the id leaks nothing.
 */
export class SsoRequiredError extends BaseError {
  code = 'E0051';
  messageDict = {
    en: 'Your organization requires single sign-on. Please sign in through SSO.',
    'zh-CN': '你的组织已强制使用单点登录，请通过 SSO 登录。',
  };
  constructor(projectId?: string) {
    super();
    if (projectId) {
      this.details = { projectId };
    }
  }
}

export class SsoRequiresActiveProviderError extends BaseError {
  code = 'E0052';
  messageDict = {
    en: 'An active SSO provider is required while SSO is enforced for this project.',
    'zh-CN': '该项目已强制 SSO，需保留至少一个启用中的 SSO 提供方。',
  };
}

/**
 * The IdP authenticated the user, but they are not allowed into the project
 * (not a member, no invite, or email domain not in the allow-list). Distinct
 * from a generic OAuthError so the SSO callback can show an actionable
 * "ask an admin for access" message instead of a generic failure.
 */
export class SsoAccessDeniedError extends BaseError {
  code = 'E0053';
  messageDict = {
    en: "You don't have access to this project. Ask an admin to invite you.",
    'zh-CN': '你还没有该项目的访问权限，请让管理员邀请你。',
  };
}

/**
 * A user-controlled URL (an SSO issuer, a webhook target, …) is not an
 * acceptable egress target — not HTTPS, or a plainly-internal host (an IP
 * literal in a blocked range, or localhost). A fast-fail at config / pre-request
 * time; the egress guard remains the real runtime SSRF boundary. Never thrown
 * when the deployment permits private-network egress.
 */
export class EgressUrlNotAllowedError extends BaseError {
  code = 'E0054';
  messageDict = {
    en: 'This URL must be a publicly reachable HTTPS address.',
    'zh-CN': '该地址必须是可公网访问的 HTTPS 地址。',
  };
}

export class AiNotConfiguredError extends BaseError {
  code = 'E0055';
  messageDict = {
    en: 'AI is not configured on this instance.',
    'zh-CN': '当前实例未配置 AI 能力。',
  };
}

export class MachineTranslationRequiresPaidPlanError extends BaseError {
  code = 'E0056';
  messageDict = {
    en: 'Machine translation is available on paid plans. Please upgrade to use it.',
    'zh-CN': '机器翻译为付费套餐功能，请升级后使用。',
  };
}

export class MachineTranslationFailedError extends BaseError {
  code = 'E0057';
  messageDict = {
    en: 'Machine translation failed. Please try again.',
    'zh-CN': '机器翻译失败，请重试。',
  };
}

export class SigningSecretLimitReachedError extends BaseError {
  code = 'E0058';
  messageDict = {
    en: 'An environment can have at most 2 active signing secrets. Revoke one before creating another.',
    'zh-CN': '每个环境最多保留 2 个有效签名密钥，请先吊销一个再创建。',
  };
}

export class IdentityVerificationRequiresActiveSecretError extends BaseError {
  code = 'E0059';
  messageDict = {
    en: 'Identity verification requires at least one active signing secret.',
    'zh-CN': '身份验证需要至少一个有效的签名密钥。',
  };
}

export class WebhookNotFoundError extends BaseError {
  // E0060 is taken by MemberEnvironmentNotAllowedError (declared out of
  // numeric order above) — codes are assigned by grep, not by file position.
  code = 'E0061';
  messageDict = {
    en: 'Webhook not found.',
    'zh-CN': 'Webhook 不存在。',
  };
}

export class WebhookMessageNotFoundError extends BaseError {
  code = 'E0062';
  messageDict = {
    en: 'Webhook message not found.',
    'zh-CN': 'Webhook 消息不存在。',
  };
}
