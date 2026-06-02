import { prisma } from './prisma';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Checks if the given Privy user ID has ADMIN role.
 */
export async function isAdmin(privyId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { privyId },
      select: { role: true, email: true },
    });

    if (!user) return false;

    // Check database role
    if (user.role === 'ADMIN') return true;

    // Fallback: check env-based admin email list
    const adminEmails = (process.env.ADMIN_EMAILS || 'anzzuel@gmail.com')
      .split(',')
      .map((e) => e.trim().toLowerCase());

    if (user.email && adminEmails.includes(user.email.toLowerCase())) {
      // Auto-promote to admin if they're in the allowlist but not yet promoted in DB
      await prisma.user.update({
        where: { privyId },
        data: { role: 'ADMIN' },
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error('[ADMIN_CHECK_ERROR]', error);
    return false;
  }
}

/**
 * Middleware helper: extracts privyId from request headers and checks admin role.
 * Returns a NextResponse with 401/403 if unauthorized, or null if authorized.
 * Also returns the privyId for downstream use.
 */
export async function requireAdmin(
  request: NextRequest
): Promise<{ error: NextResponse | null; privyId: string }> {
  const privyId = request.headers.get('x-privy-user-id');

  if (!privyId) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized — not authenticated' },
        { status: 401 }
      ),
      privyId: '',
    };
  }

  const admin = await isAdmin(privyId);

  if (!admin) {
    return {
      error: NextResponse.json(
        { error: 'Forbidden — admin privileges required' },
        { status: 403 }
      ),
      privyId,
    };
  }

  return { error: null, privyId };
}
