/**
 * Templates de mensagens WhatsApp (convite + lembrete), com variáveis:
 * {nome} {noivos} {link} {codigo} {qtd} {convite_vale} {dias}
 */

export const TEMPLATE_VARS = [
  { key: "{nome}", label: "nome do convidado" },
  { key: "{noivos}", label: "nomes dos noivos" },
  { key: "{link}", label: "link do convite (com token)" },
  { key: "{codigo}", label: "código do convite" },
  { key: "{qtd}", label: "nº de pessoas do convite" },
  { key: "{convite_vale}", label: "frase 'vale para N pessoas' (vazio se individual)" },
  { key: "{dias}", label: "só lembrete: 'Faltam N dias' / 'É amanhã' / 'É hoje'" },
] as const;

export const DEFAULT_INVITE_TEMPLATE =
  "Olá {nome}! Você foi convidado para o casamento de {noivos}.\n\nConfirme sua presença no link: {link}\n{convite_vale}Seu código é: {codigo}";

export const DEFAULT_REMINDER_TEMPLATE =
  "Olá {nome}! {dias} para o casamento de {noivos} e ainda não registramos sua confirmação. 💍\n\nConfirme aqui: {link}\nSeu código é: {codigo}";

export type TemplateVars = {
  nome: string;
  noivos: string;
  link: string;
  codigo: string;
  qtd: number;
  convite_vale: string;
  dias: string;
};

export function renderMessageTemplate(template: string, vars: TemplateVars): string {
  return template
    .replaceAll("{nome}", vars.nome)
    .replaceAll("{noivos}", vars.noivos)
    .replaceAll("{link}", vars.link)
    .replaceAll("{codigo}", vars.codigo)
    .replaceAll("{qtd}", String(vars.qtd))
    .replaceAll("{convite_vale}", vars.convite_vale)
    .replaceAll("{dias}", vars.dias)
    // colapsa linhas que ficaram vazias (ex: {convite_vale} vazio)
    .split("\n")
    .filter((line, i, arr) => line.trim() !== "" || arr[i - 1]?.trim() !== "")
    .join("\n")
    .trim();
}

export function daysLabel(daysLeft: number): string {
  if (daysLeft > 1) return `Faltam ${daysLeft} dias`;
  if (daysLeft === 1) return "É amanhã";
  return "É hoje";
}

export const PREVIEW_VARS: TemplateVars = {
  nome: "Maria Silva",
  noivos: "Ana & Bruno",
  link: "https://casarium-production.up.railway.app/site/ana-e-bruno/rsvp?token=ABCD1234",
  codigo: "ABCD1234",
  qtd: 3,
  convite_vale: "Este convite vale para 3 pessoas. ",
  dias: "Faltam 5 dias",
};
