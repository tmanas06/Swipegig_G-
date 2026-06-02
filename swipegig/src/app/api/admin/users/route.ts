import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

// GET /api/admin/users — List all users with pagination
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const search = url.searchParams.get('search') || '';
    const role = url.searchParams.get('role') || '';

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { walletAddress: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role && ['SEEKER', 'RECRUITER', 'ADMIN'].includes(role)) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          privyId: true,
          email: true,
          name: true,
          walletAddress: true,
          role: true,
          isVerified: true,
          profileScore: true,
          loginStreak: true,
          lastLoginAt: true,
          createdAt: true,
          _count: {
            select: {
              applications: true,
              rewards: true,
              savedJobs: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('[ADMIN_USERS_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users — Update a user's role or verification status
export async function PATCH(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const { userId, role, isVerified } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (role && ['SEEKER', 'RECRUITER', 'ADMIN'].includes(role)) {
      updateData.role = role;
    }
    if (typeof isVerified === 'boolean') {
      updateData.isVerified = isVerified;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isVerified: true,
      },
    });

    console.log(
      `[ADMIN] User ${updatedUser.id} updated:`,
      JSON.stringify(updateData)
    );

    return NextResponse.json({ user: updatedUser });
  } catch (error: any) {
    console.error('[ADMIN_USER_UPDATE_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
