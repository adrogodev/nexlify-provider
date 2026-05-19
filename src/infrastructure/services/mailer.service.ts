import { colors } from "@gamastudio/colorslog";
import { Injectable } from "@nestjs/common";
import { Transporter } from "nodemailer";
import * as nodemailer from "nodemailer";
import { IMailerService, MailerPayload } from "src/core/application/contracts/services";
import { TransporterData } from "src/core/domain/models";

@Injectable()
export class MailerService implements IMailerService {

    public send = async (payload: MailerPayload): Promise<boolean> => {
        try {
            const transporter = await this.#getTransporter(payload.transporter);
            const { ...data } = payload.email;

            await transporter.sendMail({
                from: data.from,
                to: Array.isArray(data.to) ? data.to.join(',') : data.to,
                subject: data.subject,
                html: data.html,
                text: data.text,
                attachments: data.attachments
            })

            return true;

        } catch (error) {
            colors.error(`Ha ocurrido un error al enviar: ${error}`, { dateShow: false });
            return false;
        }
    }

    async #getTransporter(config: TransporterData): Promise<Transporter> {

        const transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: {
                user: config.user,
                pass: config.password
            },
            tls: {
                ciphers: 'SSLv3',
                rejectUnauthorized: false
            }
        });

        try {
            await transporter.verify();
            return transporter;
        } catch (error) {
            colors.error('Error al crear el transporter para el envio de correos', { dateShow: false })
            throw new Error(error);
        }

    }

}