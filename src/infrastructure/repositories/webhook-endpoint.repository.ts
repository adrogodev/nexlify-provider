import { Injectable } from "@nestjs/common";
import type { IWebhookEndpointsRepository } from "src/core/application/contracts/persistence/webhook-endpoint.repository";
import { WebhookEndpoint } from "src/core/domain/entities/webhook-endpoint.entity";
import { PrismaService } from "../prisma/prisma.service";
import { BaseRepository } from "./base.repository";

@Injectable()
export class WebhookEndpointsRepository extends BaseRepository<WebhookEndpoint, 'id_endpoint'> implements IWebhookEndpointsRepository {
    constructor(prisma: PrismaService) {
        super(prisma, 'webhook_endpoints', 'id_endpoint');
    }

    public async findByUuid(endpointUuid: string): Promise<WebhookEndpoint | null> {
        return await this._model.findUnique({ where: { endpoint_uuid: endpointUuid } });
    }

    public async findAllByClientId(idClient: bigint): Promise<WebhookEndpoint[]> {
        return await this._model.findMany({
            where: this.#buildByIdClient(idClient),
            orderBy: { id_endpoint: 'asc' },
        });
    }

    public async findActiveByClientId(idClient: bigint): Promise<WebhookEndpoint[]> {
        return await this._model.findMany({
            where: this.#buildByIdClient(idClient, true),
            orderBy: { id_endpoint: 'asc' },
        });
    }

    #buildByIdClient(idClient: bigint, activeOnly?: boolean): Record<string, unknown> {
        return {
            id_client: idClient,
            is_active: activeOnly ? true : undefined,
        };
    }
}
