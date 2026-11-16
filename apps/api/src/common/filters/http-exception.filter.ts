import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponse } from '@mess/shared';

/**
 * Global HTTP exception filter that formats all API errors consistently
 * and ensures internal server stack traces never leak to clients.
 */
@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected server error occurred';
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
        errorCode = exception.name;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        message = (resObj.message as string) || exception.message;
        errorCode = (resObj.error as string) || (resObj.errorCode as string) || exception.name;
        if (resObj.details) {
          details = resObj.details as Record<string, unknown>;
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
    }

    const payload: ApiErrorResponse = {
      statusCode: status,
      errorCode: String(errorCode).toUpperCase().replace(/\s+/g, '_'),
      message: Array.isArray(message) ? message.join('; ') : String(message),
      details,
      timestamp: new Date().toISOString(),
      path: request.url
    };

    response.status(status).json(payload);
  }
}
