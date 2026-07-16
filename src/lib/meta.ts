import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyMetaSignature(rawBody: string, signature: string | null) {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret || !signature?.startsWith("sha256=")) return false;

  const expected = `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export function getWhatsAppApiUrl(path: string) {
  const version = process.env.WHATSAPP_GRAPH_API_VERSION;
  if (!version) throw new Error("WHATSAPP_GRAPH_API_VERSION is not configured");
  return `https://graph.facebook.com/${version}/${path}`;
}
