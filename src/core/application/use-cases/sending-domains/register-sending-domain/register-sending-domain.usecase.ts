import type {
    IAppConfig,
    IEncrypter,
    IRequestContext,
} from 'src/core/application/contracts/infrastructure';
import type { ISendingDomainsRepository } from 'src/core/application/contracts/persistence';
import type { IDkimKeyGenerator } from 'src/core/application/contracts/services';
import type { SendingDomainDTO } from 'src/core/application/dtos';
import {
    ActionNotAllowedException,
    AlreadyExistsException,
} from 'src/core/domain/exceptions';
import { UseCase, UseCaseArgs } from 'src/core/domain/models';
import { toSendingDomainDTO } from '../sending-domain.presenter';
import type { SpfPolicyService } from '../spf-policy.service';
import type { RegisterSendingDomainInput } from './register-sending-domain.request-data';

const DEFAULT_DKIM_SELECTOR = 'nexlify';

/**
 * Registers a sending domain (S4): RSA-2048 DKIM keypair generated server
 * side, private key encrypted at rest with ENCRYPT_KEY, and the SPF / DKIM /
 * DMARC TXT records to publish returned to the caller.
 */
export class RegisterSendingDomainUseCase
    implements UseCase<RegisterSendingDomainInput, SendingDomainDTO>
{
    constructor(
        private readonly _context: IRequestContext,
        private readonly _sendingDomainsRepository: ISendingDomainsRepository,
        private readonly _dkimKeyGenerator: IDkimKeyGenerator,
        private readonly _encrypter: IEncrypter,
        private readonly _appConfig: IAppConfig,
        private readonly _spfPolicy: SpfPolicyService,
    ) {}

    public run = async (
        args: UseCaseArgs<RegisterSendingDomainInput>,
    ): Promise<SendingDomainDTO> => {
        const auth = this._context.get();
        const authIsAdmin = auth?.is_admin === true;

        let id_client: bigint | null;
        const requested = args.data.id_client;
        if (requested !== undefined && requested !== null) {
            if (!authIsAdmin) {
                throw new ActionNotAllowedException(
                    'Solo un administrador puede registrar dominios para otro cliente',
                );
            }
            id_client = BigInt(requested);
        } else {
            id_client = authIsAdmin ? null : BigInt(auth.id_user);
        }

        const domain = args.data.domain.trim().toLowerCase().replace(/\.$/, '');
        if (
            (await this._sendingDomainsRepository.findByDomain(domain)) !== null
        ) {
            throw new AlreadyExistsException('El dominio ya esta registrado');
        }

        const keyPair = this._dkimKeyGenerator.generate();
        const created = await this._sendingDomainsRepository.create({
            id_client,
            domain,
            dkim_selector: DEFAULT_DKIM_SELECTOR,
            dkim_public_key: keyPair.publicKey,
            dkim_private_key: this._encrypter.encrypt(
                keyPair.privateKeyPem,
                this._appConfig.ENCRYPT_KEY,
            ),
        });

        return toSendingDomainDTO(created, await this._spfPolicy.mechanism());
    };
}
