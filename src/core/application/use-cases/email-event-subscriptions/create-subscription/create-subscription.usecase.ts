import type { IRequestContext } from "src/core/application/contracts/infrastructure";
import type { IEmailEventSubscriptionsRepository, IWebhookEndpointsRepository } from "src/core/application/contracts/persistence";
import { ActionNotAllowedException, NotFoundException, ValidationException } from "src/core/domain/exceptions";
import { EmailEventEnum } from "src/core/domain/enum";
import { UseCase, UseCaseArgs } from "src/core/domain/models";
import type { WebhookEndpoint } from "src/core/domain/entities/webhook-endpoint.entity";
import type { CreateSubscriptionInput } from "./create-subscription.request-data";
import { toSubscriptionDTO, type SubscriptionDTO } from "../to-subscription.dto";

/** S1 defaults for every field the caller does not set. */
const INCLUDED_FIELDS_DEFAULTS = {
    include_body: false,
    include_dates: true,
    include_sender: true,
    include_recipients: true,
    include_attachments: false,
} as const;

/**
 * Subscribes a client to the email events that will fan out through the
 * existing webhook pipeline (S4). Non-admin clients can only subscribe
 * their OWN active endpoints; admins may point to any client's endpoint,
 * and the subscription's client becomes the requested id_client.
 */
export class CreateSubscriptionUseCase implements UseCase<CreateSubscriptionInput, SubscriptionDTO> {
    constructor(
        private readonly _context: IRequestContext,
        private readonly _webhookEndpointsRepository: IWebhookEndpointsRepository,
        private readonly _emailEventSubscriptionsRepository: IEmailEventSubscriptionsRepository,
    ) { }

    public run = async (args: UseCaseArgs<CreateSubscriptionInput>): Promise<SubscriptionDTO> => {
        const auth = this._context.get();
        const authIsAdmin = auth?.is_admin === true;

        let id_client: bigint;
        const requested = args.data.id_client;
        if (requested !== undefined && requested !== null) {
            if (!authIsAdmin) {
                throw new ActionNotAllowedException('Solo un administrador puede suscribir eventos para otro cliente');
            }
            id_client = BigInt(requested);
        } else {
            if (auth === null || auth === undefined) {
                throw new ActionNotAllowedException('Sesion no valida para suscribir eventos');
            }
            id_client = BigInt(auth!.id_user);
        }

        const endpoint = await this.#resolveActiveAuthorizedEndpoint(args.data.webhook_endpoint_uuid, auth === null || auth === undefined ? null : BigInt(auth!.id_user), authIsAdmin);

        const events = this.#validatedEvents(args.data.events ?? []);

        const created = await this._emailEventSubscriptionsRepository.create({
            id_client,
            id_webhook_endpoint: endpoint.id_endpoint,
            events,
            include_body: args.data.include_body ?? INCLUDED_FIELDS_DEFAULTS.include_body,
            include_dates: args.data.include_dates ?? INCLUDED_FIELDS_DEFAULTS.include_dates,
            include_sender: args.data.include_sender ?? INCLUDED_FIELDS_DEFAULTS.include_sender,
            include_recipients: args.data.include_recipients ?? INCLUDED_FIELDS_DEFAULTS.include_recipients,
            include_attachments: args.data.include_attachments ?? INCLUDED_FIELDS_DEFAULTS.include_attachments,
            is_active: true,
        });

        return toSubscriptionDTO(created);
    };

    /**
     * Non-admin clients can only subscribe their OWN active endpoints; admins
     * may point to any active endpoint of any client. The endpoint itself is
     * always owned by its row client; the subscription's id_client may differ
     * only in the admin override flow.
     */
    async #resolveActiveAuthorizedEndpoint(endpointUuid: string, authId: bigint | null, authIsAdmin: boolean): Promise<WebhookEndpoint> {
        const endpoint = await this._webhookEndpointsRepository.findByUuid(endpointUuid);
        if (endpoint === null) {
            throw new NotFoundException('Endpoint de webhook no encontrado');
        }
        if (!endpoint.is_active) {
            throw new ActionNotAllowedException('El endpoint del webhook no esta activo');
        }
        if (!authIsAdmin && (authId === null || endpoint.id_client !== authId)) {
            throw new ActionNotAllowedException('Solo puedes suscribirte a endpoints de tu propio cliente');
        }
        return endpoint;
    }

    /** Every event must be part of EmailEventEnum; the row stores a comma list. */
    #validatedEvents(values: string[]): string {
        const invalid = values.filter((value) => !Object.values(EmailEventEnum).includes(value as EmailEventEnum));
        if (invalid.length > 0) {
            throw new ValidationException({ events: invalid.map((value) => `Evento "${value}" no soportado`) });
        }
        return [...new Set(values)].join(',');
    }
}
