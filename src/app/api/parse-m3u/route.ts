import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.IPTV_URL || process.env.NEXT_PUBLIC_IPTV_URL;
  if (!url) {
    return NextResponse.json({ channels: [], error: "IPTV_URL not set in environment" }, { status: 400 });
  }

  try {
    const res = await fetch(url);
    if (!res.ok) return NextResponse.json({ channels: [], error: 'failed to fetch playlist' }, { status: 502 });
    const text = await res.text();
    const lines = text.split(/\r?\n/);
    const channels: { name: string; url: string }[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('#EXTINF')) {
        const comma = line.indexOf(',');
        const name = comma >= 0 ? line.slice(comma + 1).trim() : line;
        // next non-empty non-comment line is URL
        let j = i + 1;
        while (j < lines.length && (!lines[j] || lines[j].trim().startsWith('#'))) j++;
            if (j < lines.length) {
          const urlLine = lines[j].trim();
          // proxy the channel URL through /api/proxy to avoid CORS issues
          const isHls = urlLine.includes('.m3u8') || urlLine.endsWith('.m3u8');
          const proxied = `/api/proxy?url=${encodeURIComponent(urlLine)}${isHls ? '&format=hls' : ''}`;
          channels.push({ name: name || urlLine, url: proxied });
          i = j;
        }
      }
    }
    // If no EXTINF entries, attempt to collect bare urls
    if (channels.length === 0) {
      for (const l of lines) {
        const s = l.trim();
        if (!s || s.startsWith('#')) continue;
        const isHls = s.includes('.m3u8') || s.endsWith('.m3u8');
        const proxied = `/api/proxy?url=${encodeURIComponent(s)}${isHls ? '&format=hls' : ''}`;
        channels.push({ name: s, url: proxied });
      }
    }

    return NextResponse.json({ channels });
  } catch (err) {
    return NextResponse.json({ channels: [], error: String(err) }, { status: 500 });
  }
}
