import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import type { Request } from 'express';
import { ContextService } from '../services/context.service';

@Injectable()
export class ContextInterceptor implements NestInterceptor {
    constructor(private readonly _context: ContextService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest<Request>();
        if (!request.auth_data) return next.handle();

        return new Observable(subscriber => {
            const subscription = this._context.run(request.auth_data, () =>
                next.handle().subscribe(subscriber)
            );
            return () => subscription.unsubscribe();
        });
    }
}
