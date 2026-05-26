import { NexlifyConfiguration } from 'src/core/domain/entities/nexlify-configuration.entity';
import type { IBaseRepository } from './base.repository';

export const NEXLIFY_CONFIGURATION_REPOSITORY = Symbol('INexlifyConfigurationRepository');

export interface INexlifyConfigurationRepository extends IBaseRepository<NexlifyConfiguration, 'id_configuration'> {
    findConfiguration(): Promise<Nullable<NexlifyConfiguration>>;
}
