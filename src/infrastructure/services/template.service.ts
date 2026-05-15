import { colors } from "@gamastudio/colorslog";
import { Injectable } from "@nestjs/common";
import { render } from "react-email";
import { ITemplateService } from "src/core/application/contracts/services/template.service";
import WelcomeEmail from "./template/welcome.email";



@Injectable()
export class TemplateService implements ITemplateService {

    public assignClientCredentials = async (): Promise<Nullable<string>> => {
        try {
            return await render(WelcomeEmail({ username: 'Andres', company: 'SILVER' }));
        } catch (error) {
            colors.error(`Ha ocurrido un error al genera el template de asignación de credenciales ---> ${error}`)
            return null
        }
    }

}