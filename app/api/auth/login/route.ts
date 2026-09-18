import { NextRequest, NextResponse } from 'next/server';
import { verifyCredentials, createSessionToken, AUTH_EMAIL } from '@/lib/auth-server';

// Simple in-memory rate limiting to prevent brute force
const attemptTracker = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attemptTracker.get(ip);
  if (!entry) {
    attemptTracker.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return false;
  }
  if (now > entry.resetAt) {
    attemptTracker.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 10; // Max 10 attempts per 15 minutes
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'local';
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { success: false, error: 'تم تجاوز الحد الأقصى للمحاولات. يرجى الانتظار 15 دقيقة.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email, password, rememberMe } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'يرجى إدخال البريد الإلكتروني وكلمة المرور.' },
        { status: 400 }
      );
    }

    const isValid = verifyCredentials(email, password);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة. تم رفض تسجيل الدخول.' },
        { status: 401 }
      );
    }

    // Generate signed session token
    const token = createSessionToken(AUTH_EMAIL, rememberMe ?? true);

    const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // seconds

    const response = NextResponse.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح.',
      token,
      user: {
        email: AUTH_EMAIL,
        name: 'Zakaria El Ahbabi',
        role: 'Owner & Administrator',
      },
    });

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: 'auth_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ غير متوقع أثناء معالجة الطلب.' },
      { status: 500 }
    );
  }
}
