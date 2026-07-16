"use client";

import { useMemo, useState } from "react";
import {
  Activity, ArrowUpRight, Bell, Bot, Check, CheckCheck, ChevronDown,
  CircleHelp, Clock3, ContactRound, GitBranch, Inbox, LayoutDashboard,
  Megaphone, Menu, MessageCircle, MoreHorizontal, Plus, Search, Send,
  Settings, Sparkles, Users, Workflow, X, Zap,
} from "lucide-react";

type Section = "Overview" | "Inbox" | "Campaigns" | "Flows" | "Contacts";

const nav: { label: Section; icon: typeof Inbox; count?: string }[] = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Inbox", icon: Inbox, count: "12" },
  { label: "Campaigns", icon: Megaphone },
  { label: "Flows", icon: GitBranch },
  { label: "Contacts", icon: ContactRound },
];

const conversations = [
  { initials: "AM", name: "Aarav Mehta", text: "Yes, please confirm my booking", time: "2m", unread: 2, color: "#f6c48d" },
  { initials: "SK", name: "Sara Khan", text: "Thank you! That was very helpful.", time: "8m", unread: 0, color: "#b5d7c7" },
  { initials: "RP", name: "Rohan Patel", text: "Can I change the delivery address?", time: "18m", unread: 1, color: "#a9c8ed" },
  { initials: "NP", name: "Nisha Prasad", text: "Photo", time: "1h", unread: 0, color: "#d7b5d9" },
  { initials: "VJ", name: "Vikram Jain", text: "Okay, got it 👍", time: "3h", unread: 0, color: "#f3d29e" },
];

const campaigns = [
  { name: "Monsoon Sale — VIP", status: "Sending", audience: "4,820", sent: "3,412", rate: "71%", date: "Today, 10:30 AM" },
  { name: "Order feedback", status: "Scheduled", audience: "1,240", sent: "—", rate: "—", date: "Tomorrow, 9:00 AM" },
  { name: "June product update", status: "Completed", audience: "8,590", sent: "8,516", rate: "99.1%", date: "Jun 28, 2026" },
  { name: "Abandoned cart · 24h", status: "Completed", audience: "690", sent: "674", rate: "97.7%", date: "Jun 25, 2026" },
];

function Logo() {
  return <div className="logo"><div className="logoMark"><MessageCircle size={20} strokeWidth={2.7}/></div><span>WaFlow</span></div>;
}

function Sidebar({ active, setActive, open, close }: { active: Section; setActive: (s: Section) => void; open: boolean; close: () => void }) {
  return <><aside className={`sidebar ${open ? "open" : ""}`}>
    <div className="sideTop"><Logo/><button className="mobileClose" onClick={close}><X size={20}/></button></div>
    <nav>
      <p className="eyebrow">WORKSPACE</p>
      {nav.map(({ label, icon: Icon, count }) => <button key={label} onClick={() => {setActive(label); close();}} className={active === label ? "active" : ""}>
        <Icon size={18}/><span>{label}</span>{count && <b>{count}</b>}
      </button>)}
      <p className="eyebrow spaceTop">MANAGE</p>
      <button><Workflow size={18}/><span>Templates</span></button>
      <button><Users size={18}/><span>Team</span></button>
      <button><Settings size={18}/><span>Settings</span></button>
    </nav>
    <div className="waStatus"><div><span className="pulse"/><b>WhatsApp connected</b></div><p>+91 98765 43210</p></div>
    <div className="user"><div className="avatar">SM</div><div><b>Shikha Mehta</b><span>Administrator</span></div><MoreHorizontal size={18}/></div>
  </aside>{open && <div className="backdrop" onClick={close}/>}</>;
}

function Header({ title, menu }: { title: string; menu: () => void }) {
  return <header><button className="menu" onClick={menu}><Menu size={21}/></button><div><h1>{title}</h1><p>Thursday, 16 July 2026</p></div><div className="headerActions"><button className="iconBtn"><Search size={18}/></button><button className="iconBtn notification"><Bell size={18}/><i/></button><button className="primary"><Plus size={17}/><span>New campaign</span></button></div></header>;
}

function Overview({ go }: { go: (s: Section) => void }) {
  const stats = [
    { icon: MessageCircle, label: "Messages sent", value: "24,892", change: "+12.5%", color: "green" },
    { icon: CheckCheck, label: "Delivered", value: "23,718", change: "95.3%", color: "blue" },
    { icon: Activity, label: "Read rate", value: "78.4%", change: "+4.2%", color: "violet" },
    { icon: Users, label: "Active contacts", value: "8,429", change: "+342", color: "orange" },
  ];
  return <div className="content">
    <section className="welcome"><div><span className="hello">Good morning, Shikha <Sparkles size={16}/></span><h2>Your WhatsApp is doing great.</h2><p>Here’s what’s happening with your conversations today.</p></div><div className="period">Last 7 days <ChevronDown size={15}/></div></section>
    <div className="stats">{stats.map(({icon: Icon, label, value, change, color}) => <article className="stat" key={label}><div className={`statIcon ${color}`}><Icon size={20}/></div><span>{label}</span><strong>{value}</strong><small className={change.startsWith("+") ? "up" : ""}><ArrowUpRight size={13}/>{change}<em> vs last week</em></small></article>)}</div>
    <div className="gridMain">
      <article className="panel chartPanel"><div className="panelHead"><div><h3>Message activity</h3><p>Sent and received messages</p></div><div className="legend"><span><i className="sent"/>Sent</span><span><i className="received"/>Received</span></div></div><div className="chart">
        <div className="yaxis"><span>4k</span><span>3k</span><span>2k</span><span>1k</span><span>0</span></div>
        <svg viewBox="0 0 700 220" preserveAspectRatio="none" aria-label="Messages activity chart"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#18a878" stopOpacity=".22"/><stop offset="1" stopColor="#18a878" stopOpacity="0"/></linearGradient></defs><path className="area" d="M0,168 C45,151 71,116 112,128 S176,137 221,100 S293,99 336,112 S401,41 449,55 S510,88 557,62 S627,78 700,25 L700,220 L0,220Z"/><path className="line1" d="M0,168 C45,151 71,116 112,128 S176,137 221,100 S293,99 336,112 S401,41 449,55 S510,88 557,62 S627,78 700,25"/><path className="line2" d="M0,190 C54,181 75,157 119,164 S181,171 228,148 S288,158 337,151 S404,104 451,117 S516,145 561,127 S630,139 700,92"/></svg>
        <div className="xaxis"><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span></div>
      </div></article>
      <article className="panel inboxPanel"><div className="panelHead"><div><h3>Recent conversations</h3><p>Latest from your inbox</p></div><button onClick={() => go("Inbox")}>View all <ArrowUpRight size={14}/></button></div><div>{conversations.slice(0,4).map(c => <div className="conversation" key={c.name}><div className="contactAvatar" style={{background:c.color}}>{c.initials}</div><div className="contactText"><b>{c.name}</b><span>{c.text}</span></div><div className="contactMeta"><span>{c.time}</span>{c.unread > 0 && <b>{c.unread}</b>}</div></div>)}</div></article>
    </div>
    <div className="gridBottom">
      <article className="panel quick"><div className="panelHead"><div><h3>Quick actions</h3><p>Jump right back in</p></div></div><div><button onClick={() => go("Campaigns")}><span className="qaIcon green"><Send size={19}/></span><div><b>Send a broadcast</b><small>Reach your audience instantly</small></div><ArrowUpRight size={16}/></button><button onClick={() => go("Flows")}><span className="qaIcon purple"><Bot size={19}/></span><div><b>Create automation</b><small>Build a no-code message flow</small></div><ArrowUpRight size={16}/></button><button onClick={() => go("Contacts")}><span className="qaIcon orange"><ContactRound size={19}/></span><div><b>Import contacts</b><small>Upload a CSV contact list</small></div><ArrowUpRight size={16}/></button></div></article>
      <article className="panel campaignMini"><div className="panelHead"><div><h3>Active campaign</h3><p>Monsoon Sale — VIP customers</p></div><span className="live"><i/>Live</span></div><div className="campaignNumbers"><div><strong>3,412</strong><span>Sent</span></div><div><strong>3,298</strong><span>Delivered</span></div><div><strong>2,674</strong><span>Read</span></div></div><div className="progress"><i/></div><div className="campaignFooter"><span><Clock3 size={14}/>Started 2h ago</span><b>71% complete</b></div></article>
    </div>
  </div>;
}

function InboxView() {
  const [selected, setSelected] = useState(conversations[0]);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState(["Hi Aarav! Your booking request is ready.", "Yes, please confirm my booking"]);
  function send(){ if(!draft.trim()) return; setMessages([...messages, draft]); setDraft(""); }
  return <div className="inboxView panel"><div className="conversationList"><div className="inboxSearch"><Search size={17}/><input placeholder="Search conversations"/></div>{conversations.map(c=><button className={selected.name===c.name?"selected":""} key={c.name} onClick={()=>setSelected(c)}><div className="contactAvatar" style={{background:c.color}}>{c.initials}</div><div className="contactText"><b>{c.name}</b><span>{c.text}</span></div><div className="contactMeta"><span>{c.time}</span>{c.unread>0&&<b>{c.unread}</b>}</div></button>)}</div><div className="chat"><div className="chatHead"><div className="contactAvatar" style={{background:selected.color}}>{selected.initials}</div><div><b>{selected.name}</b><span><i/>online</span></div><MoreHorizontal/></div><div className="chatBody"><div className="day">TODAY</div>{messages.map((m,i)=><div key={i} className={`bubble ${i%2===0?"out":"in"}`}>{m}<small>{i%2===0?"10:42 AM":"10:44 AM"}{i%2===0&&<CheckCheck size={13}/>}</small></div>)}</div><div className="composer"><button><Plus/></button><input value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Write a message..."/><button className="sendBtn" onClick={send}><Send size={18}/></button></div></div><aside className="details"><div className="bigAvatar" style={{background:selected.color}}>{selected.initials}</div><h3>{selected.name}</h3><p>+91 98765 00021</p><hr/><span>ASSIGNED TO</span><b>Shikha Mehta</b><span>TAGS</span><div><em>VIP</em><em>Booking</em></div><span>LAST ACTIVITY</span><b>2 minutes ago</b></aside></div>;
}

function CampaignsView() {
  return <div className="content"><div className="pageIntro"><div><h2>Campaigns</h2><p>Send approved templates to opted-in audiences and track delivery.</p></div><button className="primary"><Plus size={17}/>Create campaign</button></div><div className="stats campaignStats"><article><span>Total sent</span><strong>38,420</strong><small>Across 12 campaigns</small></article><article><span>Average delivery</span><strong>96.8%</strong><small className="up">+1.4% this month</small></article><article><span>Average read rate</span><strong>79.2%</strong><small>Industry avg. 74%</small></article></div><article className="panel tablePanel"><div className="panelHead"><div><h3>All campaigns</h3><p>Recent and scheduled broadcasts</p></div><div className="period">All statuses <ChevronDown size={15}/></div></div><div className="table"><div className="tr th"><span>CAMPAIGN</span><span>STATUS</span><span>AUDIENCE</span><span>SENT</span><span>DELIVERY</span><span>DATE</span></div>{campaigns.map(c=><div className="tr" key={c.name}><b>{c.name}</b><span><i className={`status ${c.status.toLowerCase()}`}/>{c.status}</span><span>{c.audience}</span><span>{c.sent}</span><span>{c.rate}</span><span>{c.date}</span></div>)}</div></article></div>;
}

function FlowsView() {
  const [published, setPublished] = useState(false);
  return <div className="flowPage"><div className="flowToolbar"><div><h2>New customer welcome</h2><span><i className={published?"on":""}/>{published?"Published":"Draft saved"}</span></div><div><button className="secondary">Preview</button><button className="primary" onClick={()=>setPublished(!published)}>{published?"Unpublish":"Publish flow"}</button></div></div><div className="flowBuilder"><aside className="nodePalette"><p className="eyebrow">BUILDING BLOCKS</p><button><span className="nodeIcon trigger"><Zap/></span><div><b>Trigger</b><small>Starts your flow</small></div></button><button><span className="nodeIcon message"><MessageCircle/></span><div><b>Send message</b><small>Text or template</small></div></button><button><span className="nodeIcon condition"><GitBranch/></span><div><b>Condition</b><small>Branch by response</small></div></button><button><span className="nodeIcon wait"><Clock3/></span><div><b>Wait</b><small>Add a delay</small></div></button><p className="dragHint">Drag blocks onto the canvas</p></aside><div className="canvas"><div className="dots"/><div className="flowNode triggerNode"><span><Zap size={15}/>TRIGGER</span><b>New conversation started</b><small>When a contact sends any message</small><i/></div><div className="connector c1"/><button className="addNode n1"><Plus/></button><div className="flowNode msgNode"><span><MessageCircle size={15}/>MESSAGE</span><b>Welcome message</b><p>Hi {"{{first_name}}"}! 👋 Thanks for reaching out. How can we help?</p><i/></div><div className="connector c2"/><button className="addNode n2"><Plus/></button><div className="flowNode condNode"><span><GitBranch size={15}/>CONDITION</span><b>Customer response</b><small>Route based on button selected</small><div className="branches"><em>Sales</em><em>Support</em></div></div></div><aside className="properties"><div className="propHead"><h3>Welcome message</h3><button><X/></button></div><label>Message type<select><option>Text message</option><option>Approved template</option></select></label><label>Message<textarea defaultValue={'Hi {{first_name}}! 👋 Thanks for reaching out. How can we help you today?'}/><small>81 / 1,024 characters</small></label><label>Quick reply buttons</label><div className="reply"><span>Talk to sales</span><MoreHorizontal/></div><div className="reply"><span>Get support</span><MoreHorizontal/></div><button className="addReply"><Plus/>Add quick reply</button></aside></div></div>;
}

function ContactsView() {
  const rows = ["Aarav Mehta","Sara Khan","Rohan Patel","Nisha Prasad","Vikram Jain","Ananya Shah"];
  return <div className="content"><div className="pageIntro"><div><h2>Contacts</h2><p>Manage opt-ins, segments, and customer information.</p></div><div><button className="secondary">Import CSV</button><button className="primary"><Plus size={17}/>Add contact</button></div></div><article className="panel tablePanel"><div className="panelHead"><div><h3>8,429 contacts</h3><p>All opted-in WhatsApp customers</p></div><div className="inboxSearch small"><Search size={16}/><input placeholder="Search contacts"/></div></div><div className="table contactsTable"><div className="tr th"><span>CONTACT</span><span>PHONE</span><span>STATUS</span><span>TAGS</span><span>LAST SEEN</span></div>{rows.map((r,i)=><div className="tr" key={r}><b><span className="tinyAvatar">{r.split(" ").map(x=>x[0]).join("")}</span>{r}</b><span>+91 98765 00{20+i}</span><span className="opted"><Check size={13}/>Opted in</span><span><em>{i%2?"Customer":"VIP"}</em></span><span>{i<2?"Today":"Jul "+(14-i)}</span></div>)}</div></article></div>;
}

export function Dashboard() {
  const [active, setActive] = useState<Section>("Overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const body = useMemo(()=> active === "Overview" ? <Overview go={setActive}/> : active === "Inbox" ? <InboxView/> : active === "Campaigns" ? <CampaignsView/> : active === "Flows" ? <FlowsView/> : <ContactsView/>, [active]);
  return <div className="app"><Sidebar active={active} setActive={setActive} open={menuOpen} close={()=>setMenuOpen(false)}/><main className="main"><Header title={active} menu={()=>setMenuOpen(true)}/>{body}<footer><span><CircleHelp size={14}/>Demo workspace · Connect Meta and Supabase to go live</span><span>Official WhatsApp Cloud API</span></footer></main></div>;
}
