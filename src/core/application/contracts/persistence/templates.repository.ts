import { Template } from 'src/core/domain/entities/template.entity';
import type { EntityInput, IBaseRepository } from './base.repository';

export const TEMPLATES_REPOSITORY = Symbol('ITemplatesRepository');

export interface GetTemplatesFilters {
    is_active?: boolean;
    page?: number;
    limit?: number;
}

export interface ITemplatesRepository extends IBaseRepository<Template, 'id_template'> {
    /** id_template is DB-side generated (gen_random_uuid): allowed to omit on create. */
    create(entity: Omit<EntityInput<Template, 'id_template'>, 'id_template'> & Partial<Pick<Template, 'id_template'>>): Promise<Template>;
    getAllWithFilters(filters: GetTemplatesFilters): Promise<Template[]>;
    countWithFilters(filters: GetTemplatesFilters): Promise<number>;
}
