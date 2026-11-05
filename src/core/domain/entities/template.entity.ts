export class Template {
    constructor(
        public id_template: string,
        public name: Nullable<string>,
        public subject: Nullable<string>,
        public template: Nullable<string>,
        public is_active: Nullable<boolean>,
        public created_at: Nullable<Date>,
        public updated_at: Nullable<Date>,
        /** JSON-serialized string[] of the declared placeholder names (S2). */
        public variables?: Nullable<string>,
        public category?: Nullable<string>,
        public locale?: Nullable<string>,
    ) { }
}
