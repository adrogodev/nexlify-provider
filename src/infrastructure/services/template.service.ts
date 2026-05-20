import { colors } from "@gamastudio/colorslog";
import { Injectable } from "@nestjs/common";
import { render } from "react-email";
import { ITemplateService } from "src/core/application/contracts/services/template.service";
import WelcomeEmail from "./template/credential-assignment.template";



@Injectable()
export class TemplateService implements ITemplateService {

    public assignClientCredentials = async (client: string, link: string, support_email: string): Promise<Nullable<string>> => {
        try {
            return await render(WelcomeEmail({ client, app_name: 'Nexlify', assign_credential_link: link, support_email }));
        } catch (error) {
            colors.error(`Ha ocurrido un error al genera el template de asignación de credenciales ---> ${error}`)
            return null
        }
    }
}
