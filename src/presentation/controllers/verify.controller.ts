import { Controller, Get, Headers, HttpCode, Query } from "@nestjs/common";
import { VerifyCredentialAssignmentTokenUseCase } from "src/core/application/use-cases/verify";
import { ClientResponse } from "src/core/domain/models";

@Controller('api/verify')
export class VerifyController {
    constructor(
        private readonly _verifyCredentialAssignmentTokenUseCase: VerifyCredentialAssignmentTokenUseCase
    ) { }

    @Get()
    @HttpCode(200)
    verify(): string { return 'Nexlify provider corriendo exitosamente...' }

    @Get('credential-assignment')
    @HttpCode(200)
    async verifyCredentialAssignmentToken(@Headers('x-assign-creds-token') assign_creds_token: string): Promise<ClientResponse<void>> {
        return new ClientResponse({
            ok: true,
            message: 'Token de asignacion de contraseña validado exitosamente',
            data: await this._verifyCredentialAssignmentTokenUseCase.run({ data: { token: assign_creds_token } })
        })
    }
}
