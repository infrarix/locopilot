'use strict';

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string | undefined;
  readonly extra: Record<string, unknown> | undefined;

  constructor(message: string, statusCode: number, code?: string, extra?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.extra = extra;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): Record<string, unknown> {
    const body: Record<string, unknown> = { error: this.code ?? this.message };
    if (this.extra) Object.assign(body, this.extra);
    return body;
  }
}

/** 401 — Invalid or missing API key */
export class AuthError extends AppError {
  constructor(message = 'Invalid API key') {
    super(message, 401, message);
  }
}

/** 429 — Rate limit exceeded */
export class RateLimitError extends AppError {
  constructor(retryAfterSeconds: number) {
    super('Rate limit exceeded', 429, 'rate_limit_exceeded', { retryAfterSeconds });
  }
}

/** 400 — Bad request / validation failure */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, message);
  }
}

/** 503 — All providers unavailable */
export class ProviderError extends AppError {
  constructor() {
    super('All providers unavailable', 503, 'providers_unavailable');
  }
}

/** 404 — Resource not found */
export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, `${resource.toLowerCase()}_not_found`);
  }
}
