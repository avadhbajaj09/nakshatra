import assert from "node:assert/strict";
import { handleWelcomeFlow, type InboundFlowMessage } from "../src/lib/whatsapp-flow";

type StoredRun = {
  id: string;
  workflow_id: string;
  conversation_id: string;
  status: string;
  current_step: number;
  context: Record<string, unknown>;
  finished_at?: string | null;
};

type TestState = {
  run: StoredRun | null;
  messages: Record<string, unknown>[];
  updates: Record<string, unknown>[];
};

const routes = [
  ["hotel_booking", "hotel-booking.jpg", "check-in date"],
  ["restaurant_booking", "restaurant-booking.jpg", "preferred date"],
  ["luxury_resort", "luxury-resort.jpg", "preferred dates"],
  ["events_celebrations", "events-celebrations.jpg", "event type"],
  ["something_else", "something-else.jpg", "short message"],
] as const;

process.env.WHATSAPP_ACCESS_TOKEN = "verification-token";
process.env.WHATSAPP_GRAPH_API_VERSION = "v25.0";

let sentPayloads: Record<string, unknown>[] = [];
let messageSequence = 0;
globalThis.fetch = async (_input, init) => {
  const payload = JSON.parse(String(init?.body)) as Record<string, unknown>;
  sentPayloads.push(payload);
  messageSequence += 1;
  return Response.json({ messages: [{ id: `verification-message-${messageSequence}` }] });
};

function createSupabaseMock(state: TestState) {
  return {
    from(table: string) {
      let operation: "select" | "update" = "select";
      let updatePayload: Record<string, unknown> | null = null;
      const builder = {
        select() {
          operation = "select";
          return builder;
        },
        update(payload: Record<string, unknown>) {
          operation = "update";
          updatePayload = payload;
          return builder;
        },
        eq() {
          if (operation === "update" && table === "workflow_runs" && state.run && updatePayload) {
            state.run = { ...state.run, ...updatePayload } as StoredRun;
            state.updates.push(updatePayload);
            return Promise.resolve({ data: state.run, error: null });
          }
          return builder;
        },
        order() { return builder; },
        limit() { return builder; },
        maybeSingle: async () => ({
          data: table === "workflow_runs"
            ? state.run
            : table === "workflows"
              ? { id: "workflow-1" }
              : null,
          error: null,
        }),
        insert: async (payload: Record<string, unknown>) => {
          if (table === "messages") state.messages.push(payload);
          if (table === "workflow_runs") {
            state.run = {
              id: "run-1",
              workflow_id: String(payload.workflow_id),
              conversation_id: String(payload.conversation_id),
              status: String(payload.status),
              current_step: Number(payload.current_step),
              context: payload.context as Record<string, unknown>,
              finished_at: payload.finished_at as string | null | undefined,
            };
          }
          return { data: payload, error: null };
        },
      };
      return builder;
    },
  };
}

function context(state: TestState, incoming: InboundFlowMessage) {
  return {
    supabase: createSupabaseMock(state) as never,
    accountId: "account-1",
    organizationId: "organization-1",
    conversationId: "conversation-1",
    phoneNumberId: "phone-number-1",
    mediaBaseUrl: "https://nakshatra.example",
    incoming,
  };
}

async function verifyWelcome() {
  const state: TestState = { run: null, messages: [], updates: [] };
  sentPayloads = [];
  await handleWelcomeFlow(context(state, {
    id: "incoming-welcome",
    from: "919999999999",
    timestamp: "1784743659",
    type: "text",
    text: { body: "Hello" },
  }));

  assert.deepEqual(sentPayloads.map((payload) => payload.type), ["image", "interactive"]);
  assert.equal(state.run?.current_step, 1);
  assert.equal(state.run?.status, "running");
}

async function verifyRoute(option: typeof routes[number]) {
  const [id, imageName, promptFragment] = option;
  const state: TestState = {
    run: {
      id: "run-1",
      workflow_id: "workflow-1",
      conversation_id: "conversation-1",
      status: "running",
      current_step: 1,
      context: { welcome_menu_message_id: "welcome-1" },
    },
    messages: [],
    updates: [],
  };
  sentPayloads = [];

  await handleWelcomeFlow(context(state, {
    id: `selection-${id}`,
    from: "919999999999",
    timestamp: "1784743660",
    type: "interactive",
    interactive: { type: "list_reply", list_reply: { id, title: id } },
  }));

  const promptPayload = sentPayloads[0] as { type?: string; image?: { link?: string; caption?: string } };
  assert.equal(promptPayload.type, "image");
  assert.match(promptPayload.image?.link ?? "", new RegExp(`${imageName}$`));
  assert.match(promptPayload.image?.caption ?? "", new RegExp(promptFragment, "i"));
  assert.equal(state.run?.status, "running");
  assert.equal(state.run?.current_step, 2);
  assert.equal(state.run?.context.selected_option, id);

  const details = `Verification details for ${id}`;
  await handleWelcomeFlow(context(state, {
    id: `details-${id}`,
    from: "919999999999",
    timestamp: "1784743661",
    type: "text",
    text: { body: details },
  }));

  const confirmationPayload = sentPayloads[1] as { type?: string; image?: { link?: string; caption?: string } };
  assert.equal(confirmationPayload.type, "image");
  assert.match(confirmationPayload.image?.link ?? "", new RegExp(`${imageName}$`));
  assert.match(confirmationPayload.image?.caption ?? "", /received/i);
  assert.match(confirmationPayload.image?.caption ?? "", new RegExp(details));
  assert.equal(state.run?.status, "completed");
  assert.equal(state.run?.current_step, 3);
  assert.equal(state.run?.context.enquiry_details, details);
  assert.equal(state.messages.length, 2);
}

async function verifyPreviouslyCompletedStepTwo() {
  const state: TestState = {
    run: {
      id: "legacy-run",
      workflow_id: "workflow-1",
      conversation_id: "conversation-1",
      status: "completed",
      current_step: 2,
      context: { selected_option: "restaurant_booking" },
      finished_at: "2026-07-23T00:00:00.000Z",
    },
    messages: [],
    updates: [],
  };
  sentPayloads = [];

  await handleWelcomeFlow(context(state, {
    id: "legacy-details",
    from: "919999999999",
    timestamp: "1784743662",
    type: "text",
    text: { body: "Tomorrow at 8 PM for 4 guests" },
  }));

  assert.equal(sentPayloads.length, 1);
  assert.equal(state.run?.current_step, 3);
  assert.equal(state.run?.context.enquiry_details, "Tomorrow at 8 PM for 4 guests");
}

async function main() {
  await verifyWelcome();
  for (const route of routes) await verifyRoute(route);
  await verifyPreviouslyCompletedStepTwo();

  console.log("Verified welcome image + menu");
  for (const [id] of routes) console.log(`Verified ${id}: selection -> details -> image confirmation -> completed lead`);
  console.log("Verified recovery for enquiries that previously stopped after step 2");
}

void main();
