import * as React from "react"
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"

interface ResetPasswordEmailProps {
  userName: string
  resetLink: string
}

export const ResetPasswordEmail = ({
  userName,
  resetLink,
}: ResetPasswordEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Redefinição de senha do Casarium</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Recuperação de Senha</Heading>
          
          <Text style={text}>Olá, {userName}!</Text>
          <Text style={text}>
            Recebemos uma solicitação para redefinir a senha da sua conta no Casarium.
            Se você não fez essa solicitação, pode ignorar este e-mail com segurança.
          </Text>

          <Section style={buttonContainer}>
            <Link href={resetLink} style={button}>
              Redefinir Minha Senha
            </Link>
          </Section>

          <Text style={text}>
            Ou copie e cole este link no seu navegador:
            <br />
            <Link href={resetLink} style={link}>
              {resetLink}
            </Link>
          </Text>

          <Text style={smallText}>
            Este link expirará em 1 hora por motivos de segurança.
          </Text>

          <Hr style={hr} />
          <Text style={footer}>
            Se você tiver alguma dúvida, não hesite em nos contatar.<br />
            Casarium - O melhor sistema de gestão de casamentos.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default ResetPasswordEmail

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  borderRadius: "12px",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  maxWidth: "600px",
}

const h1 = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "600",
  lineHeight: "1.4",
  margin: "0 0 20px",
  textAlign: "center" as const,
}

const text = {
  color: "#555",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0 0 24px",
}

const smallText = {
  color: "#888",
  fontSize: "14px",
  lineHeight: "1.6",
  margin: "0 0 24px",
}

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
}

const button = {
  backgroundColor: "#db2777",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "16px 32px",
}

const link = {
  color: "#db2777",
  textDecoration: "underline",
}

const hr = {
  borderColor: "#e6ebf1",
  margin: "40px 0 20px",
}

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "1.5",
  textAlign: "center" as const,
}
