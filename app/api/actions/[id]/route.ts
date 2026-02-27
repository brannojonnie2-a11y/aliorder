import { NextRequest, NextResponse } from 'next/server';

declare global {
  // eslint-disable-next-line no-var
  var _actions: Record<string, string>;
}
const actions: Record<string, string> = global._actions ?? (global._actions = {});

// GET — returns the current action and atomically clears it to 'normal'
// This ensures each action is consumed exactly once, preventing duplicate redirects
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const action = actions[id] || 'normal';
  // Atomically clear after reading so it's consumed exactly once
  if (action !== 'normal') {
    actions[id] = 'normal';
  }
  return NextResponse.json({ action });
}

// POST — sets a new action (called by admin panel)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  actions[id] = body.action;
  return NextResponse.json({ success: true });
}
