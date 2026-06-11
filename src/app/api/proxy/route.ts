import { NextResponse } from 'next/server';

function isValidHttpUrl(input: string) {
  try {
    const url = new URL(input);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url).searchParams.get('url');
    if (!url || !isValidHttpUrl(url)) {
      return NextResponse.json({ error: 'invalid url' }, { status: 400 });
    }

    const res = await fetch(url);
    if (!res.ok) return NextResponse.json({ error: 'upstream fetch failed' }, { status: 502 });

    const contentType = res.headers.get('content-type') || '';
    // if this is a text playlist (m3u8), rewrite URIs to proxy them
    if (contentType.includes('application/vnd.apple.mpegurl') || contentType.includes('vnd.apple.mpegurl') || contentType.includes('mpegurl') || contentType.includes('text')) {
      const text = await res.text();
      const base = new URL(url);
      // rewrite function: replace every http(s) absolute url and relative paths
      const lines = text.split(/\r?\n/);
      const out = lines.map((line) => {
        const t = line.trim();
        if (!t) return line;
        if (t.startsWith('#')) return line;
        // resolve relative URLs against base
        try {
          const resolved = new URL(t, base).toString();
          return `/api/proxy?url=${encodeURIComponent(resolved)}`;
        } catch (e) {
          return line;
        }
      }).join('\n');

      const headers = new Headers();
      headers.set('content-type', contentType.includes('charset') ? contentType : 'application/vnd.apple.mpegurl');
      headers.set('Access-Control-Allow-Origin', '*');
      return new NextResponse(out, { headers });
    }

    // otherwise stream binary or other resources through with CORS allowed
    const buffer = await res.arrayBuffer();
    const headers = new Headers();
    const ct = contentType || 'application/octet-stream';
    headers.set('content-type', ct);
    headers.set('Access-Control-Allow-Origin', '*');
    return new NextResponse(Buffer.from(buffer), { headers });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
