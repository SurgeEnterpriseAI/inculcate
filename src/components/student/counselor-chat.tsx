"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Send, UserRound, Bot, Sparkles, Check } from "lucide-react";
import { sendMessage, requestHumanHandoff } from "@/server/actions/counselor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Suggestion {
  programId: string;
  name: string;
  university: string;
  country: string;
  tuitionFeeUsd: number | null;
}
interface Msg {
  role: "USER" | "ASSISTANT";
  content: string;
  suggestions?: Suggestion[];
}

const QUICK = ["Recommend programs for me", "What will it cost?", "Any scholarships?", "Tell me about student visas"];

export function CounselorChat({
  initialMessages,
  conversationId,
  alreadyHandedOff,
}: {
  initialMessages: Msg[];
  conversationId: string | null;
  alreadyHandedOff: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [convId, setConvId] = useState<string | null>(conversationId);
  const [input, setInput] = useState("");
  const [pending, start] = useTransition();
  const [handoffDone, setHandoffDone] = useState(alreadyHandedOff);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  function send(text: string) {
    const msg = text.trim();
    if (!msg || pending) return;
    setError(null);
    setInput("");
    setMessages((m) => [...m, { role: "USER", content: msg }]);
    start(async () => {
      const res = await sendMessage(convId, msg);
      if (!res.ok || !res.reply) {
        setError(res.error ?? "Something went wrong.");
        return;
      }
      setConvId(res.conversationId ?? convId);
      setMessages((m) => [...m, { role: "ASSISTANT", content: res.reply!.content, suggestions: res.reply!.suggestions }]);
    });
  }

  function handoff() {
    start(async () => {
      const res = await requestHumanHandoff();
      if (res.ok) {
        setHandoffDone(true);
        setMessages((m) => [...m, { role: "ASSISTANT", content: res.message ?? "A counselor has been notified." }]);
        router.refresh();
      } else {
        setError(res.error ?? "Could not request handoff.");
      }
    });
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-xl border border-[var(--border)] bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-[var(--brand)]" />
          <span className="font-medium">AI Counselor</span>
          <Badge>synthetic · grounded on your catalog</Badge>
        </div>
        <Button size="sm" variant={handoffDone ? "outline" : "primary"} disabled={pending || handoffDone} onClick={handoff}>
          {handoffDone ? <><Check className="h-4 w-4" /> Counselor notified</> : "Talk to a human"}
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-start gap-3 text-sm text-[var(--muted)]">
            <p className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[var(--brand)]" /> Ask me anything about studying abroad. Try:</p>
            <div className="flex flex-wrap gap-2">
              {QUICK.map((q) => (
                <button key={q} onClick={() => send(q)} className="rounded-full border border-[var(--border)] px-3 py-1 text-sm hover:bg-slate-50">{q}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "USER" ? "justify-end" : "justify-start"}`}>
            {m.role === "ASSISTANT" && <Bot className="mt-1 h-5 w-5 shrink-0 text-[var(--brand)]" />}
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "USER" ? "bg-[var(--brand)] text-white" : "bg-slate-100 text-slate-800"}`}>
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.suggestions && m.suggestions.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {m.suggestions.map((s) => (
                    <Link key={s.programId} href="/student/matches" className="block rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">
                      <span className="font-medium">{s.name}</span> · {s.university}, {s.country}
                      {s.tuitionFeeUsd != null ? ` · $${s.tuitionFeeUsd.toLocaleString()}/yr` : ""}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {m.role === "USER" && <UserRound className="mt-1 h-5 w-5 shrink-0 text-slate-400" />}
          </div>
        ))}

        {pending && <div className="flex items-center gap-2 text-sm text-[var(--muted)]"><Bot className="h-5 w-5 text-[var(--brand)]" /> typing…</div>}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[var(--border)] p-3">
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex gap-2"
        >
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about programs, costs, scholarships, visas…" disabled={pending} />
          <Button type="submit" disabled={pending || !input.trim()}><Send className="h-4 w-4" /></Button>
        </form>
        <p className="mt-2 text-center text-xs text-[var(--muted)]">AI guidance is informational and not an admission or visa guarantee.</p>
      </div>
    </div>
  );
}
