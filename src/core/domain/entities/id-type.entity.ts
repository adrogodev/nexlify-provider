export class IdType {
    constructor(
        public id_type: number,
        public code: string,
        public name: string,
        public description: Nullable<string>,
        public is_active: Nullable<boolean>,
        public created_at: Nullable<Date>,
        public updated_at: Nullable<Date>,
    ) { }
}
