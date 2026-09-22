export type ErrorCode =
  | 'NOT_FOUND'
  | 'INVALID_TRANSITION'
  | 'WIPE_REQUIRED'
  | 'WIPE_FIELDS_REQUIRED'
  | 'DUPLICATE_ACTIVE_LEASE'
  | 'DEVICE_NOT_AVAILABLE'
  | 'NO_ITEMS'
  | 'VALIDATION'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'INVALID_TOKEN'
  | 'MAIL_NOT_CONFIGURED'
  | 'INTERNAL';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  NOT_FOUND: 404,
  INVALID_TRANSITION: 409,
  WIPE_REQUIRED: 409,
  WIPE_FIELDS_REQUIRED: 400,
  DUPLICATE_ACTIVE_LEASE: 409,
  DEVICE_NOT_AVAILABLE: 409,
  NO_ITEMS: 422,
  VALIDATION: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  INVALID_TOKEN: 401,
  MAIL_NOT_CONFIGURED: 503,
  INTERNAL: 500,
};

const DEFAULT_MESSAGE_BY_CODE: Record<ErrorCode, string> = {
  NOT_FOUND: 'Not found.',
  INVALID_TRANSITION: 'That device cannot move to that status from its current status.',
  WIPE_REQUIRED:
    'This device needs a recorded wipe (method, date, operator) before it can become available.',
  WIPE_FIELDS_REQUIRED: 'Wipe method, date, and operator are all required to record a wipe.',
  DUPLICATE_ACTIVE_LEASE: 'This family already has an active lease.',
  DEVICE_NOT_AVAILABLE: 'That device is not available to lease.',
  NO_ITEMS: 'This donation has no received items yet.',
  VALIDATION: 'Missing or invalid input.',
  UNAUTHENTICATED: 'Sign in to continue.',
  FORBIDDEN: 'You are not authorized to do that.',
  INVALID_TOKEN: 'That sign-in link is invalid or has expired.',
  MAIL_NOT_CONFIGURED: 'Outbound email is not configured. Contact your administrator.',
  INTERNAL: 'Something went wrong.',
};

export class AppError extends Error {
  code: ErrorCode;
  status: number;

  constructor(code: ErrorCode, message?: string) {
    super(message ?? DEFAULT_MESSAGE_BY_CODE[code]);
    this.name = 'AppError';
    this.code = code;
    this.status = STATUS_BY_CODE[code];
  }
}

export function errorMessageForCode(code: string): string {
  return (DEFAULT_MESSAGE_BY_CODE as Record<string, string>)[code] ?? DEFAULT_MESSAGE_BY_CODE.INTERNAL;
}

export function errorEnvelope(err: unknown): {
  status: number;
  body: { error: { code: string; message: string } };
} {
  if (err instanceof AppError) {
    return { status: err.status, body: { error: { code: err.code, message: err.message } } };
  }
  return { status: 500, body: { error: { code: 'INTERNAL', message: DEFAULT_MESSAGE_BY_CODE.INTERNAL } } };
}
