import { Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Tailwind, Text } from 'react-email';

interface CredentialAssignmentTemplateProps {
    client?: string;
    app_name?: string;
    assign_credential_link?: string;
    support_email?: string;
}

const CredentialAssignmentTemplate = ({ ...props }: CredentialAssignmentTemplateProps) => {
    const previewText = `${props.client?.toUpperCase()}, Bienvenid@ a ${props.app_name}`;

    return (
        <Html>
            <Tailwind
                config={{
                    darkMode: 'media',
                }}
            >
                <Head />
                <Preview>{previewText}</Preview>
                <Body className="m-auto font-sans bg-white">
                    <Container className="mb-10 mx-auto p-5 max-w-[465px]">
                        {/* <Section className="mt-10">
                            <Img
                                src={`https://example.com/brand/example-logo.png`}
                                width="60"
                                height="60"
                                alt="Logo Example"
                                className="my-0 mx-auto"
                            />
                        </Section> */}
                        <Heading className="text-2xl text-black font-normal text-center p-0 my-8 mx-0">
                            <strong>{props.client?.toUpperCase()}</strong>, Bienvenid@ a {props.app_name}!
                        </Heading>
                        {/* <Text className="text-start text-sm text-black">
                            Hello {username},
                        </Text> */}
                        <Text className="text-start text-sm text-black leading-relaxed">
                            Para completar la activación de su acceso y asignar sus credenciales de ingreso,
                            haga clic en el botón que encontrará a continuación:
                        </Text>
                        <Section className="text-center mt-[32px] mb-[32px]">
                            <Button
                                className="py-2.5 px-5 bg-black rounded-md text-white text-sm font-semibold no-underline text-center"
                                href={`${props.assign_credential_link}`}
                            >
                                Asignar credenciales
                            </Button>
                        </Section>
                        <Text className="text-start text-sm font-bold text-black italic">
                            Este enlace le permitirá configurar su usuario y contraseña de manera segura para acceder a la plataforma.
                        </Text>
                        <Text className="text-start text-sm text-black">
                            Si presenta algún inconveniente o requiere asistencia adicional, no dude en contactarnos a este correo <strong>{props.support_email}.</strong>
                        </Text>
                        <Text className="text-start text-sm text-black">
                            Atentamente,
                            <br />
                            Equipo {props.app_name}
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default CredentialAssignmentTemplate;