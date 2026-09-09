import QRCode from "qrcode";

/** Gera o PNG do QR Code (data URL) com o código do convite. */
export async function guestCodeQrDataUrl(code: string): Promise<string> {
  return QRCode.toDataURL(code.trim().toUpperCase(), {
    width: 400,
    margin: 2,
    errorCorrectionLevel: "M",
  });
}
