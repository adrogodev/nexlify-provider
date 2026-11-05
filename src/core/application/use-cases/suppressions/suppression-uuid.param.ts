import { IsUUID } from 'class-validator';

export class SuppressionUuidParam {
    @IsUUID()
    suppressionUuid: string;
}
