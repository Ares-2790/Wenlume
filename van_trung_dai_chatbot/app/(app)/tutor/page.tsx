"use client";

import { useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { MODEL_OPTIONS, TABS, type TabId } from "@/lib/prompt";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type ChatByTab = Record<TabId, Message[]>;

const TUTOR_MODES = [
  { id: "qa", label: "Hỏi đáp" },
  { id: "socratic", label: "Socratic" },
  { id: "grammar", label: "Grammar Coach" },
  { id: "essay", label: "Essay Review" },
] as const;

function initialChats(): ChatByTab {
  return {
    van_hoc: [{ role: "assistant", content: TABS[0].welcomeMessage }],
    chinese: [{ role: "assistant", content: TABS[1].welcomeMessage }],
  };
}

export default function TutorPage() {
  const [activeTab, setActiveTab] = useState<TabId>("chinese");
  const [mode, setMode] = useState<(typeof TUTOR_MODES)[number]["id"]>("qa");
  const [chats, setChats] = useState<ChatByTab>(initialChats);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model] = useState<string>(MODEL_OPTIONS[0]?.value ?? "gemini-3.6-flash");
  const bottomRef = useRef<HTMLDivElement>(null);

  const tab = TABS.find((t) => t.id === activeTab) ?? TABS[1];
  const messages = chats[activeTab];
  const canSend = useMemo(
    () => input.trim().length > 0 && !loading,
    [input, loading],
  );

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages: Message[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setChats((prev) => ({ ...prev, [activeTab]: nextMessages }));
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          model,
          tabId: activeTab,
          mode,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Lỗi khi gọi API");

      setChats((prev) => ({
        ...prev,
        [activeTab]: [
          ...prev[activeTab],
          { role: "assistant", content: data.answer },
        ],
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Lỗi không xác định";
      setChats((prev) => ({
        ...prev,
        [activeTab]: [
          ...prev[activeTab],
          {
            role: "assistant",
            content: `**Lỗi:** ${message}\n\nThử lại sau vài giây.`,
          },
        ],
      }));
    } finally {
      setLoading(false);
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
        40,
      );
    }
  }

  return (
    <div className="chat-shell">
      <header className="page-header">
        <h1>AI Tutor</h1>
        <p>Giữ nguyên chat Văn học & tiếng Trung — nâng cấp thêm chế độ giảng dạy.</p>
      </header>

      <div className="row">
        <div className="tabs" style={{ margin: 0 }}>
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`tab ${activeTab === item.id ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <select
          className="select"
          style={{ width: "auto" }}
          value={mode}
          onChange={(e) =>
            setMode(e.target.value as (typeof TUTOR_MODES)[number]["id"])
          }
        >
          {TUTOR_MODES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn secondary"
          onClick={() =>
            setChats((prev) => ({
              ...prev,
              [activeTab]: [
                { role: "assistant", content: tab.welcomeMessage },
              ],
            }))
          }
        >
          Xóa lịch sử
        </button>
      </div>

      <div className="chat-log panel">
        {messages.map((msg, index) => (
          <article
            key={`${activeTab}-${index}`}
            className={`bubble ${msg.role === "user" ? "user" : ""}`}
          >
            <div className="role">
              {msg.role === "user" ? "Bạn" : tab.assistantName}
            </div>
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </article>
        ))}
        {loading ? (
          <article className="bubble">
            <div className="role">{tab.assistantName}</div>
            <p>Đang suy nghĩ...</p>
          </article>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <footer className="composer panel">
        <textarea
          className="textarea"
          rows={3}
          placeholder={tab.chatPlaceholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void sendMessage();
            }
          }}
        />
        <button
          type="button"
          className="btn"
          disabled={!canSend}
          onClick={() => void sendMessage()}
        >
          Gửi
        </button>
      </footer>
    </div>
  );
}
