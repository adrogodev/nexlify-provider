import type { IRequestContext } from "src/core/application/contracts/infrastructure";
import type { IEmailEventSubscriptionsRepository } from "src/core/application/contracts/persistence";
import { UseCase, UseCaseArgs } from "src/core/domain/models/use-case.model";
import type { GetMySubscriptionsInput } from "./get-my-subscriptions.request-data";
import { toSubscriptionDTO, type SubscriptionDTO } from "../to-subscription.dto";

/**
 * Own subscriptions listing (S4): a client sees its own rows; an admin sees
 * every subscription and may narrow the listing with an id_client filter.
 */
export class GetMySubscriptionsUseCase implements UseCase<GetMySubscriptionsInput, SubscriptionDTO[]> {
    constructor(
        private readonly _context: IRequestContext,
        private readonly _emailEventSubscriptionsRepository: IEmailEventSubscriptionsRepository,
    ) { }

    public run = async (args: UseCaseArgs<GetMySubscriptionsInput>): Promise<SubscriptionDTO[]> => {
        const auth = this._context.get();
        const authIsAdmin = auth?.is_admin === true;

        const subscriptions = authIsAdmin && args.data?.id_client !== undefined && args.data.id_client !== null
            ? await this._emailEventSubscriptionsRepository.findAllByClientId(BigInt(args.data.id_client))
            : authIsAdmin
                ? await this._emailEventSubscriptionsRepository.getAllAsync()
                : await this._emailEventSubscriptionsRepository.findAllByClientId(BigInt(auth!.id_user));

        return (subscriptions ?? []).map(toSubscriptionDTO);
    };
}
