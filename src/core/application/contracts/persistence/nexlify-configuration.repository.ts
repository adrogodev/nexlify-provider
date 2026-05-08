import type { nexlify_configuration } from '@prisma/client';
import type { IBaseRepository } from './base.repository';

export const NEXLIFY_CONFIGURATION_REPOSITORY = Symbol('INexlifyConfigurationRepository');

export interface INexlifyConfigurationRepository extends IBaseRepository<nexlify_configuration, 'id_configuration'> {
    findConfiguration(): Promise<Nullable<nexlify_configuration>>;
}
