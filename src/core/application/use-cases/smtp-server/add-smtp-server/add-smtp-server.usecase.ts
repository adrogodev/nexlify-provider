import { UseCase, UseCaseArgs } from "src/core/domain/models";
import { AddSmtpServerInput, AddSmtpServerRequestData } from "./add-smtp-server.request-data";
import { ISmtpServerRepository } from "src/core/application/contracts/persistence";
import { AlreadyExistsException } from "src/core/domain/exceptions";

export class AddSmtpServerUseCase implements UseCase<AddSmtpServerInput, boolean> {
    constructor(
        private readonly _smtpServerRepository: ISmtpServerRepository
    ) { }

    public run = async (args: UseCaseArgs<AddSmtpServerRequestData>): Promise<boolean> => {
        const { ...values } = args.data;

        const existing = await this._smtpServerRepository.findByNameAndProvider(values.name, values.provider);
        if (existing !== null) throw new AlreadyExistsException("Ya existe un servidor SMTP con este nombre y provider");

        await this._smtpServerRepository.create({
            name: values.name,
            provider: values.provider,
            port: values.port,
            state: true
        });

        return true;
    };
}