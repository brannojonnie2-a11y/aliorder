import { NextRequest, NextResponse } from 'next/server';

interface GeoResult {
  ip: string;
  country: string;
  city: string;
  zip: string;
  source?: string;
}

async function lookupGeo(ip: string): Promise<GeoResult | null> {
  // 1. ipwho.is — works server-side, fast, returns city + zip
  try {
    const res = await fetch(`https://ipwho.is/${ip}`, {
      headers: { 'User-Agent': 'curl/7.81.0' },
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const d = await res.json();
      if (d.success && d.country) {
        return {
          ip: d.ip || ip,
          country: d.country,
          city: d.city || '',
          zip: d.postal || '',
        };
      }
    }
  } catch {}

  // 2. ipapi.co — works server-side, returns city + postal
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { 'User-Agent': 'curl/7.81.0' },
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const d = await res.json();
      if (!d.error && d.country_name) {
        return {
          ip: d.ip || ip,
          country: d.country_name,
          city: d.city || '',
          zip: d.postal || '',
        };
      }
    }
  } catch {}

  // 3. ip-api.com — works server-side (HTTP is fine server-side), returns city + zip
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,query,country,city,zip`, {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const d = await res.json();
      if (d.status === 'success' && d.country) {
        return {
          ip: d.query || ip,
          country: d.country,
          city: d.city || '',
          zip: d.zip || '',
        };
      }
    }
  } catch {}

  // 4. freeipapi.com — works server-side, returns city + zip
  try {
    const res = await fetch(`https://freeipapi.com/api/json/${ip}`, {
      headers: { 'User-Agent': 'curl/7.81.0' },
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const d = await res.json();
      if (d.countryName && d.countryName !== '-') {
        return {
          ip: d.ipAddress || ip,
          country: d.countryName,
          city: d.cityName || '',
          zip: d.zipCode || '',
        };
      }
    }
  } catch {}

  return null;
}

export async function GET(request: NextRequest) {
  // Client passes its own IP (detected via ipapi.co/ipify in browser)
  const clientIp = request.nextUrl.searchParams.get('ip');

  if (clientIp && clientIp !== 'Unknown' && clientIp.trim()) {
    const result = await lookupGeo(clientIp.trim());
    if (result) {
      return NextResponse.json({ ...result, source: 'client-ip' }, {
        headers: { 'Cache-Control': 'no-store' },
      });
    }
    return NextResponse.json({ ip: clientIp, country: 'Unknown', city: '', zip: '', source: 'lookup-failed' }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  // No client IP — try Vercel/Cloudflare edge headers
  const vercelIp = request.headers.get('x-vercel-ip-country')
    ? (request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '')
    : '';
  const vercelCountry = request.headers.get('x-vercel-ip-country') || '';

  if (vercelIp && vercelCountry) {
    const result = await lookupGeo(vercelIp);
    return NextResponse.json({
      ip: vercelIp,
      country: result?.country || vercelCountry,
      city: result?.city || '',
      zip: result?.zip || '',
      source: 'vercel-edge',
    }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const cfIp = request.headers.get('cf-connecting-ip') || '';
  const cfCountry = request.headers.get('cf-ipcountry') || '';
  if (cfIp && cfCountry && cfCountry !== 'XX') {
    const result = await lookupGeo(cfIp);
    return NextResponse.json({
      ip: cfIp,
      country: result?.country || cfCountry,
      city: result?.city || '',
      zip: result?.zip || '',
      source: 'cloudflare',
    }, { headers: { 'Cache-Control': 'no-store' } });
  }

  return NextResponse.json({ ip: 'Unknown', country: 'Unknown', city: '', zip: '', source: 'no-ip' }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
