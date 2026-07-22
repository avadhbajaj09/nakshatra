import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getWhatsAppApiUrl } from "@/lib/meta";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const schema = z.object({
  setupKey: z.string().min(16).max(200),
  wabaId: z.string().regex(/^\d+$/),
});

type MetaPhoneNumber = {
  id: string;
  display_phone_number?: string;
  verified_name?: string;
  quality_rating?: string;
  name_status?: string;
};

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid setup request." }, { status: 400 });

  const expected = process.env.ADMIN_SETUP_SECRET;
  if (!expected || !safeEqual(parsed.data.setupKey, expected)) {
    return Response.json({ error: "Invalid setup key." }, { status: 403 });
  }

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!accessToken) return Response.json({ error: "WhatsApp token is not configured." }, { status: 500 });

  const headers = { Authorization: `Bearer ${accessToken}` };
  const phoneResponse = await fetch(
    getWhatsAppApiUrl(`${parsed.data.wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,name_status`),
    { headers, cache: "no-store" },
  );
  const phoneResult = await phoneResponse.json();
  if (!phoneResponse.ok) {
    return Response.json({ error: "Could not read production sender.", details: phoneResult }, { status: 502 });
  }

  const phone = (phoneResult.data as MetaPhoneNumber[] | undefined)?.[0];
  if (!phone?.id) return Response.json({ error: "No production sender was found." }, { status: 404 });

  const subscriptionResponse = await fetch(getWhatsAppApiUrl(`${parsed.data.wabaId}/subscribed_apps`), {
    method: "POST",
    headers,
  });
  const subscriptionResult = await subscriptionResponse.json();
  if (!subscriptionResponse.ok) {
    return Response.json({ error: "Could not subscribe the production account to webhooks.", details: subscriptionResult }, { status: 502 });
  }

  const admin = getSupabaseAdmin();
  const { data: currentAccount, error: accountReadError } = await admin
    .from("whatsapp_accounts")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (accountReadError || !currentAccount) {
    return Response.json({ error: accountReadError?.message ?? "Dashboard WhatsApp account was not found." }, { status: 500 });
  }

  const { error: updateError } = await admin
    .from("whatsapp_accounts")
    .update({
      business_account_id: parsed.data.wabaId,
      phone_number_id: phone.id,
      display_phone_number: phone.display_phone_number ?? "+91 94797 93778",
      verified_name: phone.verified_name ?? "Nakshatra Hotel & Resort",
      status: "connected",
    })
    .eq("id", currentAccount.id);
  if (updateError) return Response.json({ error: updateError.message }, { status: 500 });

  return Response.json({
    connected: true,
    wabaId: parsed.data.wabaId,
    phoneNumberId: phone.id,
    displayPhoneNumber: phone.display_phone_number,
    verifiedName: phone.verified_name,
    qualityRating: phone.quality_rating,
    nameStatus: phone.name_status,
  });
}

function safeEqual(a: string, b: string) {
  const first = Buffer.from(a);
  const second = Buffer.from(b);
  return first.length === second.length && timingSafeEqual(first, second);
}
