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
    en: 'Email already registered, please sign in or try another one',
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
    en: 'Authentication expired, please sign in again',
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

export class ContentNotPublishedError extends BaseError {
  code = 'E0014';
  messageDict = {
    en: 'You have reached your Survey questions limit. Please upgrade your Usertour account under Settings → Billing.',
    'zh-CN': '您已经达到了 Survey 问题的限制，请在设置 → 账单中升级您的 Usertour 账户。',
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
};

export function getErrorMessage(code: string, locale: string): string {
  const ErrorClass = errorMap[code];
  if (!ErrorClass) {
    return new UnknownError().getMessage(locale);
  }
  return new ErrorClass().getMessage(locale);
}
