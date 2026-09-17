/** BR Code (PIX copia e cola) — padrão aberto do Banco Central (EMVCo).
 *  Gera o payload localmente a partir da chave dos noivos: zero taxa,
 *  sem intermediário. A confirmação é manual (ver fluxo PIX direto).
 *
 *  Layout: 00=01 | 26=conta (gui br.gov.bcb.pix + chave) | 52=0000 |
 *  53=986 | 54=valor | 58=BR | 59=nome | 60=cidade | 62=txid | 63=CRC16.
 */

function field(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

/** Nome/cidade: sem acento, sem caracteres estranhos, truncado (mantém o
 *  original — bancos aceitam maiúsculas ou não). */
export function normalizeBrField(raw: string, max: number): string {
  return (raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 .\-'/]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** CRC16-CCITT-FALSE (poly 0x1021, init 0xFFFF) — 4 hex maiúsculos. */
export function crc16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export type PixPayloadInput = {
  key: string;
  name: string;
  city: string;
  amount: number;
  txid: string;
};

/** Monta o copia e cola. Lança Error com mensagem PT-BR se algo inválido. */
export function buildPixPayload(input: PixPayloadInput): string {
  const key = (input.key || "").trim();
  if (!key) throw new Error("Chave PIX dos noivos não configurada.");
  if (key.length > 77) throw new Error("Chave PIX inválida.");

  const name = normalizeBrField(input.name, 25);
  if (!name) throw new Error("Nome do titular inválido para o PIX.");
  const city = normalizeBrField(input.city, 15);
  if (!city) throw new Error("Cidade da conta inválida para o PIX.");

  const amount = Math.round((Number(input.amount) || 0) * 100) / 100;
  if (!(amount > 0)) throw new Error("Valor do PIX inválido.");

  const txid = (input.txid || "***").replace(/[^a-zA-Z0-9]/g, "").slice(0, 25) || "***";

  const merchantAccount = field("00", "br.gov.bcb.pix") + field("01", key);
  const txField = field("05", txid);
  const partial =
    field("00", "01") +
    field("26", merchantAccount) +
    field("52", "0000") +
    field("53", "986") +
    field("54", amount.toFixed(2)) +
    field("58", "BR") +
    field("59", name) +
    field("60", city) +
    field("62", txField) +
    "6304";
  return partial + crc16(partial);
}
