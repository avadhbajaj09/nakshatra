import {
  ArrowUpRight,
  Bot,
  CheckCheck,
  ChevronDown,
  Clock3,
  ContactRound,
  Inbox,
  LayoutDashboard,
  Megaphone,
  MessageCircleMore,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Send,
  Settings,
  Sparkles,
  UsersRound,
  Workflow,
} from "lucide-react";

const conversations = [
  { name: "Aarav Sharma", initials: "AS", preview: "Yes, please reserve it for...", time: "2m", unread: 2, color: "coral" },
  { name: "Meera Kapoor", initials: "MK", preview: "Thank you! We'll arrive by 6.", time: "18m", unread: 0, color: "violet" },
  { name: "Rohan Mehta", initials: "RM", preview: "Can you share the dinner menu?", time: "32m", unread: 0, color: "blue" },
  { name: "Isha Verma", initials: "IV", preview: "The river view room looks great.", time: "1h", unread: 0, color: "amber" },
  { name: "Kabir Bhatia", initials: "KB", preview: "Sent a document", time: "3h", unread: 0, color: "mint" },
];

const nav = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Inbox", icon: Inbox, active: true, badge: "6" },
  { label: "Contacts", icon: ContactRound },
  { label: "Templates", icon: MessageCircleMore },
  { label: "Campaigns", icon: Megaphone },
  { label: "Workflows", icon: Workflow },
];

export default function Home() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Sparkles size={18} /></div>
          <div><strong>Nakshatra</strong><span>WhatsApp Studio</span></div>
        </div>

        <div className="workspace-switcher">
          <div className="hotel-avatar">NH</div>
          <div><strong>Nakshatra Hotels</strong><span>Business account</span></div>
          <ChevronDown size={16} />
        </div>

        <nav>
          <p className="eyebrow">Workspace</p>
          {nav.map((item) => (
            <a className={item.active ? "nav-item active" : "nav-item"} href="#" key={item.label}>
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.badge && <b>{item.badge}</b>}
            </a>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="setup-card">
            <div className="setup-icon"><Bot size={17} /></div>
            <strong>Finish your setup</strong>
            <p>Connect your WhatsApp number to start receiving messages.</p>
            <div className="progress"><span /></div>
            <small>2 of 4 steps complete</small>
          </div>
          <a className="nav-item" href="#"><UsersRound size={18} /> Team members</a>
          <a className="nav-item" href="#"><Settings size={18} /> Settings</a>
          <div className="profile">
            <div className="avatar green">AB</div>
            <div><strong>Avadh Bajaj</strong><span>Administrator</span></div>
            <MoreHorizontal size={18} />
          </div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <h1>Inbox</h1>
            <p>Manage customer conversations in one place</p>
          </div>
          <div className="top-actions">
            <div className="connection"><i /> WhatsApp connected</div>
            <button className="icon-button" aria-label="Search"><Search size={18} /></button>
            <button className="primary"><Plus size={17} /> New message</button>
          </div>
        </header>

        <div className="stats-row">
          <div className="mini-stat"><span>Open conversations</span><strong>24</strong><em className="up">+12%</em></div>
          <div className="mini-stat"><span>Avg. response time</span><strong>4m 18s</strong><em className="up">−18%</em></div>
          <div className="mini-stat"><span>Resolved today</span><strong>36</strong><em>8 agents</em></div>
          <div className="mini-stat"><span>Automation rate</span><strong>68%</strong><em className="up">+6%</em></div>
        </div>

        <div className="inbox-grid">
          <section className="conversation-list">
            <div className="list-toolbar">
              <div className="search-box"><Search size={16} /><input aria-label="Search conversations" placeholder="Search conversations" /></div>
              <button className="icon-button"><ChevronDown size={17} /></button>
            </div>
            <div className="filter-row">
              <button className="filter active">All <span>24</span></button>
              <button className="filter">Unread <span>6</span></button>
              <button className="filter">Assigned</button>
            </div>
            <div className="conversation-scroll">
              {conversations.map((conversation, index) => (
                <button className={index === 0 ? "conversation active" : "conversation"} key={conversation.name}>
                  <div className={`avatar ${conversation.color}`}>{conversation.initials}</div>
                  <div className="conversation-copy">
                    <div><strong>{conversation.name}</strong><time>{conversation.time}</time></div>
                    <p>{conversation.preview}</p>
                    <span className="label">{index === 0 ? "Booking" : index === 2 ? "Dining" : "Guest"}</span>
                  </div>
                  {conversation.unread > 0 && <b className="unread">{conversation.unread}</b>}
                </button>
              ))}
            </div>
          </section>

          <section className="chat-panel">
            <div className="chat-header">
              <div className="avatar coral">AS</div>
              <div><strong>Aarav Sharma</strong><span><i /> Online · last seen just now</span></div>
              <div className="chat-actions"><button className="assign"><UsersRound size={16} /> Assigned to Priya <ChevronDown size={14} /></button><button className="icon-button"><MoreHorizontal size={18} /></button></div>
            </div>
            <div className="messages">
              <div className="day-divider"><span>Today</span></div>
              <div className="message incoming">
                <p>Hi! I&apos;m looking for a room for two people this weekend. Do you have anything with a river view?</p>
                <time>10:21 AM</time>
              </div>
              <div className="message outgoing">
                <p>Hello Aarav! Yes, our Deluxe River View room is available. It includes breakfast and a private balcony.</p>
                <time>10:22 AM <CheckCheck size={14} /></time>
              </div>
              <div className="room-card">
                <div className="room-image"><span>Deluxe River View</span></div>
                <div><p>Deluxe River View Room</p><strong>₹8,500 <span>/ night</span></strong><button>View details <ArrowUpRight size={13} /></button></div>
              </div>
              <div className="message incoming compact">
                <p>That looks perfect! Is it available for Friday and Saturday night?</p>
                <time>10:24 AM</time>
              </div>
              <div className="message outgoing compact">
                <p>It is available for both nights. Shall I hold the room for you?</p>
                <time>10:25 AM <CheckCheck size={14} /></time>
              </div>
              <div className="message incoming compact">
                <p>Yes, please reserve it for me.</p>
                <time>10:26 AM</time>
              </div>
            </div>
            <div className="composer">
              <div className="reply-mode"><span><Sparkles size={14} /> Suggested reply</span><button>Use suggestion</button></div>
              <div className="compose-box">
                <textarea aria-label="Write a message" placeholder="Write a message..." />
                <div><button aria-label="Attach"><Paperclip size={18} /></button><button aria-label="Set delay"><Clock3 size={18} /></button><span>Shift + Enter for new line</span><button className="send"><Send size={17} /></button></div>
              </div>
            </div>
          </section>

          <aside className="details-panel">
            <div className="guest-card"><div className="avatar coral large">AS</div><h3>Aarav Sharma</h3><p>+91 98765 43210</p><span className="status-pill">WhatsApp customer</span></div>
            <div className="detail-section"><h4>Contact details <button>Edit</button></h4><dl><dt>Email</dt><dd>aarav@example.com</dd><dt>Location</dt><dd>New Delhi, India</dd><dt>Language</dt><dd>English</dd></dl></div>
            <div className="detail-section"><h4>Tags <button><Plus size={14} /></button></h4><div className="tags"><span>Booking</span><span>River view</span><span>VIP guest</span></div></div>
            <div className="detail-section"><h4>Active workflow</h4><div className="workflow-card"><div><Workflow size={17} /></div><p><strong>Room booking follow-up</strong><span>Step 2 of 4 · waiting for reply</span></p><MoreHorizontal size={16} /></div></div>
            <div className="detail-section notes"><h4>Private notes <button><Plus size={14} /> Add</button></h4><p>Returning guest. Prefers rooms away from the elevator.</p><time>Added by Priya · 2 months ago</time></div>
          </aside>
        </div>
      </section>
    </main>
  );
}
