"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity, ArrowUpRight, CheckCheck, CircleHelp, ContactRound, GitBranch,
  Inbox, LayoutDashboard, Loader2, LogOut, Menu, MessageCircle, Megaphone,
  Plus, RefreshCw, Search, Users, Workflow, X,
} from "lucide-react";
import { LiveInbox } from "@/components/live-inbox";
import { createClient } from "@/lib/supabase/client";

type Section = "Overview" | "Inbox" | "Campaigns" | "Flows" | "Contacts";
type Contact = { id:string; display_name:string|null; phone:string; wa_id:string; tags:string[]; created_at:string; updated_at:string };
type Conversation = { id:string; status:string; last_message_at:string|null; whatsapp_account_id:string; contact:Contact; whatsapp_account:{ display_phone_number:string|null; verified_name:string|null } };
type Message = { id:string; conversation_id:string; direction:"inbound"|"outbound"; message_type:string; body:string|null; status:string; sent_at:string; whatsapp_message_id:string|null };
type WorkspaceFlow = { id:string; name:string; description:string|null; trigger_type:string; is_active:boolean; updated_at:string };
type WorkspaceData = { conversations:Conversation[]; messages:Message[]; contacts:Contact[]; workflows:WorkspaceFlow[] };

const emptyData:WorkspaceData={conversations:[],messages:[],contacts:[],workflows:[]};
const nav:{label:Section;icon:typeof Inbox}[]=[
  {label:"Overview",icon:LayoutDashboard},{label:"Inbox",icon:Inbox},{label:"Campaigns",icon:Megaphone},{label:"Flows",icon:GitBranch},{label:"Contacts",icon:ContactRound},
];

function Logo(){return <div className="logo"><div className="logoMark"><MessageCircle size={20} strokeWidth={2.7}/></div><span>Nakshatra</span></div>}
function initials(name:string){return name.split(/\s+/).map(value=>value[0]).join("").slice(0,2).toUpperCase()}
function relative(value:string|null){if(!value)return "—";const seconds=Math.max(0,(Date.now()-new Date(value).getTime())/1000);if(seconds<60)return "now";if(seconds<3600)return `${Math.floor(seconds/60)}m`;if(seconds<86400)return `${Math.floor(seconds/3600)}h`;return new Date(value).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}

function Sidebar({active,setActive,open,close,userEmail,workspaceName,logout}:{active:Section;setActive:(section:Section)=>void;open:boolean;close:()=>void;userEmail:string;workspaceName:string;logout:()=>void}){
  return <><aside className={`sidebar ${open?"open":""}`}><div className="sideTop"><Logo/><button className="mobileClose" onClick={close} aria-label="Close navigation"><X size={20}/></button></div><nav><p className="eyebrow">WORKSPACE</p>{nav.map(({label,icon:Icon})=><button key={label} onClick={()=>{setActive(label);close()}} className={active===label?"active":""}><Icon size={18}/><span>{label}</span></button>)}</nav><div className="waStatus"><div><span className="pulse"/><b>WhatsApp connected</b></div><p>+91 94797 93778 · Live</p></div><div className="user"><div className="avatar">NH</div><div><b>{workspaceName}</b><span>{userEmail}</span></div><button className="logoutBtn" onClick={logout} aria-label="Sign out"><LogOut size={16}/></button></div></aside>{open&&<div className="backdrop" onClick={close}/>}</>
}

function Header({title,menu,refresh,loading}:{title:string;menu:()=>void;refresh:()=>void;loading:boolean}){
  const today=new Intl.DateTimeFormat("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date());
  return <header><button className="menu" onClick={menu} aria-label="Open navigation"><Menu size={21}/></button><div><h1>{title}</h1><p>{today}</p></div><div className="headerActions"><button className="iconBtn" onClick={refresh} aria-label="Refresh live data">{loading?<Loader2 className="spin" size={18}/>:<RefreshCw size={18}/>}</button><span className="liveData"><i/>Live data</span></div></header>
}

function EmptyState({icon:Icon,title,body}:{icon:typeof Inbox;title:string;body:string}){
  return <div className="sectionEmpty"><span><Icon size={22}/></span><b>{title}</b><p>{body}</p></div>
}

function Overview({data,go,userName}:{data:WorkspaceData;go:(section:Section)=>void;userName:string}){
  const outbound=data.messages.filter(message=>message.direction==="outbound");
  const delivered=outbound.filter(message=>message.status==="delivered"||message.status==="read").length;
  const read=outbound.filter(message=>message.status==="read").length;
  const stats=[
    {icon:MessageCircle,label:"Messages sent",value:String(outbound.length),note:"Live total",color:"green"},
    {icon:CheckCheck,label:"Delivered",value:String(delivered),note:"Delivered or read",color:"blue"},
    {icon:Activity,label:"Read rate",value:outbound.length?`${Math.round(read/outbound.length*100)}%`:"0%",note:"Based on live statuses",color:"violet"},
    {icon:Users,label:"Contacts",value:String(data.contacts.length),note:"Stored in your workspace",color:"orange"},
  ];
  const days=Array.from({length:7},(_,index)=>{const date=new Date();date.setHours(0,0,0,0);date.setDate(date.getDate()-(6-index));const sent=data.messages.filter(message=>message.direction==="outbound"&&new Date(message.sent_at).toDateString()===date.toDateString()).length;const received=data.messages.filter(message=>message.direction==="inbound"&&new Date(message.sent_at).toDateString()===date.toDateString()).length;return{label:date.toLocaleDateString("en-IN",{weekday:"short"}),sent,received}});
  const chartMax=Math.max(1,...days.flatMap(day=>[day.sent,day.received]));
  const lastMessage=(conversationId:string)=>data.messages.filter(message=>message.conversation_id===conversationId).at(-1);
  return <div className="content"><section className="welcome"><div><span className="hello">Welcome, {userName}</span><h2>Your live WhatsApp workspace.</h2><p>Every number below comes from your connected Supabase records.</p></div><div className="period">Last 7 days</div></section><div className="stats">{stats.map(({icon:Icon,label,value,note,color})=><article className="stat" key={label}><div className={`statIcon ${color}`}><Icon size={20}/></div><span>{label}</span><strong>{value}</strong><small>{note}</small></article>)}</div><div className="gridMain"><article className="panel chartPanel"><div className="panelHead"><div><h3>Message activity</h3><p>Actual sent and received messages</p></div><div className="legend"><span><i className="sent"/>Sent</span><span><i className="received"/>Received</span></div></div><div className="liveChart">{days.map(day=><div className="liveChartDay" key={day.label}><div className="liveBars"><i className="sentBar" style={{height:`${Math.max(day.sent?8:0,day.sent/chartMax*100)}%`}} title={`${day.sent} sent`}/><i className="receivedBar" style={{height:`${Math.max(day.received?8:0,day.received/chartMax*100)}%`}} title={`${day.received} received`}/></div><span>{day.label}</span></div>)}</div></article><article className="panel inboxPanel"><div className="panelHead"><div><h3>Recent conversations</h3><p>Latest from your live inbox</p></div><button onClick={()=>go("Inbox")}>View all <ArrowUpRight size={14}/></button></div>{data.conversations.length?<div>{data.conversations.slice(0,4).map(conversation=>{const name=conversation.contact.display_name||conversation.contact.phone;const message=lastMessage(conversation.id);return <div className="conversation" key={conversation.id}><div className="contactAvatar liveAvatar">{initials(name)}</div><div className="contactText"><b>{name}</b><span>{message?.body||`[${message?.message_type??"conversation"}]`}</span></div><div className="contactMeta"><span>{relative(conversation.last_message_at)}</span></div></div>})}</div>:<EmptyState icon={Inbox} title="No conversations" body="New WhatsApp conversations will appear here."/>}</article></div><div className="gridBottom"><article className="panel quick"><div className="panelHead"><div><h3>Quick actions</h3><p>Open a live workspace section</p></div></div><div><button onClick={()=>go("Inbox")}><span className="qaIcon green"><Inbox size={19}/></span><div><b>Open inbox</b><small>Reply to live conversations</small></div><ArrowUpRight size={16}/></button><button onClick={()=>go("Flows")}><span className="qaIcon purple"><Workflow size={19}/></span><div><b>View flows</b><small>{data.workflows.length} saved</small></div><ArrowUpRight size={16}/></button><button onClick={()=>go("Contacts")}><span className="qaIcon orange"><ContactRound size={19}/></span><div><b>View contacts</b><small>{data.contacts.length} stored</small></div><ArrowUpRight size={16}/></button></div></article><article className="panel campaignMini"><div className="panelHead"><div><h3>Active campaign</h3><p>Bulk campaigns are not configured yet</p></div></div><EmptyState icon={Megaphone} title="No active campaign" body="Campaign totals will appear after the first approved broadcast."/></article></div></div>
}

function CampaignsView(){return <div className="content"><div className="pageIntro"><div><h2>Campaigns</h2><p>Only real approved-template broadcasts will appear here.</p></div><button className="primary" disabled title="Campaign creation is not configured yet"><Plus size={17}/>Create campaign</button></div><div className="stats campaignStats"><article><span>Total sent</span><strong>0</strong><small>No campaigns recorded</small></article><article><span>Average delivery</span><strong>0%</strong><small>No delivery data</small></article><article><span>Average read rate</span><strong>0%</strong><small>No read data</small></article></div><article className="panel tablePanel"><div className="panelHead"><div><h3>All campaigns</h3><p>Live campaign records only</p></div></div><EmptyState icon={Megaphone} title="No campaigns yet" body="Campaign creation will be enabled after templates and opt-in audiences are configured."/></article></div>}

function FlowsView({flows}:{flows:WorkspaceFlow[]}){return <div className="content"><div className="pageIntro"><div><h2>Flows</h2><p>Saved automation workflows from your workspace.</p></div><button className="primary" disabled title="Flow editing is not configured yet"><Plus size={17}/>Create flow</button></div><article className="panel tablePanel"><div className="panelHead"><div><h3>{flows.length} flows</h3><p>Live workflow records only</p></div></div>{flows.length?<div className="table"><div className="tr flowRow th"><span>FLOW</span><span>TRIGGER</span><span>STATUS</span><span>UPDATED</span></div>{flows.map(flow=><div className="tr flowRow" key={flow.id}><b>{flow.name}</b><span>{flow.trigger_type}</span><span><i className={`status ${flow.is_active?"sending":""}`}/>{flow.is_active?"Active":"Draft"}</span><span>{new Date(flow.updated_at).toLocaleDateString("en-IN")}</span></div>)}</div>:<EmptyState icon={GitBranch} title="No flows yet" body="No automation workflow has been saved in Supabase."/>}</article></div>}

function ContactsView({contacts}:{contacts:Contact[]}){return <div className="content"><div className="pageIntro"><div><h2>Contacts</h2><p>Contacts created from real WhatsApp conversations.</p></div></div><article className="panel tablePanel"><div className="panelHead"><div><h3>{contacts.length} contacts</h3><p>Live Supabase contact records</p></div><div className="inboxSearch small"><Search size={16}/><input placeholder="Search is available in Inbox" disabled/></div></div>{contacts.length?<div className="table contactsTable"><div className="tr th"><span>CONTACT</span><span>PHONE</span><span>CHANNEL</span><span>TAGS</span><span>LAST ACTIVITY</span></div>{contacts.map(contact=>{const name=contact.display_name||contact.phone;return <div className="tr" key={contact.id}><b><span className="tinyAvatar">{initials(name)}</span>{name}</b><span>+{contact.phone}</span><span className="opted"><MessageCircle size={13}/>WhatsApp</span><span>{contact.tags.length?contact.tags.map(tag=><em key={tag}>{tag}</em>):"—"}</span><span>{relative(contact.updated_at)}</span></div>})}</div>:<EmptyState icon={ContactRound} title="No contacts yet" body="Contacts are created automatically when someone messages your WhatsApp sender."/>}</article></div>}

export function Dashboard({userEmail,userName,workspaceName}:{userEmail:string;userName:string;workspaceName:string}){
  const [active,setActive]=useState<Section>("Overview");
  const [menuOpen,setMenuOpen]=useState(false);
  const [data,setData]=useState<WorkspaceData>(emptyData);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const load=useCallback(async()=>{setLoading(true);setError("");try{const supabase=createClient();const {data:sessionData}=await supabase.auth.getSession();const token=sessionData.session?.access_token;if(!token)throw new Error("Your session expired. Please sign in again.");const response=await fetch("/api/inbox",{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});const result=await response.json();if(!response.ok)throw new Error(result.error??"Could not load workspace data");setData({conversations:result.conversations??[],messages:result.messages??[],contacts:result.contacts??[],workflows:result.workflows??[]})}catch(cause){setError(cause instanceof Error?cause.message:"Could not load workspace data")}finally{setLoading(false)}},[]);
  useEffect(()=>{queueMicrotask(load);const supabase=createClient();const channel=supabase.channel("dashboard-live-data").on("postgres_changes",{event:"*",schema:"public",table:"messages"},()=>load()).on("postgres_changes",{event:"*",schema:"public",table:"conversations"},()=>load()).subscribe();return()=>{void supabase.removeChannel(channel)}},[load]);
  async function logout(){await createClient().auth.signOut();window.location.assign("/login")}
  const body=active==="Overview"?<Overview data={data} go={setActive} userName={userName}/>:active==="Inbox"?<LiveInbox/>:active==="Campaigns"?<CampaignsView/>:active==="Flows"?<FlowsView flows={data.workflows}/>:<ContactsView contacts={data.contacts}/>;
  return <div className="app"><Sidebar active={active} setActive={setActive} open={menuOpen} close={()=>setMenuOpen(false)} userEmail={userEmail} workspaceName={workspaceName} logout={logout}/><main className="main"><Header title={active} menu={()=>setMenuOpen(true)} refresh={load} loading={loading}/>{error&&<div className="workspaceError">{error}</div>}{body}<footer><span><CircleHelp size={14}/>Live workspace · Protected by Supabase Auth</span><span>Official WhatsApp Cloud API</span></footer></main></div>
}
