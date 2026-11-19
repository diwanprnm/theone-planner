import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}

/**
 * Bentuk galat yang seragam untuk seluruh API. Galat tak terduga tidak
 * membocorkan detail internal ke klien, tetapi tetap dicatat di log server.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const body: ErrorBody = {
      statusCode: status,
      message: isHttp ? extractMessage(exception) : 'Terjadi kesalahan pada server',
      error: isHttp ? exception.name : 'InternalServerError',
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json(body);
  }
}

function extractMessage(exception: HttpException): string | string[] {
  const payload = exception.getResponse();

  if (typeof payload === 'string') {
    return payload;
  }

  const message = (payload as { message?: string | string[] }).message;
  return message ?? exception.message;
}
