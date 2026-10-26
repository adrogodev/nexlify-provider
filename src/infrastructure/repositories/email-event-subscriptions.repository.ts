import { Injectable } from "@nestjs/common";
import type { IEmailEventSubscriptionsRepository } from "src/core/application/contracts/persistence/email-event-subscriptions.repository";
import { EmailEventSubscription } from "src/core/domain/entities/email-event-subscription.entity";
import { PrismaService } from "../prisma/prisma.service";
import { BaseRepository } from "./base.repository";

@Injectable()
export class EmailEventSubscriptionsRepository extends BaseRepository<EmailEventSubscription, 'id_subscription'> implements IEmailEventSubscriptionsRepository {
    constructor(prisma: PrismaService) {
        super(prisma, 'email_event_subscriptions', 'id_subscription');
    }

    public async findByUuid(subscriptionUuid: string): Promise<EmailEventSubscription | null> {
        return await this._model.findUnique({ where: { subscription_uuid: subscriptionUuid } });
    }

    public async findAllByClientId(idClient: bigint): Promise<EmailEventSubscription[]> {
        return await this._model.findMany({
            where: this.#buildByIdClient(idClient),
            orderBy: { id_subscription: 'asc' },
        });
    }

    public async findActiveByClientId(idClient: bigint): Promise<EmailEventSubscription[]> {
        return await this._model.findMany({
            where: this.#buildByIdClient(idClient, true),
            orderBy: { id_subscription: 'asc' },
        });
    }

    public async findActiveByClientIdAndEvent(idClient: bigint, event: string): Promise<EmailEventSubscription[]> {
        const active = await this.findActiveByClientId(idClient);
        return active.filter((subscription) =>
            subscription.events
                .split(',')
                .map((token) => token.trim())
                .includes(event),
        );
    }

    #buildByIdClient(idClient: bigint, activeOnly?: boolean): Record<string, unknown> {
        return {
            id_client: idClient,
            is_active: activeOnly ? true : undefined,
        };
    }
}
