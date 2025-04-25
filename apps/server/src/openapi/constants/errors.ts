type ErrorCode =
  | 'internal_server_error'
  | 'invalid_request'
  | 'forbidden'
  | 'not_found'
  | 'method_not_allowed'
  | 'not_acceptable'
  | 'unsupported_media_type'
  | 'rate_limit_exceeded'
  | 'service_unavailable'
  | 'invalid_api_key'
  | 'user_not_found'
  | 'company_not_found'
  | 'company_membership_not_found'
  | 'invalid_limit'
  | 'invalid_cursor'
  | 'invalid_cursor_previous';

export const OpenAPIErrors = {
  USER: {
    NOT_FOUND: {
      code: 'user_not_found' as ErrorCode,
      message: 'User not found',
    },
    INVALID_LIMIT: {
      code: 'invalid_limit' as ErrorCode,
      message: 'Invalid limit parameter',
    },
    INVALID_CURSOR: {
      code: 'invalid_cursor' as ErrorCode,
      message: 'Invalid cursor parameter',
    },
    INVALID_CURSOR_PREVIOUS: {
      code: 'invalid_cursor_previous' as ErrorCode,
      message: 'Invalid previous cursor parameter',
    },
    INVALID_REQUEST: {
      code: 'invalid_request' as ErrorCode,
      message: 'Only one of companies or memberships can be set',
    },
  },
  COMPANY: {
    NOT_FOUND: {
      code: 'company_not_found' as ErrorCode,
      message: 'Company not found',
    },
    INVALID_LIMIT: {
      code: 'invalid_limit' as ErrorCode,
      message: 'Invalid limit parameter',
    },
    INVALID_CURSOR: {
      code: 'invalid_cursor' as ErrorCode,
      message: 'Invalid cursor parameter',
    },
    INVALID_CURSOR_PREVIOUS: {
      code: 'invalid_cursor_previous' as ErrorCode,
      message: 'Invalid previous cursor parameter',
    },
    INVALID_REQUEST: {
      code: 'invalid_request' as ErrorCode,
      message: 'Only one of members or memberships can be set',
    },
  },
  COMPANY_MEMBERSHIP: {
    NOT_FOUND: {
      code: 'company_membership_not_found' as ErrorCode,
      message: 'Company membership not found',
    },
  },
  AUTH: {
    INVALID_API_KEY: {
      code: 'invalid_api_key' as ErrorCode,
      message: 'Invalid API key provided',
    },
  },
  COMMON: {
    INTERNAL_SERVER_ERROR: {
      code: 'internal_server_error' as ErrorCode,
      message: 'An unexpected error occurred',
    },
    INVALID_REQUEST: {
      code: 'invalid_request' as ErrorCode,
      message: 'Invalid request',
    },
    FORBIDDEN: {
      code: 'forbidden' as ErrorCode,
      message: 'Forbidden',
    },
    NOT_FOUND: {
      code: 'not_found' as ErrorCode,
      message: 'Not found',
    },
    METHOD_NOT_ALLOWED: {
      code: 'method_not_allowed' as ErrorCode,
      message: 'Method not allowed',
    },
    NOT_ACCEPTABLE: {
      code: 'not_acceptable' as ErrorCode,
      message: 'Not acceptable',
    },
    UNSUPPORTED_MEDIA_TYPE: {
      code: 'unsupported_media_type' as ErrorCode,
      message: 'Unsupported media type',
    },
    RATE_LIMIT_EXCEEDED: {
      code: 'rate_limit_exceeded' as ErrorCode,
      message: 'Too many requests',
    },
    SERVICE_UNAVAILABLE: {
      code: 'service_unavailable' as ErrorCode,
      message: 'Service unavailable',
    },
  },
} as const;
