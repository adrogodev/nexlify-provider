import { INexlifyConfigurationRepository, ISmtpServerRepository } from "src/core/application/contracts/persistence";
import { NexlifyConfigurationDto } from "src/core/application/dtos";
import { NexlifyConfigurationMapper } from "src/core/application/mappers";
import { NexlifyConfiguration } from "src/core/domain/entities/nexlify-configuration.entity";
import { SmtpServers } from "src/core/domain/entities/smtp-server.entity";
import { UseCase, UseCaseArgs } from "src/core/domain/models";

export class GetNexlifyConfigurationUseCase implements UseCase<null, NexlifyConfigurationDto> {
    constructor(
        private readonly _nexlifyConfigurationRepository: INexlifyConfigurationRepository,
        private readonly _smtpServerRepository: ISmtpServerRepository
    ) { }

    public run = async (): Promise<NexlifyConfigurationDto> => {


        const configuration: Nullable<NexlifyConfiguration> = await this._nexlifyConfigurationRepository.findConfiguration();

        let smtp: Nullable<SmtpServers> = null;

        if (configuration?.id_smtp_server !== null) smtp = await this._smtpServerRepository.getByIdAsync(configuration?.id_smtp_server!);

        return NexlifyConfigurationMapper.toMap(configuration, smtp);

    };
}