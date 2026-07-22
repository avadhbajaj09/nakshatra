import type { SupabaseClient } from "@supabase/supabase-js";
import { getWhatsAppApiUrl } from "@/lib/meta";

export type InboundFlowMessage = {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body?: string };
  interactive?: {
    type?: "button_reply" | "list_reply";
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string; description?: string };
  };
};

type FlowContext = {
  supabase: SupabaseClient;
  accountId: string;
  organizationId: string;
  conversationId: string;
  phoneNumberId: string;
  incoming: InboundFlowMessage;
};

const followUps: Record<string, string> = {
  hotel_booking: "Wonderful! Please share your check-in date, check-out date, and number of guests. Our reservations team will help you with the best available rooms.",
  restaurant_booking: "We would be delighted to reserve a table. Please share your preferred date, time, and number of guests.",
  luxury_resort: "Let us help plan your luxury resort stay. Please share your preferred dates, number of guests, and any special requirements.",
  events_celebrations: "We would love to plan your celebration. Please tell us the event type, preferred date, estimated guest count, and any special ideas you have.",
  something_else: "Of course! Please write a short message explaining how we can help, and our team will respond shortly.",
};

export function getIncomingBody(incoming: InboundFlowMessage) {
  return incoming.text?.body
    ?? incoming.interactive?.list_reply?.title
    ?? incoming.interactive?.button_reply?.title
    ?? null;
}

export async function handleWelcomeFlow(context: FlowContext) {
  const selectedId = context.incoming.interactive?.list_reply?.id
    ?? context.incoming.interactive?.button_reply?.id;

  if (selectedId && followUps[selectedId]) {
    await sendAndStore(context, {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: context.incoming.from,
      type: "text",
      text: { body: followUps[selectedId] },
    }, followUps[selectedId], "text");

    await context.supabase
      .from("workflow_runs")
      .update({
        status: "completed",
        current_step: 2,
        context: { selected_option: selectedId },
        finished_at: new Date().toISOString(),
      })
      .eq("conversation_id", context.conversationId)
      .eq("status", "running");
    return;
  }

  const { data: workflow } = await context.supabase
    .from("workflows")
    .select("id")
    .eq("organization_id", context.organizationId)
    .eq("trigger_type", "first_inbound_message")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!workflow) return;

  const { data: existingRun } = await context.supabase
    .from("workflow_runs")
    .select("id")
    .eq("workflow_id", workflow.id)
    .eq("conversation_id", context.conversationId)
    .limit(1)
    .maybeSingle();
  if (existingRun) return;

  const welcomeBody = "Welcome to Nakshatra Hotel & Resort! How may we assist you today?";
  const messageId = await sendAndStore(context, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: context.incoming.from,
    type: "interactive",
    interactive: {
      type: "list",
      header: { type: "text", text: "Welcome to Nakshatra" },
      body: { text: welcomeBody },
      footer: { text: "Choose an option and our team will assist you." },
      action: {
        button: "Explore options",
        sections: [{
          title: "How can we help?",
          rows: [
            { id: "hotel_booking", title: "Hotel booking", description: "Rooms, availability and reservations" },
            { id: "restaurant_booking", title: "Restaurant booking", description: "Reserve a table at our restaurant" },
            { id: "luxury_resort", title: "Luxury resort stay", description: "Plan a premium resort experience" },
            { id: "events_celebrations", title: "Events & celebrations", description: "Birthdays, weddings and special events" },
            { id: "something_else", title: "Something else", description: "Ask our team anything" },
          ],
        }],
      },
    },
  }, `${welcomeBody} [Explore options]`, "interactive");

  await context.supabase.from("workflow_runs").insert({
    organization_id: context.organizationId,
    workflow_id: workflow.id,
    conversation_id: context.conversationId,
    status: "running",
    current_step: 1,
    context: { welcome_message_id: messageId },
    started_at: new Date().toISOString(),
  });
}

async function sendAndStore(
  context: FlowContext,
  payload: Record<string, unknown>,
  body: string,
  messageType: string,
) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!accessToken) throw new Error("WHATSAPP_ACCESS_TOKEN is not configured");

  const response = await fetch(getWhatsAppApiUrl(`${context.phoneNumberId}/messages`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`WhatsApp flow send failed: ${JSON.stringify(result)}`);

  const messageId = result.messages?.[0]?.id as string | undefined;
  await context.supabase.from("messages").insert({
    organization_id: context.organizationId,
    conversation_id: context.conversationId,
    whatsapp_message_id: messageId ?? null,
    direction: "outbound",
    message_type: messageType,
    body,
    status: "sent",
    raw_payload: { request: payload, response: result },
    sent_at: new Date().toISOString(),
  });
  return messageId ?? null;
}
