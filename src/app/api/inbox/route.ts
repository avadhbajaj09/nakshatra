import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const admin = getSupabaseAdmin();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { data: membership } = await admin.from("organization_members").select("organization_id").eq("user_id", authData.user.id).maybeSingle();
  if (!membership) return Response.json({ error: "No workspace access" }, { status: 403 });
  const { data: conversations, error } = await admin.from("conversations")
    .select("id,status,last_message_at,whatsapp_account_id,contact:contacts(id,display_name,phone,wa_id,tags,created_at,updated_at),whatsapp_account:whatsapp_accounts(display_phone_number,verified_name)")
    .eq("organization_id", membership.organization_id).order("last_message_at", { ascending: false }).limit(100);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const ids = (conversations ?? []).map(item => item.id);
  const { data: messages } = ids.length ? await admin.from("messages").select("id,conversation_id,direction,message_type,body,status,sent_at,whatsapp_message_id").in("conversation_id", ids).order("sent_at", { ascending: true }).limit(2000) : { data: [] };
  const [{ data: contacts, error: contactsError }, { data: workflows, error: workflowsError }] = await Promise.all([
    admin.from("contacts").select("id,display_name,phone,wa_id,tags,created_at,updated_at").eq("organization_id", membership.organization_id).order("updated_at", { ascending: false }).limit(1000),
    admin.from("workflows").select("id,name,description,trigger_type,is_active,updated_at").eq("organization_id", membership.organization_id).order("updated_at", { ascending: false }).limit(100),
  ]);
  if (contactsError || workflowsError) return Response.json({ error: contactsError?.message ?? workflowsError?.message }, { status: 500 });
  return Response.json({ conversations: conversations ?? [], messages: messages ?? [], contacts: contacts ?? [], workflows: workflows ?? [] });
}
