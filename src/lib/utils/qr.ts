import QRCode from "qrcode";

export async function qrSvg(value: string): Promise<string> {
  const svg = await QRCode.toString(value, {
    type: "svg",
    margin: 0,
    width: 96,
    errorCorrectionLevel: "M",
  });
  return svg.replace(/<\?xml[^>]*>/, "").trim();
}
