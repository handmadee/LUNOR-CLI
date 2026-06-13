/**
 * HTTP Exception Classes
 * 
 * Custom exception classes for HTTP error handling.
 */

export class HttpException extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'HttpException';
  }
}

export class BadRequestException extends HttpException {
  constructor(message: string = 'Bad request') {
    super(400, message, 'BAD_REQUEST');
  }
}

export class UnauthorizedException extends HttpException {
  constructor(message: string = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ForbiddenException extends HttpException {
  constructor(message: string = 'Forbidden') {
    super(403, message, 'FORBIDDEN');
  }
}

export class NotFoundException extends HttpException {
  constructor(message: string = 'Not found') {
    super(404, message, 'NOT_FOUND');
  }
}

export class InternalServerException extends HttpException {
  constructor(message: string = 'Internal server error') {
    super(500, message, 'INTERNAL_ERROR');
  }
}
