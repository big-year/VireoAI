import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isEmailVerificationRequired } from "@/lib/settings";

// 检查管理员权限
async function checkAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "未登录", status: 401 };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== "admin") {
    return { error: "无权限", status: 403 };
  }

  return { user: session.user };
}

// 获取用户列表
export async function GET(request: NextRequest) {
  try {
    const adminCheck = await checkAdmin();
    if ("error" in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";
    const showUnverified = searchParams.get("showUnverified") === "true";

    // 检查是否开启了邮箱验证
    const requireVerification = await isEmailVerificationRequired();

    const where: {
      OR?: { email?: { contains: string }; name?: { contains: string } }[];
      role?: string;
      emailVerified?: { not: null } | null;
    } = {};

    if (search) {
      where.OR = [
        { email: { contains: search } },
        { name: { contains: search } },
      ];
    }

    if (role) {
      where.role = role;
    }

    // 如果开启了邮箱验证，默认只显示已验证用户
    if (requireVerification && !showUnverified) {
      where.emailVerified = { not: null };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          emailVerified: true,
          createdAt: true,
          _count: {
            select: { ideas: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users: users.map((u) => ({
        ...u,
        ideasCount: u._count.ideas,
        isVerified: !!u.emailVerified,
        _count: undefined,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      requireVerification,
    });
  } catch (error) {
    console.error("获取用户列表错误:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
