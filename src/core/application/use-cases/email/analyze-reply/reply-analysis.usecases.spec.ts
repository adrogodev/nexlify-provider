import { EmailMapper } from 'src/core/application/mappers';
import {
    AiIntentEnum,
    AiSentimentEnum,
    EmailDirectionEnum,
    EmailStateEnum,
} from 'src/core/domain/enum';
import {
    NotFoundException,
    NotMatchException,
    ServiceUnavailableException,
} from 'src/core/domain/exceptions';
import { ReplyWebhookFanOutService } from '../services/reply-webhook-fanout.service';
import { toAiAnalysisDTO } from './ai-analysis.dto';
import {
    AnalyzeEmailUseCase,
    GetAiStatusUseCase,
} from './analyze-email.usecase';
import { ReplyAnalysisService, stripHtml } from './reply-analysis.service';

const parent = {
    id_email: 10n,
    email_uuid: '11111111-1111-4111-8111-111111111111',
    short_code: 'NX-PARENT1',
    id_client: 70n,
    from_email: 'cobros@empresa.co',
    to_email: 'cliente@test.local',
    subject: 'Recordatorio de pago',
    body_html: null,
    body_text: 'Su factura vence',
    state: EmailStateEnum.SENT,
    attempts: 1,
    next_retry_at: null,
    sent_at: new Date('2026-11-01T00:00:00Z'),
    created_at: new Date('2026-11-01T00:00:00Z'),
    updated_at: null,
    message_id: '<parent@server.local>',
    direction: EmailDirectionEnum.SENT,
    parent_email_id: null,
};

const reply = (overrides: Record<string, unknown> = {}) => ({
    ...parent,
    id_email: 20n,
    email_uuid: '22222222-2222-4222-8222-222222222222',
    short_code: 'NX-REPLY01',
    from_email: 'Cliente@Test.local',
    to_email: 'cobros@empresa.co',
    subject: 'RE: Recordatorio de pago',
    body_text:
        'Pago el viernes 7 de noviembre los $1.200.000 de la factura FE-1001',
    state: EmailStateEnum.RECEIVED,
    direction: EmailDirectionEnum.RECEIVED,
    parent_email_id: 10n,
    created_at: new Date('2026-11-02T00:00:00Z'),
    ...overrides,
});

const analysisResult = (
    intent: AiIntentEnum = AiIntentEnum.PAYMENT_PROMISE,
) => ({
    intent,
    sentiment: AiSentimentEnum.POSITIVE,
    summary: 'El cliente promete pagar el viernes.',
    entities: {
        dates: ['viernes 7 de noviembre'],
        amounts: ['$1.200.000'],
        references: ['FE-1001'],
    },
});

const subscription = (overrides: Record<string, unknown> = {}) => ({
    id_subscription: 1n,
    subscription_uuid: '44444444-4444-4444-8444-444444444444',
    id_client: 70n,
    id_webhook_endpoint: 900n,
    events: 'RECEIVED_REPLY',
    include_body: false,
    include_dates: false,
    include_sender: false,
    include_recipients: false,
    include_attachments: false,
    include_ai_analysis: true,
    is_active: true,
    created_at: null,
    updated_at: null,
    ...overrides,
});

const build = (
    opts: {
        enabled?: boolean;
        analyzeImpl?: () => Promise<unknown>;
        subscriptions?: unknown[];
    } = {},
) => {
    const analyzer = {
        isEnabled: jest.fn(() => opts.enabled ?? true),
        model: jest.fn(() => 'claude-opus-5-5'),
        analyze: jest.fn(opts.analyzeImpl ?? (async () => analysisResult())),
    };
    const emailsRepo = { update: jest.fn(async () => null) };
    const suppressionsRepo = { addUnsubscribe: jest.fn(async () => true) };
    const deliveriesRepo = { create: jest.fn(async (row: unknown) => row) };
    const fanOut = new ReplyWebhookFanOutService(
        { findByEmail: jest.fn(async () => []) } as never,
        {
            findActiveByClientIdAndEvent: jest.fn(
                async () => opts.subscriptions ?? [subscription()],
            ),
        } as never,
        deliveriesRepo as never,
    );
    const errors: string[] = [];
    const service = new ReplyAnalysisService(
        analyzer as never,
        emailsRepo as never,
        suppressionsRepo as never,
        fanOut,
        (message) => errors.push(message),
    );
    return {
        service,
        analyzer,
        emailsRepo,
        suppressionsRepo,
        deliveriesRepo,
        errors,
    };
};

describe('ReplyAnalysisService', () => {
    it('sends the reply text to the analyzer and stores intent, sentiment, summary, entities and timestamp', async () => {
        const { service, analyzer, emailsRepo } = build();

        const result = await service.analyze(reply() as never);

        expect(analyzer.analyze).toHaveBeenCalledWith({
            subject: 'RE: Recordatorio de pago',
            text: 'Pago el viernes 7 de noviembre los $1.200.000 de la factura FE-1001',
        });
        const [id, patch] = emailsRepo.update.mock.calls[0] as unknown as [
            bigint,
            Record<string, unknown>,
        ];
        expect(id).toBe(20n);
        expect(patch).toMatchObject({
            ai_intent: 'PAYMENT_PROMISE',
            ai_sentiment: 'POSITIVE',
            ai_summary: 'El cliente promete pagar el viernes.',
            ai_data: JSON.stringify(analysisResult().entities),
        });
        expect(patch.ai_analyzed_at).toBeInstanceOf(Date);
        expect(result).toMatchObject({
            intent: 'PAYMENT_PROMISE',
            entities: analysisResult().entities,
        });
    });

    it('falls back to the stripped HTML body when the reply has no text part', async () => {
        const { service, analyzer } = build();

        await service.analyze(
            reply({
                body_text: null,
                body_html:
                    '<div>Quiero <b>darme de baja</b></div><style>p{}</style>',
            }) as never,
        );

        expect(analyzer.analyze).toHaveBeenCalledWith(
            expect.objectContaining({ text: 'Quiero darme de baja' }),
        );
    });

    it('suppresses the sender on UNSUBSCRIBE_REQUEST', async () => {
        const { service, suppressionsRepo } = build({
            analyzeImpl: async () =>
                analysisResult(AiIntentEnum.UNSUBSCRIBE_REQUEST),
        });

        await service.analyze(reply() as never);

        expect(suppressionsRepo.addUnsubscribe).toHaveBeenCalledWith(
            expect.objectContaining({
                id_client: 70n,
                email: 'Cliente@Test.local',
                source_email_id: 20n,
            }),
        );
    });

    it('does not suppress for any other intent', async () => {
        const { service, suppressionsRepo } = build();

        await service.analyze(reply() as never);

        expect(suppressionsRepo.addUnsubscribe).not.toHaveBeenCalled();
    });

    it('after ingestion enqueues RECEIVED_REPLY with ai_analysis for subscriptions that include it', async () => {
        const { service, deliveriesRepo } = build({
            subscriptions: [
                subscription(),
                subscription({
                    id_webhook_endpoint: 901n,
                    include_ai_analysis: false,
                }),
            ],
        });

        await service.analyzeAndFanOut(reply() as never, parent as never);

        expect(deliveriesRepo.create).toHaveBeenCalledTimes(2);
        const withAi = JSON.parse(
            (
                deliveriesRepo.create.mock.calls[0] as unknown as [
                    { payload: string },
                ]
            )[0].payload,
        );
        const withoutAi = JSON.parse(
            (
                deliveriesRepo.create.mock.calls[1] as unknown as [
                    { payload: string },
                ]
            )[0].payload,
        );
        expect(withAi.ai_analysis).toMatchObject({
            intent: 'PAYMENT_PROMISE',
            sentiment: 'POSITIVE',
            entities: { references: ['FE-1001'] },
        });
        expect(withoutAi).not.toHaveProperty('ai_analysis');
    });

    it('still fans out (ai_analysis null) and logs when the analysis fails, never rejecting', async () => {
        const { service, deliveriesRepo, emailsRepo, errors } = build({
            analyzeImpl: async () => {
                throw new Error('provider down');
            },
        });

        await expect(
            service.analyzeAndFanOut(reply() as never, parent as never),
        ).resolves.toBeUndefined();

        expect(emailsRepo.update).not.toHaveBeenCalled();
        expect(deliveriesRepo.create).toHaveBeenCalledTimes(1);
        expect(
            JSON.parse(
                (
                    deliveriesRepo.create.mock.calls[0] as unknown as [
                        { payload: string },
                    ]
                )[0].payload,
            ).ai_analysis,
        ).toBeNull();
        expect(errors[0]).toContain('NX-REPLY01');
    });

    it('stripHtml removes tags, scripts and entities', () => {
        expect(
            stripHtml('<p>Hola&nbsp;<b>mundo</b></p><script>x()</script>'),
        ).toBe('Hola mundo');
    });
});

describe('AnalyzeEmailUseCase', () => {
    const buildUseCase = (
        opts: {
            email?: unknown;
            enabled?: boolean;
            idUser?: number;
            fails?: boolean;
        } = {},
    ) => {
        const { service } = build({
            enabled: opts.enabled ?? true,
            analyzeImpl: opts.fails
                ? async () => {
                      throw new Error('boom');
                  }
                : undefined,
        });
        const emailsRepo = {
            findByUuidOrShortCode: jest.fn(async () =>
                opts.email === undefined ? reply() : opts.email,
            ),
        };
        const context = {
            get: () => ({ id_user: opts.idUser ?? 70, is_admin: false }),
        };
        return new AnalyzeEmailUseCase(
            context as never,
            emailsRepo as never,
            service,
        );
    };

    it('re-runs the analysis of an own RECEIVED reply', async () => {
        await expect(
            buildUseCase().run({ data: 'NX-REPLY01' }),
        ).resolves.toMatchObject({ intent: 'PAYMENT_PROMISE' });
    });

    it('rejects non RECEIVED emails with 400', async () => {
        await expect(
            buildUseCase({ email: parent }).run({ data: 'NX-PARENT1' }),
        ).rejects.toBeInstanceOf(NotMatchException);
    });

    it('answers 503 "Análisis IA deshabilitado" without a key', async () => {
        const promise = buildUseCase({ enabled: false }).run({
            data: 'NX-REPLY01',
        });

        await expect(promise).rejects.toBeInstanceOf(
            ServiceUnavailableException,
        );
        await expect(promise).rejects.toThrow('Análisis IA deshabilitado');
    });

    it('maps provider failures to 503', async () => {
        await expect(
            buildUseCase({ fails: true }).run({ data: 'NX-REPLY01' }),
        ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('hides another client email behind 404', async () => {
        await expect(
            buildUseCase({ idUser: 99 }).run({ data: 'NX-REPLY01' }),
        ).rejects.toBeInstanceOf(NotFoundException);
    });
});

describe('GetAiStatusUseCase', () => {
    it.each([true, false])(
        'reports enabled=%s and the configured model',
        async (enabled) => {
            const useCase = new GetAiStatusUseCase({
                isEnabled: () => enabled,
                model: () => 'claude-opus-5-5',
            } as never);

            await expect(useCase.run({ data: null })).resolves.toEqual({
                enabled,
                model: 'claude-opus-5-5',
            });
        },
    );
});

describe('AI analysis exposure', () => {
    it('detail exposes ai_analysis and the list item exposes ai_intent once analyzed', () => {
        const analyzed = reply({
            ai_intent: 'PAYMENT_PROMISE',
            ai_sentiment: 'POSITIVE',
            ai_summary: 'Promete pagar',
            ai_data: JSON.stringify({
                dates: ['viernes'],
                amounts: [],
                references: ['FE-1001'],
            }),
            ai_analyzed_at: new Date('2026-11-02T00:00:05Z'),
        });

        expect(
            EmailMapper.mapEmailDetail(analyzed as never, []).ai_analysis,
        ).toEqual({
            intent: 'PAYMENT_PROMISE',
            sentiment: 'POSITIVE',
            summary: 'Promete pagar',
            entities: {
                dates: ['viernes'],
                amounts: [],
                references: ['FE-1001'],
            },
            analyzed_at: new Date('2026-11-02T00:00:05Z'),
        });
        expect(EmailMapper.mapEmailListItem(analyzed as never).ai_intent).toBe(
            'PAYMENT_PROMISE',
        );
    });

    it('is null for emails never analyzed', () => {
        expect(toAiAnalysisDTO(parent as never)).toBeNull();
        expect(
            EmailMapper.mapEmailListItem(parent as never).ai_intent,
        ).toBeNull();
    });
});
