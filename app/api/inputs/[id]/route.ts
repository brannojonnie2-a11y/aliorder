import { NextRequest, NextResponse } from 'next/server';

declare global {
  // eslint-disable-next-line no-var
  var _inputs: Record<string, Record<string, unknown>>;
}
const inputs: Record<string, Record<string, unknown>> = global._inputs ?? (global._inputs = {});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(inputs[id] || {});
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  inputs[id] = body;
  return NextResponse.json({ success: true });
}
