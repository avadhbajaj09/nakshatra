import { z } from "zod";
import { getWhatsAppApiUrl } from "@/lib/meta";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const sendMessageSchema = z.object({
  whatsappAccountId: z.string().uuid(),
  conversationId: z.string().uuid(),
  to: z.string().regex(/^\d{8,15}$/),
  body: z.string().trim().min(1).max(4096),
});

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!accessToken) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !authData.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = sendMessageSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid message", details: parsed.error.flatten() }, { status: 400 });

  const { whatsappAccountId, conversationId, to, body } = parsed.data;
  const { data: account } = await supabase
    .from("whatsapp_accounts")
    .select("id, organization_id, phone_number_id")
    .eq("id", whatsappAccountId)
    .single();
  if (!account) return Response.json({ error: "WhatsApp account not found" }, { status: 404 });

  const { data: membership } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", account.organization_id)
    .eq("user_id", authData.user.id)
    .maybeSingle();
  if (!membership) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, whatsapp_account_id, contact:contacts(wa_id)")
    .eq("id", conversationId)
    .eq("organization_id", account.organization_id)
    .eq("whatsapp_account_id", whatsappAccountId)
    .maybeSingle();
  const contact = conversation?.contact as unknown as { wa_id?: string } | null;
  if (!conversation || contact?.wa_id !== to) return Response.json({ error: "Conversation recipient does not match" }, { status: 403 });

  const { data: latestInbound } = await supabase
    .from("messages")
    .select("sent_at")
    .eq("conversation_id", conversationId)
    .eq("direction", "inbound")
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latestInbound || Date.now() - new Date(latestInbound.sent_at).getTime() > 24 * 60 * 60 * 1000) {
    return Response.json({ error: "The 24-hour service window is closed. Send an approved template instead." }, { status: 409 });
  }

  const metaToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!metaToken) return Response.json({ error: "WhatsApp is not configured" }, { status: 503 });

  const metaResponse = await fetch(getWhatsAppApiUrl(`${account.phone_number_id}/messages`), {
    method: "POST",
    headers: { Authorization: `Bearer ${metaToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { preview_url: false, body } }),
  });
  const metaResult = await metaResponse.json();
  if (!metaResponse.ok) return Response.json({ error: "Meta rejected the message", details: metaResult }, { status: 502 });

  const whatsappMessageId = metaResult.messages?.[0]?.id;
  await supabase.from("messages").insert({
    organization_id: account.organization_id,
    conversation_id: conversationId,
    whatsapp_message_id: whatsappMessageId,
    direction: "outbound",
    message_type: "text",
    body,
    status: "accepted",
    raw_payload: metaResult,
    sent_by: authData.user.id,
    sent_at: new Date().toISOString(),
  });

  return Response.json({ id: whatsappMessageId, status: "accepted" });
}
