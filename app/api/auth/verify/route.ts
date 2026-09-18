import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, AUTH_EMAIL } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  try {
    let token: string | undefined;

    // 1. Check Authorization header
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }

    // 2. Check Cookie
    if (!token) {
      token = req.cookies.get('auth_session')?.value;
    }

    // 3. Check JSON body if provided
    if (!token) {
      try {
        const body = await req.json();
        token = body.token;
      } catch {
        // empty body is acceptable
      }
    }

    if (!token) {
      return NextResponse.json({ authenticated: false, error: 'لم يتم العثور على رمز الجلسة' }, { status: 401 });
    }

    const verification = verifySessionToken(token);
    if (!verification.valid || !verification.payload) {
      return NextResponse.json({ authenticated: false, error: verification.error || 'جلسة غير صالحة' }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        email: AUTH_EMAIL,
        name: 'Zakaria El Ahbabi',
        role: 'Owner & Administrator',
      },
      expiresAt: verification.payload.exp,
    });
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json({ authenticated: false, error: 'خطأ في التحقق من الجلسة' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
