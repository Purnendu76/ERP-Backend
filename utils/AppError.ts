export const HttpStatus = {
  // 1xx Informational
  CONTINUE: 100,
  SWITCHING_PROTOCOLS: 101,
  PROCESSING: 102,
  EARLY_HINTS: 103,

  // 2xx Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NON_AUTHORITATIVE_INFORMATION: 203,
  NO_CONTENT: 204,
  RESET_CONTENT: 205,
  PARTIAL_CONTENT: 206,

  // 3xx Redirection
  MULTIPLE_CHOICES: 300,
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  SEE_OTHER: 303,
  NOT_MODIFIED: 304,
  TEMPORARY_REDIRECT: 307,
  PERMANENT_REDIRECT: 308,

  // 4xx Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  NOT_ACCEPTABLE: 406,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  GONE: 410,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // 5xx Server Errors
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

export type HttpStatusCode = (typeof HttpStatus)[keyof typeof HttpStatus];

export class AppError extends Error {
  statusCode: HttpStatusCode;
  code: string;
  details?: unknown;
  isOperational: boolean;

  constructor(
    message: string,
    statusCode: HttpStatusCode = HttpStatus.INTERNAL_SERVER_ERROR,
    code = "INTERNAL_SERVER_ERROR",
    details?: unknown,
  ) {
    super(message);

    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Object.setPrototypeOf(this, AppError.prototype);

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(
    message = "Bad request",
    code = "BAD_REQUEST",
    details?: unknown,
  ) {
    return new AppError(message, HttpStatus.BAD_REQUEST, code, details);
  }

  static unauthorized(
    message = "Unauthorized",
    code = "UNAUTHORIZED",
    details?: unknown,
  ) {
    return new AppError(message, HttpStatus.UNAUTHORIZED, code, details);
  }

  static forbidden(
    message = "Forbidden",
    code = "FORBIDDEN",
    details?: unknown,
  ) {
    return new AppError(message, HttpStatus.FORBIDDEN, code, details);
  }

  static notFound(
    message = "Resource not found",
    code = "NOT_FOUND",
    details?: unknown,
  ) {
    return new AppError(message, HttpStatus.NOT_FOUND, code, details);
  }

  static conflict(
    message = "Conflict",
    code = "CONFLICT",
    details?: unknown,
  ) {
    return new AppError(message, HttpStatus.CONFLICT, code, details);
  }

  static validation(
    message = "Validation failed",
    code = "VALIDATION_ERROR",
    details?: unknown,
  ) {
    return new AppError(
      message,
      HttpStatus.UNPROCESSABLE_ENTITY,
      code,
      details,
    );
  }

  static tooManyRequests(
    message = "Too many requests",
    code = "TOO_MANY_REQUESTS",
    details?: unknown,
  ) {
    return new AppError(
      message,
      HttpStatus.TOO_MANY_REQUESTS,
      code,
      details,
    );
  }

  static internal(
    message = "Internal server error",
    code = "INTERNAL_SERVER_ERROR",
    details?: unknown,
  ) {
    return new AppError(
      message,
      HttpStatus.INTERNAL_SERVER_ERROR,
      code,
      details,
    );
  }

  static serviceUnavailable(
    message = "Service unavailable",
    code = "SERVICE_UNAVAILABLE",
    details?: unknown,
  ) {
    return new AppError(
      message,
      HttpStatus.SERVICE_UNAVAILABLE,
      code,
      details,
    );
  }
}