import { NextResponse } from 'next/server';

// In-memory store — shared within the same serverless instance
// On Vercel, sessions persist as long as the instance is warm (typically minutes)
declare global {
  // eslint-disable-next-line no-var
  var _sessions: Record<string, Record<string, unknown>>;
}
const sessions: Record<string, Record<string, unknown>> = global._sessions ?? (global._sessions = {});

export async function GET() {
  const now = Date.now();
  const active: Record<string, Record<string, unknown>> = {};
  for (const [id, data] of Object.entries(sessions)) {
    if (now - (data.lastSeen as number) < 30000) {
      active[id] = data;
    }
  }
  return NextResponse.json(active);
}
