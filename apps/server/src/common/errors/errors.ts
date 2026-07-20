import { HttpStatus } from '@nestjs/common';
import { BaseError } from './base';

export class UnknownError extends BaseError {
  code = 'E0000';
  messageDict = {
    en: 'An unknown error has occurred. The Usertour team is working quickly to resolve it. Please try again later.',
    'zh-CN': '出现未知错误，Usertour 团队正在火速处理中，请稍后重试。',
  };
}

export class ContentTooLargeError extends BaseError {
  code = 'E2004';
  messageDict = {
    en: 'Content is too large. Maximum length is 100k characters.',
    'zh-CN': '内容过长。最大长度为 10 万字符。',
  };
}

export class PayloadTooLargeError extends BaseError {
  code = 'E2005';
  messageDict = {
    en: 'Request payload is too large. Maximum size is 100KB.',
    'zh-CN': '请求数据过大。最大大小为 100KB。',
  };
}

export class ConnectionError extends BaseError {
  code = 'E0001';
  messageDict = {
    en: 'Cannot connect to the Usertour server, please try again later.',
    'zh-CN': '无法连接到 Usertour 服务器，请稍后重试。',
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

export class IncorrectVerificationCode extends BaseError {
  code = 'E0009';
  messageDict = {
    en: 'Verification code is incorrect, please try again',
    'zh-CN': '验证码错误，请重试',
  };
}

export class OperationTooFrequent extends BaseError {
  code = 'E0010';
  messageDict = {
    en: 'Operation too frequent, please try again later',
    'zh-CN': '操作过于频繁，请稍后再试',
  };
}

export class AuthenticationExpiredError extends BaseError {
  code = 'E0011';
  messageDict = {
    en: 'Authentication expired, please log in again',
    'zh-CN': '身份验证已过期，请重新登录',
  };
}

export class UnsupportedFileTypeError extends BaseError {
  code = 'E0012';
  messageDict = {
    en: 'This file type is temporarily not supported',
    'zh-CN': '暂不支持该文件类型',
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

export class ContentNotPublishedError extends BaseError {
  code = 'E0014';
  messageDict = {
    en: 'You have reached your Survey questions limit. Please upgrade your Usertour account under Settings → Billing.',
    'zh-CN': '您已经达到了 Survey 问题的限制，请在设置 → 账单中升级您的 Usertour 账户。',
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
    en: 'API key is not scoped to the requested environment',
    'zh-CN': 'API 密钥未授权访问该环境',
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
    en: 'Cannot create an environment with a token restricted to an environment allowlist — the new environment would be outside the token scope and unusable. Use a token scoped to all environments.',
    'zh-CN':
      '使用限定了环境范围的 API 密钥无法创建环境——新建的环境会落在密钥范围之外、无法使用。请改用可访问全部环境的密钥。',
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

export class InvalidCursorPreviousError extends OpenAPIError {
  code = 'E1008';
  statusCode = HttpStatus.BAD_REQUEST;
  messageDict = {
    en: 'Invalid previous cursor parameter',
    'zh-CN': '无效的上一个游标参数',
  };
}

export class InvalidRequestError extends OpenAPIError {
  code = 'E1009';
  statusCode = HttpStatus.BAD_REQUEST;
  messageDict = {
    en: 'Invalid request',
    'zh-CN': '无效的请求',
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

export class InvalidOrderByError extends OpenAPIError {
  code = 'E1016';
  statusCode = HttpStatus.BAD_REQUEST;
  messageDict = {
    en: 'Invalid orderBy parameter.',
    'zh-CN': '无效的排序参数。',
  };
}

/**
 * One structured validation problem. `rule` names the rule family so a client
 * can group or react programmatically:
 *  - `schema`             — the request body doesn't match the write schema;
 *  - `reactive_condition` — a server-evaluated condition in a reactive (client-polled) slot;
 *  - `action_not_allowed` — an action type this content type's slots don't offer;
 *  - `step_shape`         — placement shape / onClick not matching the step kind;
 *  - `reference_target`   — a cross-content reference to a type that can't be targeted;
 *  - `auto_start`         — a start/hide-rule knob the content type doesn't support.
 */
export type ValidationIssue = {
  rule:
    | 'schema'
    | 'reactive_condition'
    | 'action_not_allowed'
    | 'step_shape'
    | 'reference_target'
    | 'auto_start';
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
    en: 'This version can no longer be edited — it is published, or has been superseded by a newer draft. Create a new editable version to make changes.',
    'zh-CN': '该版本不可编辑——它已发布,或已被更新的草稿取代。请创建新的可编辑版本后再修改。',
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

// Create a mapping of error codes to error classes
const errorMap = {
  E0000: UnknownError,
  E0001: ConnectionError,
  E0003: ParamsError,
  E0004: OAuthError,
  E0005: AccountNotFoundError,
  E0006: PasswordIncorrect,
  E0007: EmailAlreadyRegistered,
  E0008: InvalidVerificationSession,
  E0009: IncorrectVerificationCode,
  E0010: OperationTooFrequent,
  E0011: AuthenticationExpiredError,
  E0012: UnsupportedFileTypeError,
  E0013: NoPermissionError,
  E0014: ContentNotPublishedError,
  E0015: TeamMemberLimitError,
  E0016: InvalidLicenseError,
  E0017: LicenseExpiredError,
  E0018: LicenseProjectMismatchError,
  E0019: LicenseDecodeError,
  E1000: InvalidApiKeyError,
  E1001: UserNotFoundError,
  E1002: CompanyNotFoundError,
  E1003: CompanyMembershipNotFoundError,
  E1004: ContentNotFoundError,
  E1005: ContentSessionNotFoundError,
  E1006: InvalidLimitError,
  E1007: InvalidCursorError,
  E1008: InvalidCursorPreviousError,
  E1009: InvalidRequestError,
  E1010: MissingApiKeyError,
  E1013: RateLimitExceededError,
  E1014: ServiceUnavailableError,
  E1015: InvalidScopeError,
  E1016: InvalidOrderByError,
  E1017: ValidationError,
  E1018: SDKAuthenticationError,
  E1022: AttributeDefinitionNotFoundError,
  E1023: ResourceConflictError,
  E1024: EventDefinitionNotFoundError,
  E1025: SegmentNotFoundError,
  E1026: EnvironmentNotFoundError,
  E1027: ContentNotPublishableError,
  E0020: EmailConfigNotSetError,
  E0021: S3ConfigNotSetError,
  E0022: LastEnvironmentCannotBeDeletedError,
  E0023: PrimaryEnvironmentCannotBeDeletedError,
  E0024: UserDisabledError,
  E0025: UserRegistrationDisabledError,
  E0026: SystemAdminAlreadyInitializedError,
  E0027: SystemAdminSetupUnavailableError,
  E0028: SystemAdminSetupRequiredError,
  E0029: InstanceLicenseProjectLimitReachedError,
  E0030: EnvironmentLimitError,
  E0031: TeamMemberAlreadyInvitedError,
  E0032: TeamMemberAlreadyInProjectError,
  E0033: InvitationDeliveryFailedError,
  E0034: TooManyLoginAttemptsError,
  E0035: InvalidTwoFactorCodeError,
  E0036: InvalidRecoveryCodeError,
  E0037: TwoFactorAlreadyEnabledError,
  E0038: TwoFactorNotEnabledError,
  E0039: TooManyTwoFactorAttemptsError,
  E0040: InvalidTwoFactorChallengeError,
  E0041: SystemAdminMustEnable2FAFirstError,
  E0042: TwoFactorEnforcedDisableNotAllowedError,
  E0043: FeatureRequiresLicenseError,
  E0044: TwoFactorEnrollmentRequiredError,
  E0045: WrongInviteAccountError,
  E0046: OAuthOnlyAccountError,
  E0047: InviteSeatExhaustedError,
  E0048: ResourceAlreadyExistsError,
  E0049: VersionNotEditableError,
  E0050: VersionConflictError,
  E0051: SsoRequiredError,
  E0052: SsoRequiresActiveProviderError,
  E0053: SsoAccessDeniedError,
  E0054: EgressUrlNotAllowedError,
  E0055: AiNotConfiguredError,
  E0056: MachineTranslationRequiresPaidPlanError,
  E0057: MachineTranslationFailedError,
  E0058: SigningSecretLimitReachedError,
  E0059: IdentityVerificationRequiresActiveSecretError,
  E0060: MemberEnvironmentNotAllowedError,
};

export function getErrorMessage(code: string, locale: string): string {
  const ErrorClass = errorMap[code];
  if (!ErrorClass) {
    return new UnknownError().getMessage(locale);
  }
  return new ErrorClass().getMessage(locale);
}
