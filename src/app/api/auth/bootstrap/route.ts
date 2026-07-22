import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email().max(200),
  password: z.string().min(8).max(128),
  setupKey: z.string().min(16).max(200),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Please check all setup fields." }, { status: 400 });
  const expected = process.env.ADMIN_SETUP_SECRET;
  if (!expected || !safeEqual(parsed.data.setupKey, expected)) return Response.json({ error: "Invalid setup key." }, { status: 403 });
  const admin = getSupabaseAdmin();
  const { count } = await admin.from("organization_members").select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) return Response.json({ error: "Administrator setup is already complete." }, { status: 409 });

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: parsed.data.email, password: parsed.data.password, email_confirm: true,
    user_metadata: { display_name: parsed.data.name },
  });
  if (authError || !authData.user) return Response.json({ error: authError?.message ?? "Could not create administrator." }, { status: 400 });

  const { data: organization, error: orgError } = await admin.from("organizations").insert({ name: "Nakshatra Hotel & Resort", slug: "nakshatra" }).select("id").single();
  if (orgError || !organization) { await admin.auth.admin.deleteUser(authData.user.id); return Response.json({ error: "Could not create workspace." }, { status: 500 }); }
  const { error: memberError } = await admin.from("organization_members").insert({ organization_id: organization.id, user_id: authData.user.id, role: "owner" });
  const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (memberError || !businessAccountId || !phoneNumberId) return Response.json({ error: "Workspace configuration is incomplete." }, { status: 500 });
  await admin.from("whatsapp_accounts").insert({ organization_id: organization.id, business_account_id: businessAccountId, phone_number_id: phoneNumberId, display_phone_number: "+1 555-145-4441", verified_name: "Test Number", status: "connected" });
  return Response.json({ created: true });
}

function safeEqual(a: string, b: string) {
  const first = Buffer.from(a); const second = Buffer.from(b);
  return first.length === second.length && timingSafeEqual(first, second);
}
