import type { IRequestContext } from "src/core/application/contracts/infrastructure";
import type { EntityUpdateInput } from "src/core/application/contracts/persistence/base.repository";
import type { IEmailEventSubscriptionsRepository } from "src/core/application/contracts/persistence";
import { ActionNotAllowedException, NotFoundException, ValidationException } from "src/core/domain/exceptions";
import { EmailEventEnum } from "src/core/domain/enum";
import { UseCase, UseCaseArgs } from "src/core/domain/models";
import type { EmailEventSubscription } from "src/core/domain/entities/email-event-subscription.entity";
import { toSubscriptionDTO, type SubscriptionDTO } from "../to-subscription.dto";
import type { UpdateSubscriptionInput } from "./update-subscription.request-data";

/**
 * Updates the subscribed events, the payload field flags (S5) and the active
 * state of a subscription: only the owner or an admin may patch the row, and
 * the uuid-based identity of the row itself is never writable.
 */
export class UpdateSubscriptionUseCase implements UseCase<UpdateSubscriptionInput, SubscriptionDTO> {
    constructor(
        private readonly _context: IRequestContext,
        private readonly _emailEventSubscriptionsRepository: IEmailEventSubscriptionsRepository,
    ) { }

    public run = async (args: UseCaseArgs<UpdateSubscriptionInput>): Promise<SubscriptionDTO> => {
        const auth = this._context.get();
        const authIsAdmin = auth?.is_admin === true;

        const subscription = await this._emailEventSubscriptionsRepository.findByUuid(args.data.subscription_uuid);
        if (subscription === null) {
            throw new NotFoundException('Suscripcion de eventos no encontrada');
        }
        if (!authIsAdmin && (auth === null || auth === undefined || subscription.id_client !== BigInt(auth!.id_user))) {
            throw new ActionNotAllowedException('Solo el propietario o un administrador puede modificar la suscripcion');
        }

        const patch: EntityUpdateInput<EmailEventSubscription, 'id_subscription'> = {};

        if (args.data.events !== undefined) {
            patch.events = this.#validatedEvents(args.data.events);
        }
        if (args.data.include_body !== undefined) patch.include_body = args.data.include_body;
        if (args.data.include_dates !== undefined) patch.include_dates = args.data.include_dates;
        if (args.data.include_sender !== undefined) patch.include_sender = args.data.include_sender;
        if (args.data.include_recipients !== undefined) patch.include_recipients = args.data.include_recipients;
        if (args.data.include_attachments !== undefined) patch.include_attachments = args.data.include_attachments;
        if (args.data.is_active !== undefined) patch.is_active = args.data.is_active;

        const updated = await this._emailEventSubscriptionsRepository.update(subscription.id_subscription, patch);

        return toSubscriptionDTO(updated ?? subscription);
    };

    /** Every event must be part of EmailEventEnum; the row stores a comma list. */
    #validatedEvents(values: string[]): string {
        const invalid = values.filter((value) => !Object.values(EmailEventEnum).includes(value as EmailEventEnum));
        if (invalid.length > 0) {
            throw new ValidationException({ events: invalid.map((value) => `Evento "${value}" no soportado`) });
        }
        return [...new Set(values)].join(',');
    }
}
