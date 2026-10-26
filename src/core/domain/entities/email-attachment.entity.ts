export class EmailAttachment {
    constructor(
        public id_attachment: bigint,
        public id_email: bigint,
        public filename: string,
        public content_type: Nullable<string>,
        public size_bytes: Nullable<number>,
        public content: Nullable<string>,
        public created_at: Nullable<Date>,
        public updated_at: Nullable<Date>
    ) { }
}
