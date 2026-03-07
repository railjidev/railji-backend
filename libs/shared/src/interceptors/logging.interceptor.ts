import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, body, query, params } = request;

    // Skip logging for health check endpoints
    if (url.includes('/health')) {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;

        this.logger.log(
          `${method} ${url} - ${statusCode} - ${duration}ms`,
          'HTTP Request',
        );

        // Log only on development or for debugging
        if (process.env.NODE_ENV === 'development') {
          this.logger.debug(
            JSON.stringify({
              method,
              url,
              statusCode,
              duration,
              query,
              params,
              //body: this.sanitizeBody(body),
            }, null, 2)
          );
        }
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode || 500;

        this.logger.error(
          `${method} ${url} - ${statusCode} - ${duration}ms - ${error.message}`,
          error.stack,
          'HTTP Request',
        );

        return throwError(() => error);
      }),
    );
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;

    const sensitiveFields = ['password', 'token', 'secret', 'authorization'];
    const cloned = { ...body };

    sensitiveFields.forEach((field) => {
      if (cloned[field]) {
        cloned[field] = '***REDACTED***';
      }
    });

    return cloned;
  }
}
