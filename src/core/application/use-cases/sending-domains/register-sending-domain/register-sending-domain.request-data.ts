import { Type } from 'class-transformer';
import { IsFQDN, IsInt, IsOptional } from 'class-validator';

export class RegisterSendingDomainRequestData {
    @IsFQDN({ require_tld: true })
    domain: string;

    /** Administration flow: register the domain for a client (omitted = platform-wide). */
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    id_client?: number;
}

export type RegisterSendingDomainInput = RegisterSendingDomainRequestData;
