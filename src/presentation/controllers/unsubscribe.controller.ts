import { Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { UnsubscribeUseCase } from 'src/core/application/use-cases/suppressions';
import { ClientResponse } from 'src/core/domain/models';
import {
    UNSUBSCRIBE_PAGE_CSP,
    renderUnsubscribeConfirmPage,
    renderUnsubscribeDonePage,
    renderUnsubscribeInvalidPage,
} from '../views/unsubscribe.view';

/**
 * Public signed unsubscribe link (S5). GET renders a confirmation page with a
 * form POST; POST is the RFC 8058 one-click target (mail clients POST
 * `List-Unsubscribe=One-Click`). No auth guard: the HMAC token is the access
 * control. Pages carry their own strict CSP (no scripts).
 */
@Controller('api/unsubscribe')
export class UnsubscribeController {
    constructor(private readonly _unsubscribeUseCase: UnsubscribeUseCase) {}

    @Get(':token')
    async page(
        @Param('token') token: string,
        @Res() res: Response,
    ): Promise<void> {
        const payload = await this._unsubscribeUseCase.preview(token);
        if (payload === null) {
            this.#html(res, 400, renderUnsubscribeInvalidPage());
            return;
        }
        this.#html(res, 200, renderUnsubscribeConfirmPage(payload.email));
    }

    @Post(':token')
    async confirm(
        @Param('token') token: string,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        const wantsJson = (req.headers['accept'] ?? '').includes(
            'application/json',
        );

        const payload = await this._unsubscribeUseCase.preview(token);
        if (payload === null) {
            if (wantsJson) {
                res.status(400).json({
                    ok: false,
                    code: 'NOT_FOUND',
                    message: 'Enlace de desuscripcion invalido',
                });
                return;
            }
            this.#html(res, 400, renderUnsubscribeInvalidPage());
            return;
        }

        const result = await this._unsubscribeUseCase.run({ data: token });
        if (wantsJson) {
            res.status(200).json(
                new ClientResponse({
                    ok: true,
                    message: 'Suscripcion cancelada',
                    data: result,
                }),
            );
            return;
        }
        this.#html(res, 200, renderUnsubscribeDonePage(result.email));
    }

    #html(res: Response, status: number, html: string): void {
        res.status(status)
            .setHeader('Content-Security-Policy', UNSUBSCRIBE_PAGE_CSP)
            .setHeader('Cache-Control', 'no-store')
            .type('html')
            .send(html);
    }
}
