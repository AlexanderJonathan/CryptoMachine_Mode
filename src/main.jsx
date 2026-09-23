import { StrictMode, useEffect, useMemo, useState } from "react"
import { createRoot } from "react-dom/client"
import "./styles.css"

const THEMES = {
  cyber_dark: { name: "Cyber Dark", bg: "#080d18", panel: "#111b2d", input: "#0a1322", border: "#243552", text: "#f5f8ff", muted: "#91a2bd", primary: "#00e5c3", secondary: "#6978ff", accent: "#ffc857", danger: "#ff6577" },
  midnight_blue: { name: "Midnight Ocean", bg: "#071426", panel: "#102643", input: "#091a31", border: "#23456f", text: "#f4f8ff", muted: "#9cb1cb", primary: "#38bdf8", secondary: "#4f8cff", accent: "#fbbf24", danger: "#fb7185" },
  emerald_matrix: { name: "Emerald Matrix", bg: "#04150e", panel: "#0b2b1d", input: "#061e13", border: "#1d563d", text: "#e5fff0", muted: "#8bc9a5", primary: "#00f5a0", secondary: "#20c997", accent: "#fde047", danger: "#fb7185" },
  obsidian_gold: { name: "Obsidian Gold", bg: "#111216", panel: "#22232a", input: "#17181d", border: "#40424d", text: "#fafafa", muted: "#a7a8b0", primary: "#facc15", secondary: "#d97706", accent: "#38bdf8", danger: "#fb7185" }
}
const DEFAULT_SETTINGS = { version: 2, shift: 1, theme: "cyber_dark", maxHistory: 50, autoCopy: false, confirmClear: false, preserveCase: true }
const LOWER_KEYS = "abcdefghijklmnopqrstuvwxyz0123456789!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~ "
const UPPER_KEYS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

function useStored(key, fallback) {
  const [value, setValue] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(key))
      if (!stored) return fallback
      if (key === "ajin-settings" && !stored.version) return { ...fallback, ...stored, version: 2, preserveCase: true }
      return stored
    } catch { return fallback }
  })
  useEffect(() => localStorage.setItem(key, JSON.stringify(value)), [key, value])
  return [value, setValue]
}

function transform(message, shift, decrypt, preserveCase) {
  const makeMap = alphabet => {
    const amount = shift % alphabet.length
    const rotated = decrypt ? alphabet.slice(amount) + alphabet.slice(0, amount) : alphabet.slice(-amount) + alphabet.slice(0, -amount)
    return Object.fromEntries([...alphabet].map((char, index) => [char, rotated[index]]))
  }
  const lowerMap = makeMap(LOWER_KEYS)
  const upperMap = makeMap(UPPER_KEYS)
  return [...message].map(char => {
    if (preserveCase && upperMap[char]) return upperMap[char]
    return lowerMap[char.toLowerCase()] ?? char
  }).join("")
}

function App() {
  const [settings, setSettings] = useStored("ajin-settings", DEFAULT_SETTINGS)
  const [history, setHistory] = useStored("ajin-history", [])
  const [users, setUsers] = useStored("ajin-users", {})
  const [session, setSession] = useStored("ajin-session", null)
  const [tickets, setTickets] = useStored("ajin-tickets", [])
  const [view, setView] = useState("crypto")
  const [input, setInput] = useState("")
  const [result, setResult] = useState("")
  const [toast, setToast] = useState("")
  const theme = THEMES[settings.theme] || THEMES.cyber_dark
  const notify = message => { setToast(message); window.setTimeout(() => setToast(""), 2200) }
  const run = decrypt => {
    if (!input.trim()) return notify("Enter a message first")
    const output = transform(input, settings.shift, decrypt, settings.preserveCase)
    setResult(output)
    setHistory(items => [{ action: decrypt ? "Decrypted" : "Encrypted", original: input, result: output, time: new Date().toLocaleString() }, ...items].slice(0, settings.maxHistory))
    if (settings.autoCopy) navigator.clipboard?.writeText(output)
    notify(decrypt ? "Message decrypted" : "Message encrypted")
  }
  const clear = () => { if (settings.confirmClear && !window.confirm("Clear the workspace?")) return; setInput(""); setResult(""); notify("Workspace cleared") }
  const copy = () => { if (!result) return notify("Nothing to copy"); navigator.clipboard?.writeText(result); notify("Result copied") }
  return <div className="app" style={{ "--bg": theme.bg, "--panel": theme.panel, "--input": theme.input, "--border": theme.border, "--text": theme.text, "--muted": theme.muted, "--primary": theme.primary, "--secondary": theme.secondary, "--accent": theme.accent, "--danger": theme.danger }}>
    <header className="topbar"><div className="brand"><span className="brand-mark">A</span><div><strong>AJIN</strong><small>CRYPTO MACHINE</small></div></div><span className="status"><i /> Local vault active</span><button className="profile" onClick={() => setView("auth")}>{session ? session.name : "Guest mode"}</button></header>
    <div className="layout"><aside><nav>{[["crypto", "⌘", "Workspace"], ["auth", "◉", "Account"], ["settings", "⚙", "Settings"], ["support", "✦", "Support"], ["faq", "?", "FAQ"]].map(([id, icon, label]) => <button className={view === id ? "nav-item active" : "nav-item"} onClick={() => setView(id)} key={id}><span>{icon}</span>{label}</button>)}</nav><div className="side-note"><b>Private by design</b><small>Your messages stay in this browser.</small></div></aside>
      <main>{view === "crypto" && <Crypto settings={settings} input={input} setInput={setInput} result={result} run={run} clear={clear} copy={copy} history={history} setHistory={setHistory} notify={notify} />}{view === "auth" && <Auth session={session} setSession={setSession} users={users} setUsers={setUsers} notify={notify} />}{view === "settings" && <Settings settings={settings} setSettings={setSettings} setHistory={setHistory} notify={notify} />}{view === "support" && <Support session={session} tickets={tickets} setTickets={setTickets} notify={notify} />}{view === "faq" && <FAQ />}</main>
    </div>{toast && <div className="toast">✓ {toast}</div>}
  </div>
}

function Crypto({ settings, input, setInput, result, run, clear, copy, history, setHistory, notify }) {
  const stats = useMemo(() => [input.length, input.trim() ? input.trim().split(/\s+/).length : 0, input.split("\n").length], [input])
  const [shareOpen, setShareOpen] = useState(false)
  const share = async platform => {
    if (!result) return notify("Encrypt a message before sharing")
    const text = encodeURIComponent(result)
    const links = {
      whatsapp: `https://wa.me/?text=${text}`,
      telegram: `https://t.me/share/url?url=&text=${text}`,
      email: `mailto:?subject=Encrypted%20message%20from%20AJIN&body=${text}`,
      x: `https://twitter.com/intent/tweet?text=${text}`
    }
    if (platform === "native" && navigator.share) {
      try { await navigator.share({ title: "AJIN encrypted message", text: result }); setShareOpen(false) } catch { /* User cancelled the native share sheet. */ }
        return
    }
    if (links[platform]) window.open(links[platform], "_blank", "noopener,noreferrer")
    setShareOpen(false)
  }
  return <section className="page"><div className="page-heading"><div><p className="eyebrow">SECURE WORKSPACE / 01</p><h1>Encrypt. Decrypt. <em>Understand.</em></h1><p className="subheading">A focused cipher laboratory for messages that deserve a little more care.</p></div><span className="chip">SHIFT {String(settings.shift).padStart(2, "0")}</span></div><div className="workspace-grid"><div className="panel editor-panel"><div className="panel-title"><span><b className="number">01</b> INPUT MESSAGE</span><span className="live">● LIVE</span></div><textarea value={input} onChange={event => setInput(event.target.value)} placeholder="Type or paste a message to begin..." /><div className="stats">{stats.map((stat, index) => <span key={index}><b>{stat}</b> {['characters', 'words', 'lines'][index]}</span>)}</div><div className="actions"><button className="primary" onClick={() => run(false)}>↗ Encrypt</button><button className="secondary" onClick={() => run(true)}>↙ Decrypt</button><button className="icon-button" onClick={clear} title="Clear">⌫</button></div></div><div className="panel result-panel"><div className="panel-title"><span><b className="number">02</b> OUTPUT</span><div className="output-actions"><button className="copy" onClick={copy}>▣ Copy</button><button className="copy" onClick={() => setShareOpen(!shareOpen)} aria-expanded={shareOpen}>↗ Share</button>{shareOpen && <div className="share-menu"><button onClick={() => share("native")}>Device share</button><button onClick={() => share("whatsapp")}>WhatsApp</button><button onClick={() => share("telegram")}>Telegram</button><button onClick={() => share("email")}>Email</button><button onClick={() => share("x")}>X / Twitter</button></div>}</div></div><div className={result ? "result has-result" : "result"}>{result || <><span className="empty-icon">◌</span><p>Your transformed message<br /><small>will appear here</small></p></>}</div><div className="result-footer"><span><i /> Ready for input</span><button onClick={() => { setInput(result); notify("Result moved to input") }}>Swap ↔</button></div></div></div><div className="below-grid"><div className="panel history-panel"><div className="panel-title"><span><b className="number">03</b> RECENT ACTIVITY</span><button className="text-button" onClick={() => { setHistory([]); notify("History cleared") }}>Clear all</button></div>{history.length ? history.slice(0, 5).map((item, index) => <div className="history-row" key={`${item.time}-${index}`}><span className="history-symbol">{item.action === "Encrypted" ? "↗" : "↙"}</span><div><strong>{item.action}</strong><small>{item.time}</small><p>{item.original}</p></div></div>) : <div className="empty-history">No activity yet. Your transformations will be recorded here.</div>}</div><div className="panel info-panel"><span className="info-kicker">THE AUTHOR</span><h2>Alexander<br /><em>Jonathan</em></h2><p>Designer, engineer, and curious mind building calm tools for complex ideas.</p></div></div></section>
}

function Auth({ session, setSession, users, setUsers, notify }) {
  const [mode, setMode] = useState("login")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const submit = event => { event.preventDefault(); const name = username.trim(); if (mode === "register") { if (!name || password.length < 6) return notify("Use a password with at least 6 characters"); if (users[name]) return notify("Account already exists"); setUsers({ ...users, [name]: { password } }); setSession({ name }); notify(`Welcome, ${name}`) } else { if (!users[name] || users[name].password !== password) return notify("Invalid account details"); setSession({ name }); notify(`Welcome back, ${name}`) } }
  if (session) return <section className="center-page"><div className="auth-card"><p className="eyebrow">ACCOUNT / 02</p><div className="avatar">{session.name[0].toUpperCase()}</div><h1>Welcome, <em>{session.name}</em></h1><p className="subheading">Your private workspace is ready.</p><button className="primary wide" onClick={() => { setSession(null); notify("Logged out") }}>Log out</button></div></section>
  return <section className="center-page"><form className="auth-card" onSubmit={submit}><p className="eyebrow">ACCOUNT / 02</p><h1>{mode === "login" ? "Welcome back." : "Create your vault."}</h1><p className="subheading">Account data stays in this browser.</p><input value={username} onChange={event => setUsername(event.target.value)} placeholder="Username" required /><input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Password" required /><button className="primary wide">{mode === "login" ? "Sign in" : "Create account"}</button><button type="button" className="link-button" onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Need an account? Create one" : "Already registered? Sign in"}</button></form></section>
}

function Settings({ settings, setSettings, setHistory, notify }) {
  const update = patch => setSettings({ ...settings, ...patch })
  return <section className="page narrow"><div className="page-heading"><div><p className="eyebrow">SYSTEM / 03</p><h1>Control the <em>signal.</em></h1><p className="subheading">Tune the cipher and shape the workspace around your process.</p></div></div><div className="settings-grid"><div className="panel setting-group"><h2>Cipher behavior</h2><label>Shift amount <strong>{settings.shift}</strong><input type="range" min="1" max="40" value={settings.shift} onChange={event => update({ shift: Number(event.target.value) })} /></label><label className="toggle"><input type="checkbox" checked={settings.preserveCase} onChange={event => update({ preserveCase: event.target.checked })} /><span />Preserve letter case</label><label className="toggle"><input type="checkbox" checked={settings.autoCopy} onChange={event => update({ autoCopy: event.target.checked })} /><span />Copy results automatically</label></div><div className="panel setting-group"><h2>Appearance</h2><div className="theme-list">{Object.entries(THEMES).map(([id, item]) => <button className={settings.theme === id ? "theme-choice selected" : "theme-choice"} key={id} onClick={() => update({ theme: id })}><span style={{ background: item.primary }} />{item.name}</button>)}</div><label>History limit<select value={settings.maxHistory} onChange={event => update({ maxHistory: Number(event.target.value) })}><option value="20">20 items</option><option value="50">50 items</option><option value="100">100 items</option></select></label><button className="danger-button" onClick={() => { setHistory([]); notify("History cleared") }}>Delete local history</button></div></div></section>
}

function Support({ session, tickets, setTickets, notify }) {
  const [message, setMessage] = useState("")
  const submit = event => { event.preventDefault(); if (!message.trim()) return notify("Enter a support message"); setTickets([{ message, status: "Open", time: new Date().toLocaleString(), user: session?.name || "Guest" }, ...tickets]); setMessage(""); notify("Ticket submitted") }
  return <section className="page narrow"><div className="page-heading"><div><p className="eyebrow">HELP DESK / 04</p><h1>How can we <em>help?</em></h1><p className="subheading">Keep support history in this browser.</p></div></div><div className="support-grid"><form className="panel support-form" onSubmit={submit}><h2>Open a ticket</h2><textarea value={message} onChange={event => setMessage(event.target.value)} placeholder="Describe what you need help with..." /><button className="primary">Submit ticket</button></form><div className="panel ticket-panel"><h2>Your tickets</h2>{tickets.length ? tickets.map((ticket, index) => <div className="ticket" key={`${ticket.time}-${index}`}><b>{ticket.status}</b><small>{ticket.time} · {ticket.user}</small><p>{ticket.message}</p></div>) : <div className="empty-history">No support tickets yet.</div>}</div></div></section>
}

function FAQ() {
  const items = [["What is the cipher?", "AJIN uses a configurable substitution shift across lowercase letters, digits, punctuation, and spaces."], ["Does my message leave this device?", "No. Transformations happen in your browser and history is stored locally."], ["Can I reverse an encryption?", "Yes. Use the same shift amount and select Decrypt to reverse a result."], ["How do I change the look?", "Open Settings and choose one of the available themes."]]
  const [open, setOpen] = useState(0)
  return <section className="page narrow"><div className="page-heading"><div><p className="eyebrow">KNOWLEDGE BASE / 05</p><h1>Frequently asked <em>questions.</em></h1><p className="subheading">A small field guide to the machine.</p></div></div><div className="faq-list">{items.map(([question, answer], index) => <button className={open === index ? "faq-item open" : "faq-item"} onClick={() => setOpen(open === index ? -1 : index)} key={question}><span>{String(index + 1).padStart(2, "0")}</span><strong>{question}</strong><b>{open === index ? "−" : "+"}</b>{open === index && <p>{answer}</p>}</button>)}</div></section>
}

createRoot(document.getElementById("root")).render(<StrictMode><App /></StrictMode>)
