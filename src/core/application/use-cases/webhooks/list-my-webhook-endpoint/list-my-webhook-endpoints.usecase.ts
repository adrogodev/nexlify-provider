import type { IRequestContext } from "src/core/application/contracts/infrastructure";
import type { IWebhookEndpointsRepository } from "src/core/application/contracts/persistence/webhook-endpoint.repository";
import type { WebhookEndpoint } from "src/core/domain/entities/webhook-endpoint.entity";
import { UseCase, UseCaseArgs } from "src/core/domain/models/use-case.model";

export interface OwnedWebhookEndpointDTO {
    id_client: number;
    endpoint_uuid: string;
    url: string;
    is_active: boolean;
    created_at: Date | null;
    updated_at: Date | null;
}

/** Listing shape without the secret: secrets are read-only per registration. */
export function toOwnedEndpointDTO(endpoint: WebhookEndpoint): OwnedWebhookEndpointDTO {
    return {
        id_client: Number(endpoint.id_client),
        endpoint_uuid: endpoint.endpoint_uuid,
        url: endpoint.url,
        is_active: endpoint.is_active,
        created_at: endpoint.created_at,
        updated_at: endpoint.updated_at,
    };
}

export class ListMyWebhookEndpointsUseCase implements UseCase<null, OwnedWebhookEndpointDTO[]> {
    constructor(
        private readonly _context: IRequestContext,
        private readonly _webhookEndpointsRepository: IWebhookEndpointsRepository,
    ) { }

    public run = async (_args: UseCaseArgs<null>): Promise<OwnedWebhookEndpointDTO[]> => {
        const auth = this._context.get();

        const endpoints = await this._webhookEndpointsRepository.findAllByClientId(BigInt(auth!.id_user));

        return (endpoints ?? []).map(toOwnedEndpointDTO);
    };
}
