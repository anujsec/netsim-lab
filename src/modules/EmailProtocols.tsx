import { useState, type ReactNode } from "react";
import { Mail } from "lucide-react";
import SimulatorLayout from "../components/SimulatorLayout";
import ModuleHeader from "../components/ModuleHeader";
import ScenarioTabs from "../components/ScenarioTabs";
import SidePanel from "../components/SidePanel";
import { L, mk, pkt } from "../utils/packets";
import { cn } from "../utils/cn";
import type { SimStep, TopoEdge, TopoNode } from "../types";

type Mode = "imap" | "pop3";

const nodes: TopoNode[] = [
  { id: "alice", label: "Alice's mail app", sublabel: "alice@a.com", x: 8, y: 50, icon: "laptop" },
  { id: "smtpA", label: "a.com mail server", sublabel: "SMTP", x: 32, y: 50, icon: "server" },
  { id: "smtpB", label: "b.com mail server", sublabel: "SMTP + mailbox", x: 62, y: 50, icon: "server" },
  { id: "laptop", label: "Bob's laptop", sublabel: "bob@b.com", x: 90, y: 22, icon: "laptop" },
  { id: "phone", label: "Bob's phone", x: 90, y: 80, icon: "phone" },
];
const edges: TopoEdge[] = [
  { from: "alice", to: "smtpA", label: "SMTP 587" },
  { from: "smtpA", to: "smtpB", label: "SMTP 25" },
  { from: "smtpB", to: "laptop" },
  { from: "smtpB", to: "phone" },
];

const smtpLayers = (sp: string, dp: string, fields: Array<[string, string]>) => [
  L.ip("10.0.0.5", "203.0.113.25"),
  L.tcp(sp, dp, "PSH, ACK"),
  L.app("Application — SMTP", "SMTP", fields),
];

function steps(mode: Mode): SimStep[] {
  const retrieval =
    mode === "imap"
      ? { proto: "IMAP", port: "143 / 993 (TLS)" }
      : { proto: "POP3", port: "110 / 995 (TLS)" };
  return [
    mk({
      id: "send",
      title: "Alice sends the message with SMTP (submission)",
      desc: "Her mail app connects to her own mail server on port 587 (usually with STARTTLS), authenticates, and hands over the message. SMTP is a PUSH protocol: it only moves mail forward.",
      from: "alice",
      to: "smtpA",
      badge: "SMTP",
      packet: pkt("MAIL", "#38bdf8", smtpLayers("52000", "587", [["MAIL FROM", "<alice@a.com>"], ["RCPT TO", "<bob@b.com>"], ["DATA", "Subject: Hello Bob"]])),
      log: "[Alice → a.com] SMTP: MAIL FROM alice@a.com / RCPT TO bob@b.com",
    }),
    mk({
      id: "mx",
      title: "a.com's server finds Bob's server with a DNS MX lookup",
      desc: "It asks DNS: 'Which server accepts mail for b.com?' The MX record answers: mail.b.com (203.0.113.25).",
      from: "smtpA",
      badge: "DNS MX",
      log: "[a.com] DNS MX b.com → mail.b.com (203.0.113.25)",
    }),
    mk({
      id: "relay",
      title: "Server-to-server SMTP relay on port 25",
      desc: "The two servers speak SMTP: EHLO, MAIL FROM, RCPT TO, DATA, then '.' to end the message and QUIT.",
      from: "smtpA",
      to: "smtpB",
      badge: "SMTP relay",
      packet: pkt("MAIL", "#38bdf8", smtpLayers("40000", "25", [["EHLO", "mail.a.com"], ["MAIL FROM", "<alice@a.com>"], ["RCPT TO", "<bob@b.com>"], ["Reply", "250 OK queued"]])),
      log: "[a.com → b.com] SMTP relay on port 25 → 250 OK",
    }),
    mk({
      id: "store",
      title: "b.com stores the message in Bob's mailbox",
      desc: "SMTP's job ends here. The mail now waits on the server until Bob's apps ask for it using IMAP or POP3 — which are PULL protocols.",
      from: "smtpB",
      badge: "Stored",
      log: "[b.com] Mailbox bob: 1 new message (unread).",
    }),
    mk({
      id: "fetch",
      title: `Bob's laptop connects with ${retrieval.proto} (port ${retrieval.port})`,
      desc:
        mode === "imap"
          ? "IMAP lists the folders and fetches the message — but the message STAYS on the server. Read/unread flags, folders and deletions are synchronised."
          : "POP3 logs in, lists the messages and downloads (RETR) them. By default it then deletes them from the server (DELE).",
      from: "laptop",
      to: "smtpB",
      badge: retrieval.proto,
      packet: pkt("FETCH", "#a78bfa", [
        L.ip("10.0.0.7", "203.0.113.25"),
        L.tcp("50220", mode === "imap" ? "993" : "995", "PSH, ACK"),
        L.app(`Application — ${retrieval.proto}`, retrieval.proto, mode === "imap" ? [["Command", "A1 FETCH 1 BODY[]"]] : [["Command", "RETR 1"]]),
      ]),
      log: `[Laptop → b.com] ${mode === "imap" ? "A1 FETCH 1 BODY[]" : "RETR 1"}`,
    }),
    mk({
      id: "deliver",
      title: "The message arrives on Bob's laptop",
      desc: mode === "imap" ? "A copy is displayed; the original remains in the server mailbox." : "The message is saved locally; POP3 then marks it for deletion on the server.",
      from: "smtpB",
      to: "laptop",
      badge: "Delivered",
      packet: pkt("MESSAGE", "#22c55e", [L.app(`Application — ${retrieval.proto}`, retrieval.proto, [["Subject", "Hello Bob"], ["Result", mode === "imap" ? "* 1 FETCH (kept on server)" : "+OK message follows"]])]),
      log: mode === "imap" ? "[b.com → Laptop] message copy; stays on server." : "[b.com → Laptop] message sent; DELE 1 → removed from server.",
    }),
    mk({
      id: "phone",
      title: "Later, Bob opens his PHONE",
      desc:
        mode === "imap"
          ? "IMAP: the phone sees the same message — and it is already marked 'read' because the state lives on the server. All devices stay in sync."
          : "POP3: the mailbox is empty — the message was already downloaded to the laptop and deleted from the server. The phone can't see it.",
      from: "phone",
      to: "smtpB",
      badge: mode === "imap" ? "Synced" : "Empty",
      packet: pkt("LIST", mode === "imap" ? "#22c55e" : "#f43f5e", [L.app(`Application — ${retrieval.proto}`, retrieval.proto, [["Command", mode === "imap" ? "SELECT INBOX" : "LIST"], ["Result", mode === "imap" ? "1 message (Seen)" : "+OK 0 messages"]])]),
      log: mode === "imap" ? "[Phone → b.com] SELECT INBOX → 1 message (read)." : "[Phone → b.com] LIST → 0 messages.",
    }),
  ];
}

const mailbox: Record<Mode, string[]> = {
  imap: ["—", "—", "—", "📬 server: 1 message (unread)", "📬 server: 1 message", "📬 server: 1 message (read, kept)", "📬 server: 1 message (read, kept)"],
  pop3: ["—", "—", "—", "📬 server: 1 message (unread)", "📬 server: 1 message", "📭 server: 0 messages (deleted after download)", "📭 server: 0 messages"],
};

export default function EmailProtocols() {
  const [mode, setMode] = useState<Mode>("imap");

  const side = (i: number): ReactNode => (
    <SidePanel title="Bob's mailbox on the server">
      <p className={cn("rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-2 font-mono text-[11px]", i >= 5 && mode === "pop3" ? "text-amber-300" : "text-slate-300")}>
        {mailbox[mode][i] ?? "—"}
      </p>
      <div className="mt-3 divide-y divide-slate-800 rounded-lg border border-slate-800 text-[11px]">
        {[
          ["SMTP", "25 / 587 / 465", "SEND (push)"],
          ["POP3", "110 / 995", "download & usually delete"],
          ["IMAP", "143 / 993", "sync, stays on server"],
        ].map((r) => (
          <div key={r[0]} className="grid grid-cols-[48px_1fr] gap-2 px-2 py-1">
            <span className="font-bold text-cyan-300">{r[0]}</span>
            <span className="text-slate-400">
              {r[1]} · {r[2]}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-slate-500">Plain ports (25, 110, 143) are unencrypted — prefer TLS versions.</p>
    </SidePanel>
  );

  return (
    <div className="flex flex-col gap-4">
      <ModuleHeader
        icon={Mail}
        color="pink"
        title="Email Protocols: SMTP, IMAP & POP3"
        subtitle="Follow one email from Alice's app to Bob's devices and see how IMAP and POP3 behave differently."
      />
      <SimulatorLayout
        nodes={nodes}
        edges={edges}
        steps={steps(mode)}
        resetKey={`mail-${mode}`}
        topologyHeight={320}
        topBar={
          <ScenarioTabs
            label="Bob reads mail with"
            value={mode}
            onChange={setMode}
            options={[
              { id: "imap", label: "IMAP (sync)" },
              { id: "pop3", label: "POP3 (download)" },
            ]}
          />
        }
        sideExtra={({ index }) => side(index)}
      />
    </div>
  );
}
