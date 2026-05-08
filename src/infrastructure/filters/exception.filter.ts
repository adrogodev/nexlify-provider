import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException } from '@nestjs/common';
import type { Response } from 'express';
import { ClientErrorResponse } from 'src/core/domain/models/client-error-response.model';
import { ExceptionHandler } from 'src/infrastructure/handler/exception.handler';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly _handler = new ExceptionHandler();

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse<Response>();

        if (exception instanceof HttpException) {
            const status = exception.getStatus();
            const body = exception.getResponse();
            const message = typeof body === 'object' && 'message' in body
                ? (Array.isArray((body as any).message) ? (body as any).message[0] : (body as any).message)
                : exception.message;

            res.status(status).json(
                new ClientErrorResponse({ ok: false, code: 'HTTP_ERROR', message: String(message) }),
            );
            return;
        }

        if (exception instanceof Error) {
            console.error('[GlobalExceptionFilter]', exception.message, exception);
            const { statusCode, response } = this._handler.run(exception);
            res.status(statusCode).json(response);
            return;
        }

        console.error('[GlobalExceptionFilter] Unknown exception', exception);
        res.status(500).json(
            new ClientErrorResponse({ ok: false, code: 'INTERNAL_SERVER_ERROR', message: 'Error interno en el servidor' }),
        );
    }
}
