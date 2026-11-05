const parseMock = jest.fn();

jest.mock('@anthropic-ai/sdk', () => {
    const actual = jest.requireActual('@anthropic-ai/sdk');
    const FakeAnthropic = jest
        .fn()
        .mockImplementation(() => ({ messages: { parse: parseMock } }));
    Object.assign(FakeAnthropic, {
        APIError: actual.APIError,
        RateLimitError: actual.RateLimitError,
    });
    return { __esModule: true, default: FakeAnthropic };
});

import Anthropic from '@anthropic-ai/sdk';
import {
    ClaudeReplyAnalyzerService,
    MAX_REPLY_CHARS,
    buildReplyUserMessage,
} from './claude-reply-analyzer.service';

const parsedOutput = {
    intent: 'QUESTION',
    sentiment: 'NEUTRAL',
    summary: '  El cliente pregunta por la fecha de corte. ',
    entities: {
        dates: ['15 de noviembre'],
        amounts: [],
        references: ['FE-77'],
    },
};

describe('ClaudeReplyAnalyzerService', () => {
    beforeEach(() => {
        parseMock.mockReset();
        (Anthropic as unknown as jest.Mock).mockClear();
    });

    it('is disabled without an API key and never builds a client', async () => {
        const analyzer = new ClaudeReplyAnalyzerService(
            undefined,
            'claude-opus-5-5',
        );

        expect(analyzer.isEnabled()).toBe(false);
        await expect(
            analyzer.analyze({ subject: 's', text: 't' }),
        ).rejects.toThrow('Análisis IA deshabilitado');
        expect(Anthropic).not.toHaveBeenCalled();
    });

    it('calls messages.parse with structured output, low effort and the reply delimited as untrusted data', async () => {
        parseMock.mockResolvedValue({
            stop_reason: 'end_turn',
            parsed_output: parsedOutput,
        });
        const analyzer = new ClaudeReplyAnalyzerService(
            'sk-test',
            'claude-opus-5-5',
        );

        const result = await analyzer.analyze({
            subject: 'RE: Factura',
            text: '¿Cuál es la fecha de corte?',
        });

        expect(Anthropic).toHaveBeenCalledWith({
            apiKey: 'sk-test',
            timeout: 30_000,
            maxRetries: 2,
        });
        const request = parseMock.mock.calls[0][0];
        expect(request.model).toBe('claude-opus-5-5');
        expect(request.max_tokens).toBe(2048);
        expect(request.output_config.effort).toBe('low');
        expect(request.output_config.format).toBeDefined();
        expect(request).not.toHaveProperty('temperature');
        expect(request).not.toHaveProperty('thinking');
        expect(request.system).toContain('NO CONFIABLE');
        expect(request.messages[0].content).toContain(
            '<reply_body>\n¿Cuál es la fecha de corte?\n</reply_body>',
        );
        expect(result).toEqual({
            ...parsedOutput,
            summary: 'El cliente pregunta por la fecha de corte.',
        });
    });

    it('treats a refusal as a failure', async () => {
        parseMock.mockResolvedValue({
            stop_reason: 'refusal',
            parsed_output: null,
        });

        await expect(
            new ClaudeReplyAnalyzerService('sk-test').analyze({
                subject: 's',
                text: 't',
            }),
        ).rejects.toThrow('declinó');
    });

    it('treats a null parsed_output as a failure', async () => {
        parseMock.mockResolvedValue({
            stop_reason: 'max_tokens',
            parsed_output: null,
        });

        await expect(
            new ClaudeReplyAnalyzerService('sk-test').analyze({
                subject: 's',
                text: 't',
            }),
        ).rejects.toThrow('análisis válido');
    });

    it('classifies typed SDK errors without string matching', async () => {
        parseMock.mockRejectedValueOnce(
            new Anthropic.RateLimitError(429, undefined, 'rate', new Headers()),
        );
        parseMock.mockRejectedValueOnce(
            new Anthropic.APIError(500, undefined, 'boom', new Headers()),
        );
        const analyzer = new ClaudeReplyAnalyzerService('sk-test');

        await expect(
            analyzer.analyze({ subject: 's', text: 't' }),
        ).rejects.toThrow('Límite de tasa');
        await expect(
            analyzer.analyze({ subject: 's', text: 't' }),
        ).rejects.toThrow('HTTP 500');
    });

    it('truncates very long replies with a note', () => {
        const message = buildReplyUserMessage({
            subject: 's',
            text: 'x'.repeat(MAX_REPLY_CHARS + 50),
        });

        expect(message).toContain(`truncado a ${MAX_REPLY_CHARS} caracteres`);
        expect(message.match(/x/g)?.length).toBe(MAX_REPLY_CHARS);
    });
});
