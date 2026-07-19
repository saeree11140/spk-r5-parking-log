import {
  Catch,
  HttpException,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';

import { DomainError } from './domain-error';

interface ErrorEnvelope {
  statusCode: number;
  code: string;
  message: string;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { statusCode, body } = this.mapException(exception);

    response.status(statusCode).json(body);
  }

  private mapException(exception: unknown): {
    statusCode: number;
    body: ErrorEnvelope;
  } {
    if (exception instanceof DomainError) {
      return {
        statusCode: exception.statusCode,
        body: {
          statusCode: exception.statusCode,
          code: exception.code,
          message: exception.message,
        },
      };
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const message = this.httpMessage(exception.getResponse());
      return {
        statusCode,
        body: {
          statusCode,
          code: statusCode === 400 ? 'VALIDATION_ERROR' : 'HTTP_ERROR',
          message,
        },
      };
    }

    return {
      statusCode: 500,
      body: {
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    };
  }

  private httpMessage(response: string | object): string {
    if (typeof response === 'string') return response;
    if ('message' in response) {
      const message = response.message;
      if (Array.isArray(message)) return message.join(', ');
      if (typeof message === 'string') return message;
    }
    return 'Request failed';
  }
}
