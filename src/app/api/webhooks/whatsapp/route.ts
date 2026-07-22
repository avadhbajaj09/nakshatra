import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyMetaSignature } from "@/lib/meta";
import { getIncomingBody, handleWelcomeFlow, type InboundFlowMessage } from "@/lib/whatsapp-flow";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Verification failed", { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifyMetaSignature(rawBody, signature)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);

  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("webhook_events").insert({
      provider: "whatsapp",
      event_type: payload.object || "unknown",
      external_id: payload.entry?.[0]?.id || null,
      payload,
    });

    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        const phoneNumberId = value?.metadata?.phone_number_id;
        if (!phoneNumberId) continue;

        const { data: account } = await supabase
          .from("whatsapp_accounts")
          .select("id, organization_id")
          .eq("phone_number_id", phoneNumberId)
          .maybeSingle();

        if (!account) continue;

        for (const incoming of (value.messages || []) as InboundFlowMessage[]) {
          const contactName = value.contacts?.find((item: { wa_id?: string }) => item.wa_id === incoming.from)?.profile?.name;
          const { data: contact } = await supabase
            .from("contacts")
            .upsert(
              {
                organization_id: account.organization_id,
                wa_id: incoming.from,
                phone: incoming.from,
                display_name: contactName || incoming.from,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "organization_id,wa_id" },
            )
            .select("id")
            .single();

          if (!contact) continue;

          const { data: conversation } = await supabase
            .from("conversations")
            .upsert(
              {
                organization_id: account.organization_id,
                whatsapp_account_id: account.id,
                contact_id: contact.id,
                status: "open",
                last_message_at: new Date(Number(incoming.timestamp) * 1000).toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: "whatsapp_account_id,contact_id" },
            )
            .select("id")
            .single();

          if (!conversation) continue;

          const { data: storedMessage } = await supabase.from("messages").upsert(
            {
              organization_id: account.organization_id,
              conversation_id: conversation.id,
              whatsapp_message_id: incoming.id,
              direction: "inbound",
              message_type: incoming.type,
              body: getIncomingBody(incoming),
              status: "received",
              raw_payload: incoming,
              sent_at: new Date(Number(incoming.timestamp) * 1000).toISOString(),
            },
            { onConflict: "whatsapp_message_id", ignoreDuplicates: true },
          ).select("id").maybeSingle();

          if (storedMessage) {
            await handleWelcomeFlow({
              supabase,
              accountId: account.id,
              organizationId: account.organization_id,
              conversationId: conversation.id,
              phoneNumberId,
              incoming,
            });
          }
        }

        for (const status of value.statuses || []) {
          await supabase
            .from("messages")
            .update({ status: status.status, status_updated_at: new Date().toISOString() })
            .eq("whatsapp_message_id", status.id);
        }
      }
    }
  } catch (error) {
    console.error("WhatsApp webhook persistence failed", error);
  }

  return Response.json({ received: true });
}
