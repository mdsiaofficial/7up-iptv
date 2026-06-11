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

    // consider proxied URLs that include format=hls or original .m3u8
    const isM3u8 = url.includes('format=hls') || url.endsWith('.m3u8') || url.includes('.m3u8');

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
    <div className="app-root">
      <aside className="channels">
        <div className="header">Channels</div>
        <div className="search">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
            placeholder="Search channels..."
          />
        </div>
        <ul>
          {filteredChannels.map((c) => (
            <li
              key={c.url}
              onClick={() => setSelected(c.url)}
              className={selected === c.url ? 'selected' : ''}
            >
              {c.name}
            </li>
          ))}
        </ul>
      </aside>

      <main className="main">
        <div className="title">
          <strong>{channels.find((x) => x.url === selected)?.name || "Select a channel"}</strong>
        </div>
        <div className="playerWrap">
          <video ref={videoRef} controls />
        </div>
      </main>

      <aside className="chat">
        <div className="header">Chat (you are {anonName || '...'})</div>
        <div className="messages">
          {messages.map((m, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: "#666" }}>{m.name}</div>
              <div>{m.text}</div>
            </div>
          ))}
        </div>
        <form onSubmit={sendMessage} className="composer">
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
