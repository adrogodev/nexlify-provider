import { IsUUID } from 'class-validator';

export class SendingDomainUuidParam {
    @IsUUID()
    domainUuid: string;
}
