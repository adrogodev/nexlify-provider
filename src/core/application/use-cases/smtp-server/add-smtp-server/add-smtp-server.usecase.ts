import { ISmtpServerRepository } from "src/core/application/contracts/persistence";
import { AlreadyExistsException } from "src/core/domain/exceptions";
import { UseCase, UseCaseArgs } from "src/core/domain/models";
import { AddSmtpServerInput, AddSmtpServerRequestData } from "./add-smtp-server.request-data";

export class AddSmtpServerUseCase implements UseCase<AddSmtpServerInput, boolean> {
    constructor(
        private readonly _smtpServerRepository: ISmtpServerRepository
    ) { }

    public run = async (args: UseCaseArgs<AddSmtpServerRequestData>): Promise<boolean> => {
        const { ...values } = args.data;

        const existing = await this._smtpServerRepository.findByNameAndProvider(values.provider, values.host);
        if (existing !== null) throw new AlreadyExistsException("Ya existe un servidor SMTP con este nombre y provider");

        await this._smtpServerRepository.create({
            provider: values.provider,
            host: values.host,
            port: values.port,
            auth_type: "basic",
            state: true
        });

        return true;
    };
}