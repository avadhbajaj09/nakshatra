"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, CheckCheck, Loader2, MoreHorizontal, Plus, RefreshCw, Search, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Contact = { id: string; display_name: string | null; phone: string; wa_id: string; tags: string[] };
type Conversation = { id: string; status: string; last_message_at: string | null; whatsapp_account_id: string; contact: Contact; whatsapp_account: { display_phone_number: string | null; verified_name: string | null } };
type Message = { id: string; conversation_id: string; direction: "inbound"|"outbound"; message_type: string; body: string|null; status: string; sent_at: string; whatsapp_message_id: string|null };

function initials(name: string) { return name.split(/\s+/).map(v=>v[0]).join("").slice(0,2).toUpperCase(); }
function relative(value: string|null) { if(!value) return ""; const seconds=Math.max(0,(Date.now()-new Date(value).getTime())/1000); if(seconds<60)return "now"; if(seconds<3600)return `${Math.floor(seconds/60)}m`; if(seconds<86400)return `${Math.floor(seconds/3600)}h`; return new Date(value).toLocaleDateString("en-IN",{day:"numeric",month:"short"}); }

export function LiveInbox() {
  const [conversations,setConversations]=useState<Conversation[]>([]);
  const [messages,setMessages]=useState<Message[]>([]);
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [draft,setDraft]=useState("");
  const [query,setQuery]=useState("");
  const [loading,setLoading]=useState(true);
  const [sending,setSending]=useState(false);
  const [error,setError]=useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const supabase=createClient(); const {data}=await supabase.auth.getSession(); const token=data.session?.access_token;
      if(!token) throw new Error("Your session expired. Please sign in again.");
      const response=await fetch("/api/inbox",{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
      const result=await response.json(); if(!response.ok) throw new Error(result.error??"Could not load inbox");
      setConversations(result.conversations); setMessages(result.messages);
      setSelectedId(current=>current && result.conversations.some((c:Conversation)=>c.id===current)?current:result.conversations[0]?.id??null);
    } catch(cause){setError(cause instanceof Error?cause.message:"Could not load inbox");} finally{setLoading(false);}
  },[]);

  useEffect(()=>{queueMicrotask(load); const supabase=createClient(); const channel=supabase.channel("live-inbox").on("postgres_changes",{event:"*",schema:"public",table:"messages"},()=>load()).on("postgres_changes",{event:"*",schema:"public",table:"conversations"},()=>load()).subscribe(); return()=>{void supabase.removeChannel(channel)}},[load]);
  const selected=conversations.find(c=>c.id===selectedId)??null;
  const selectedMessages=messages.filter(m=>m.conversation_id===selectedId);
  const filtered=useMemo(()=>conversations.filter(c=>`${c.contact.display_name??""} ${c.contact.phone}`.toLowerCase().includes(query.toLowerCase())),[conversations,query]);
  function lastMessage(id:string){return messages.filter(m=>m.conversation_id===id).at(-1);}

  async function send(){
    if(!selected||!draft.trim()||sending)return; setSending(true); setError("");
    try{const supabase=createClient();const {data}=await supabase.auth.getSession();const token=data.session?.access_token;if(!token)throw new Error("Please sign in again.");const response=await fetch("/api/messages/send",{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({whatsappAccountId:selected.whatsapp_account_id,conversationId:selected.id,to:selected.contact.wa_id,body:draft.trim()})});const result=await response.json();if(!response.ok)throw new Error(result.error??result.details?.error?.message??"Message failed");setDraft("");await load();}catch(cause){setError(cause instanceof Error?cause.message:"Message failed");}finally{setSending(false);}
  }

  if(loading)return <div className="inboxLoading"><Loader2 className="spin"/><b>Opening live inbox…</b><span>Connecting securely to Supabase</span></div>;
  return <div className="inboxView panel"><div className="conversationList"><div className="inboxSearch"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search conversations"/><button onClick={load} aria-label="Refresh"><RefreshCw size={14}/></button></div>{filtered.length===0?<div className="emptyList"><b>No conversations yet</b><span>Reply to the Meta test number to start one.</span></div>:filtered.map(c=>{const last=lastMessage(c.id);const name=c.contact.display_name||c.contact.phone;return <button className={selectedId===c.id?"selected":""} key={c.id} onClick={()=>setSelectedId(c.id)}><div className="contactAvatar liveAvatar">{initials(name)}</div><div className="contactText"><b>{name}</b><span>{last?.body||`[${last?.message_type??"new conversation"}]`}</span></div><div className="contactMeta"><span>{relative(c.last_message_at)}</span></div></button>})}</div><div className="chat">{selected?<><div className="chatHead"><div className="contactAvatar liveAvatar">{initials(selected.contact.display_name||selected.contact.phone)}</div><div><b>{selected.contact.display_name||selected.contact.phone}</b><span><i/>WhatsApp · {selected.status}</span></div><MoreHorizontal/></div><div className="chatBody"><div className="day">SECURE WHATSAPP CONVERSATION</div>{selectedMessages.length===0?<div className="chatEmpty">No messages stored for this conversation.</div>:selectedMessages.map(m=><div key={m.id} className={`bubble ${m.direction==="outbound"?"out":"in"}`}>{m.body||`[${m.message_type}]`}<small>{new Date(m.sent_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}{m.direction==="outbound"&&(m.status==="read"?<CheckCheck className="read" size={13}/>:m.status==="delivered"?<CheckCheck size={13}/>:<Check size={13}/>)}</small></div>)}</div>{error&&<div className="inboxError"><AlertCircle size={14}/>{error}</div>}<div className="composer"><button aria-label="Add attachment" disabled><Plus/></button><input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey)send()}} placeholder="Reply within the 24-hour service window…"/><button className="sendBtn" onClick={send} disabled={sending||!draft.trim()}>{sending?<Loader2 className="spin" size={18}/>:<Send size={18}/>}</button></div></>:<div className="noSelection"><b>Select a conversation</b><span>Incoming WhatsApp messages will appear here in real time.</span></div>}</div>{selected&&<aside className="details"><div className="bigAvatar liveAvatar">{initials(selected.contact.display_name||selected.contact.phone)}</div><h3>{selected.contact.display_name||"WhatsApp guest"}</h3><p>+{selected.contact.phone}</p><hr/><span>CHANNEL</span><b>{selected.whatsapp_account.verified_name||"Nakshatra WhatsApp"}</b><span>TAGS</span><div>{selected.contact.tags.length?selected.contact.tags.map(tag=><em key={tag}>{tag}</em>):<em>Guest</em>}</div><span>LAST ACTIVITY</span><b>{selected.last_message_at?new Date(selected.last_message_at).toLocaleString("en-IN"):"—"}</b></aside>}</div>;
}
