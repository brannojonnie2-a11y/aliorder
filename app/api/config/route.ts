import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';

// Store config in /tmp (writable on Vercel serverless) with fallback to in-memory
const CONFIG_FILE = '/tmp/track_bot_config.json';

// ── DEFAULT HARDCODED CONFIG ─────────────────────────────────────────────────
// These are used if no config has been saved via the admin panel
const DEFAULT_TOKEN = '8361020073:AAFfPXu1trr71fxQXKVA0xU5WX_f9z8IN6Y';
const DEFAULT_CHAT_ID = '5219969216';
// ─────────────────────────────────────────────────────────────────────────────

// In-memory cache (persists within the same serverless instance)
declare global {
  // eslint-disable-next-line no-var
  var _botConfig: { token: string; chatId: string } | null;
}

function readConfig(): { token: string; chatId: string } {
  // 1. Try reading from file (saved via admin panel)
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.token && parsed.chatId) {
        global._botConfig = parsed;
        return parsed;
      }
    }
  } catch {}

  // 2. In-memory cache
  if (global._botConfig?.token && global._botConfig?.chatId) {
    return global._botConfig;
  }

  // 3. Environment variables (set in Vercel dashboard — no redeployment needed)
  const envToken = process.env.TELEGRAM_BOT_TOKEN || '';
  const envChatId = process.env.TELEGRAM_CHAT_ID || '';
  if (envToken && envChatId) {
    return { token: envToken, chatId: envChatId };
  }

  // 4. Hardcoded defaults (always works out of the box)
  return { token: DEFAULT_TOKEN, chatId: DEFAULT_CHAT_ID };
}

function writeConfig(token: string, chatId: string): void {
  const data = { token, chatId };
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(data), 'utf-8');
  } catch {}
  global._botConfig = data;
}

export async function GET() {
  const config = readConfig();
  return NextResponse.json({
    token: config.token,
    chatId: config.chatId,
    configured: !!(config.token && config.chatId),
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = (body.token || '').trim();
    const chatId = (body.chatId || '').trim();

    if (!token || !chatId) {
      return NextResponse.json({ ok: false, error: 'Missing token or chatId' }, { status: 400 });
    }

    // chatId can be negative (Telegram groups/channels use negative IDs)
    if (!/^-?\d+$/.test(chatId)) {
      return NextResponse.json(
        { ok: false, error: 'chatId must be a number (can be negative for groups)' },
        { status: 400 }
      );
    }

    writeConfig(token, chatId);
    return NextResponse.json({ ok: true, message: 'Config saved successfully' });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
