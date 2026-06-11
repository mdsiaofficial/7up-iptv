"use client";
import React, { useEffect, useRef, useState } from "react";

type Channel = { name: string; url: string };

type ChatMessage = { name: string; text: string };

export default function Page() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [anonName, setAnonName] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<any>(null);
  const [query, setQuery] = useState("");

  // generate anon name only on the client after mount to avoid SSR hydration mismatch
  useEffect(() => {
    setAnonName(`anon_${Math.floor(Math.random() * 9000 + 1000)}`);
  }, []);

  // derived filtered channels
  const filteredChannels = channels.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    fetch("/api/parse-m3u")
      .then((r) => r.json())
      .then((data) => {
        if (data?.channels) setChannels(data.channels);
      })
      .catch(() => {});
  }, []);

  // poll chat every 2s
  useEffect(() => {
    let mounted = true;
    const fn = () =>
      fetch("/api/chat")
        .then((r) => r.json())
        .then((d) => {
          if (mounted) setMessages(d || []);
        })
        .catch(() => {});
    fn();
    const id = setInterval(fn, 2000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  // handle HLS if needed
  useEffect(() => {
    const url = selected;
    const video = videoRef.current;
    if (!video) return;

    // cleanup previous
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch {}
      hlsRef.current = null;
    }

    if (!url) {
      video.removeAttribute("src");
      video.load();
      return;
    }

    const isM3u8 = url.endsWith('.m3u8') || url.includes('.m3u8');

    const setupHls = async () => {
      // dynamically load hls.js from unpkg
      if ((window as any).Hls) {
        const Hls = (window as any).Hls;
        if (Hls.isSupported()) {
          const hls = new Hls();
          hlsRef.current = hls;
          hls.loadSource(url);
          hls.attachMedia(video);
          video.play().catch(() => {});
        } else {
          video.src = url;
          video.play().catch(() => {});
        }
        return;
      }
      const script = document.createElement("script");
      script.src = "https://unpkg.com/hls.js@1.4.0/dist/hls.min.js";
      script.async = true;
      script.onload = () => {
        const Hls = (window as any).Hls;
        if (Hls && Hls.isSupported()) {
          const hls = new Hls();
          hlsRef.current = hls;
          hls.loadSource(url);
          hls.attachMedia(video);
          video.play().catch(() => {});
        } else {
          video.src = url;
          video.play().catch(() => {});
        }
      };
      script.onerror = () => {
        video.src = url;
        video.play().catch(() => {});
      };
      document.body.appendChild(script);
    };

    if (isM3u8) setupHls();
    else {
      video.src = url;
      video.play().catch(() => {});
    }
  }, [selected]);

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    const name = anonName ?? `anon_${Math.floor(Math.random() * 9000 + 1000)}`;
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, text }),
    });
    // optimistic update
    setMessages((m) => [...m, { name, text }]);
  };

  return (
    <div style={{ height: "100vh", display: "flex", gap: 0 }}>
      <aside style={{ width: 260, borderRight: "1px solid #eee", overflowY: "auto" }}>
        <div style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 3, padding: 12, fontWeight: 700, borderBottom: '1px solid #eee' }}>Channels</div>
        <div style={{ position: 'sticky', top: 48, background: '#fff', zIndex: 2, padding: 8, borderBottom: '1px solid #f7f7f7' }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
            placeholder="Search channels..."
          />
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {filteredChannels.map((c) => (
            <li
              key={c.url}
              onClick={() => setSelected(c.url)}
              style={{
                padding: 10,
                cursor: "pointer",
                background: selected === c.url ? "#f0f0f0" : undefined,
                borderBottom: "1px solid #fafafa",
              }}
            >
              {c.name}
            </li>
          ))}
        </ul>
      </aside>

      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "stretch" }}>
        <div style={{ padding: 8, borderBottom: "1px solid #eee" }}>
          <strong>{channels.find((x) => x.url === selected)?.name || "Select a channel"}</strong>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#000" }}>
          <video
            ref={videoRef}
            controls
            style={{ width: "100%", height: "100%", maxHeight: "100%", background: "#000" }}
          />
        </div>
      </main>

      <aside style={{ width: 320, borderLeft: "1px solid #eee", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 12, fontWeight: 700 }}>Chat (you are {anonName || '...'})</div>
        <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: "#666" }}>{m.name}</div>
              <div>{m.text}</div>
            </div>
          ))}
        </div>
        <form onSubmit={sendMessage} style={{ padding: 12, borderTop: "1px solid #eee" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Say something..."
            style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
          />
        </form>
      </aside>
    </div>
  );
}
