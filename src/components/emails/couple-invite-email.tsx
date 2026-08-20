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

interface CoupleInviteEmailProps {
  coupleName: string
  plannerName: string
  weddingSlug: string
  loginEmail: string
  tempPassword: string
  siteUrl: string
}

export const CoupleInviteEmail = ({
  coupleName,
  plannerName,
  weddingSlug,
  loginEmail,
  tempPassword,
  siteUrl,
}: CoupleInviteEmailProps) => {
  const loginUrl = `${siteUrl}/login`

  return (
    <Html>
      <Head />
      <Preview>Seu painel de casamento foi criado!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Bem-vindos ao ConciWedding!</Heading>
          
          <Text style={text}>Olá, {coupleName}!</Text>
          <Text style={text}>
            O seu cerimonialista, <strong>{plannerName}</strong>, acabou de configurar o painel do seu casamento.
            Agora vocês podem acompanhar a lista de convidados, confirmações de presença, presentes e muito mais.
          </Text>

          <Section style={credentialsBox}>
            <Text style={text}>Suas credenciais de acesso temporárias são:</Text>
            <Text style={credentialsText}>
              <strong>E-mail:</strong> {loginEmail}<br />
              <strong>Senha:</strong> {tempPassword}
            </Text>
            <Text style={smallText}>
              Recomendamos que você altere a senha no primeiro acesso através do seu perfil.
            </Text>
          </Section>

          <Section style={buttonContainer}>
            <Link href={loginUrl} style={button}>
              Acessar Painel
            </Link>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            Se você tiver alguma dúvida, entre em contato com {plannerName}.<br />
            ConciWedding - O melhor sistema de gestão de casamentos.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  borderRadius: "8px",
  border: "1px solid #eaeaea",
  maxWidth: "600px",
}

const h1 = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "30px 0",
}

const text = {
  color: "#525f7f",
  fontSize: "16px",
  lineHeight: "24px",
  textAlign: "left" as const,
}

const credentialsBox = {
  background: "#f4f4f5",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
}

const credentialsText = {
  color: "#18181b",
  fontSize: "16px",
  lineHeight: "24px",
  fontFamily: "monospace",
}

const smallText = {
  color: "#71717a",
  fontSize: "12px",
  lineHeight: "16px",
  marginTop: "12px",
}

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
}

const button = {
  backgroundColor: "#000",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
}

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
}

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  textAlign: "center" as const,
}
