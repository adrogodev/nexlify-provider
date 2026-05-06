import { ClientErrorResponse } from 'src/core/domain/models/client-error-response.model';
import {
    ActionNotAllowedException,
    AlreadyExistsException,
    NotFoundException,
    NotMatchException,
    UnauthenticatedException,
    UnauthorizedException,
    ValidationException,
} from 'src/core/domain/exceptions';

export interface ExceptionHandlerResponse {
    statusCode: number;
    response: ClientErrorResponse;
}

export class ExceptionHandler {
    public run(err: Error): ExceptionHandlerResponse {
        const response = new ClientErrorResponse({
            ok: false,
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Error interno en el servidor',
        });

        if (err instanceof ValidationException) {
            return {
                statusCode: 400,
                response: new ClientErrorResponse({
                    ok: false,
                    code: err.code,
                    message: err.message,
                    errors: err.errors,
                }),
            };
        }

        if (err instanceof NotFoundException) {
            return { statusCode: 404, response: new ClientErrorResponse({ ok: false, code: err.code, message: err.message }) };
        }

        if (err instanceof AlreadyExistsException) {
            return { statusCode: 409, response: new ClientErrorResponse({ ok: false, code: err.code, message: err.message }) };
        }

        if (err instanceof UnauthenticatedException) {
            return { statusCode: 401, response: new ClientErrorResponse({ ok: false, code: err.code, message: err.message }) };
        }

        if (err instanceof UnauthorizedException) {
            return { statusCode: 403, response: new ClientErrorResponse({ ok: false, code: err.code, message: err.message }) };
        }

        if (err instanceof ActionNotAllowedException) {
            return { statusCode: 403, response: new ClientErrorResponse({ ok: false, code: err.code, message: err.message }) };
        }

        if (err instanceof NotMatchException) {
            return { statusCode: 400, response: new ClientErrorResponse({ ok: false, code: err.code, message: err.message }) };
        }

        return { statusCode: 500, response };
    }
}
