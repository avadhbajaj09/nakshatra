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
  mediaBaseUrl: string;
  incoming: InboundFlowMessage;
};

const followUps: Record<string, string> = {
  hotel_booking: "Wonderful! Please share your check-in date, check-out date, and number of guests. Our reservations team will help you with the best available rooms.",
  restaurant_booking: "We would be delighted to reserve a table. Please share your preferred date, time, and number of guests.",
  luxury_resort: "Let us help plan your luxury resort stay. Please share your preferred dates, number of guests, and any special requirements.",
  events_celebrations: "We would love to plan your celebration. Please tell us the event type, preferred date, estimated guest count, and any special ideas you have.",
  something_else: "Of course! Please write a short message explaining how we can help, and our team will respond shortly.",
};

const flowImages: Record<string, string> = {
  hotel_booking: "/whatsapp-flow/hotel-booking.jpg",
  restaurant_booking: "/whatsapp-flow/restaurant-booking.jpg",
  luxury_resort: "/whatsapp-flow/luxury-resort.jpg",
  events_celebrations: "/whatsapp-flow/events-celebrations.jpg",
  something_else: "/whatsapp-flow/something-else.jpg",
};

const confirmations: Record<string, string> = {
  hotel_booking: "Thank you! We have received your hotel booking enquiry. Our reservations team will check availability and reply here shortly.",
  restaurant_booking: "Thank you! We have received your table reservation request. Our restaurant team will confirm it here shortly.",
  luxury_resort: "Thank you! We have received your luxury resort stay enquiry. Our reservations team will prepare the best available options and reply here shortly.",
  events_celebrations: "Thank you! We have received your event enquiry. Our events team will review the details and contact you here shortly.",
  something_else: "Thank you! We have received your message. A member of our guest services team will reply here shortly.",
};

type WorkflowContext = {
  selected_option?: string;
  enquiry_details?: string;
  [key: string]: unknown;
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

  const { data: latestRun } = await context.supabase
    .from("workflow_runs")
    .select("id, status, current_step, context")
    .eq("conversation_id", context.conversationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const runContext = toWorkflowContext(latestRun?.context);
  const incomingBody = getIncomingBody(context.incoming)?.trim();

  if (
    latestRun
    && latestRun.current_step === 2
    && runContext.selected_option
    && !runContext.enquiry_details
    && incomingBody
    && !selectedId
  ) {
    const option = runContext.selected_option;
    const caption = confirmations[option];
    const imagePath = flowImages[option];
    if (!caption || !imagePath) return;

    const confirmationMessageId = await sendAndStore(context, {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: context.incoming.from,
      type: "image",
      image: {
        link: getMediaUrl(context.mediaBaseUrl, imagePath),
        caption: `${caption}\n\nDetails: ${truncate(incomingBody, 600)}`,
      },
    }, `${caption} Details: ${incomingBody}`, "image");

    await context.supabase
      .from("workflow_runs")
      .update({
        status: "completed",
        current_step: 3,
        context: {
          ...runContext,
          enquiry_details: incomingBody,
          confirmation_message_id: confirmationMessageId,
          captured_at: new Date().toISOString(),
        },
        finished_at: new Date().toISOString(),
      })
      .eq("id", latestRun.id);
    return;
  }

  if (selectedId && followUps[selectedId] && latestRun?.current_step === 1) {
    const caption = followUps[selectedId];
    const detailsPromptMessageId = await sendAndStore(context, {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: context.incoming.from,
      type: "image",
      image: {
        link: getMediaUrl(context.mediaBaseUrl, flowImages[selectedId]),
        caption,
      },
    }, caption, "image");

    await context.supabase
      .from("workflow_runs")
      .update({
        status: "running",
        current_step: 2,
        context: {
          ...runContext,
          selected_option: selectedId,
          details_prompt_message_id: detailsPromptMessageId,
        },
        finished_at: null,
      })
      .eq("id", latestRun.id);
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
  const welcomeImageId = await sendAndStore(context, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: context.incoming.from,
    type: "image",
    image: {
      link: getMediaUrl(context.mediaBaseUrl, "/whatsapp-flow/welcome.jpg"),
      caption: "Welcome to Nakshatra Hotel & Resort",
    },
  }, "Welcome to Nakshatra Hotel & Resort", "image");

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
    context: {
      welcome_image_message_id: welcomeImageId,
      welcome_menu_message_id: messageId,
    },
    started_at: new Date().toISOString(),
  });
}

function getMediaUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

function toWorkflowContext(value: unknown): WorkflowContext {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as WorkflowContext
    : {};
}

function truncate(value: string, maxLength: number) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
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
