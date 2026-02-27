export const CONFIG_KEY = 'track_bot_config';

export interface BotConfig {
  token: string;
  chatId: string;
}

// Load from localStorage (client-side cache of server config)
export const loadBotConfig = (): BotConfig => {
  if (typeof window === 'undefined') return { token: '', chatId: '' };
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        token: parsed.token || '',
        chatId: parsed.chatId || '',
      };
    }
  } catch {}
  return { token: '', chatId: '' };
};

// Save to both localStorage and server-side API
export const saveBotConfig = async (token: string, chatId: string): Promise<{ ok: boolean; error?: string }> => {
  // Save to server (persists across all users/sessions without redeployment)
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, chatId }),
    });
    const data = await res.json();
    if (!data.ok) {
      return { ok: false, error: data.error };
    }
  } catch (e) {
    return { ok: false, error: String(e) };
  }

  // Also cache in localStorage for instant reads
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify({ token, chatId }));
      // Notify other tabs
      window.dispatchEvent(new StorageEvent('storage', {
        key: CONFIG_KEY,
        newValue: JSON.stringify({ token, chatId }),
        storageArea: localStorage,
      }));
    } catch {}
  }

  return { ok: true };
};

// Load config from server (for use at send time — always fresh)
export const loadBotConfigFromServer = async (): Promise<BotConfig> => {
  try {
    const res = await fetch('/api/config', { cache: 'no-store' });
    const data = await res.json();
    if (data.token && data.chatId) {
      // Update localStorage cache
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(CONFIG_KEY, JSON.stringify({ token: data.token, chatId: data.chatId }));
        } catch {}
      }
      return { token: data.token, chatId: data.chatId };
    }
  } catch {}
  // Fall back to localStorage
  return loadBotConfig();
};
