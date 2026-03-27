import dns from 'dns';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const addresses = await dns.promises.lookup('api.skipcash.io');
    return NextResponse.json({ ok: true, addresses });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
