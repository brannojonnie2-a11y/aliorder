import { NextRequest, NextResponse } from 'next/server';

declare global {
  // eslint-disable-next-line no-var
  var _sessions: Record<string, Record<string, unknown>>;
}
const sessions: Record<string, Record<string, unknown>> = global._sessions ?? (global._sessions = {});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  sessions[id] = { ...body, lastSeen: Date.now() };
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  delete sessions[id];
  return NextResponse.json({ success: true });
}
