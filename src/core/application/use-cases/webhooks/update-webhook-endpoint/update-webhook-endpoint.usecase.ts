import type { IRequestContext } from "src/core/application/contracts/infrastructure";
import type { EntityUpdateInput } from "src/core/application/contracts/persistence/base.repository";
import type { IWebhookEndpointsRepository } from "src/core/application/contracts/persistence/webhook-endpoint.repository";
import { ActionNotAllowedException, NotFoundException } from "src/core/domain/exceptions";
import { UseCase, UseCaseArgs } from "src/core/domain/models";
import { toOwnedEndpointDTO, type OwnedWebhookEndpointDTO } from "../list-my-webhook-endpoint";
import type { WebhookEndpoint } from "src/core/domain/entities/webhook-endpoint.entity";
import type { UpdateWebhookEndpointInput } from "./update-webhook-endpoint.request-data";

export class UpdateWebhookEndpointUseCase implements UseCase<UpdateWebhookEndpointInput, OwnedWebhookEndpointDTO> {
    constructor(
        private readonly _context: IRequestContext,
        private readonly _webhookEndpointsRepository: IWebhookEndpointsRepository,
    ) { }

    public run = async (args: UseCaseArgs<UpdateWebhookEndpointInput>): Promise<OwnedWebhookEndpointDTO> => {
        const auth = this._context.get();
        const authIsAdmin = auth?.is_admin === true;

        const endpoint = await this._webhookEndpointsRepository.findByUuid(args.data.endpoint_uuid);
        if (!endpoint) throw new NotFoundException('Endpoint de webhook no encontrado');

        if (!authIsAdmin && endpoint.id_client !== BigInt(auth!.id_user)) {
            throw new ActionNotAllowedException('Solo el propietario o un administrador puede modificar el webhook');
        }

        // Only the content fields: the secret and the DB-side uuid and
        // timestamps are never part of the patch.
        const patch: EntityUpdateInput<WebhookEndpoint, 'id_endpoint'> = {
            url: args.data.url,
            is_active: args.data.is_active,
        };

        const updated = await this._webhookEndpointsRepository.update(endpoint.id_endpoint, patch);

        return toOwnedEndpointDTO(updated ?? endpoint);
    };
}
