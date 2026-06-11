import { NextResponse } from "next/server";

type Msg = { name: string; text: string; t: number };

let messages: Msg[] = [];
const TTL = 60_000; // 1 minute

function cleanup() {
  const now = Date.now();
  messages = messages.filter((m) => now - m.t <= TTL);
}

export async function GET() {
  cleanup();
  // return only name and text
  return NextResponse.json(messages.map((m) => ({ name: m.name, text: m.text })));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body.name === 'string' && body.name ? body.name : `anon_${Math.floor(Math.random()*9000+1000)}`;
    const text = String(body.text || '');
    if (!text.trim()) return NextResponse.json({ ok: false, error: 'empty' }, { status: 400 });
    messages.push({ name, text, t: Date.now() });
    cleanup();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
