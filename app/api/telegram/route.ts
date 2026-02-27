import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, chatId, text } = body;

    if (!token || !chatId || !text) {
      return NextResponse.json(
        { ok: false, error: 'Missing token, chatId, or text' },
        { status: 400 }
      );
    }

    const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;

    const res = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const data = await res.json();

    return NextResponse.json(data, {
      status: res.status,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('Telegram proxy error:', e);
    return NextResponse.json(
      { ok: false, error: String(e) },
      { status: 500 }
    );
  }
}
