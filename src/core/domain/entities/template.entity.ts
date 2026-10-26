export class Template {
    constructor(
        public id_template: string,
        public name: Nullable<string>,
        public subject: Nullable<string>,
        public template: Nullable<string>,
        public is_active: Nullable<boolean>,
        public created_at: Nullable<Date>,
        public updated_at: Nullable<Date>
    ) { }
}
