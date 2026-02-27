import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

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

// 获取创意列表
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
    const isPublic = searchParams.get("isPublic");
    const userId = searchParams.get("userId");

    const where: {
      OR?: { title?: { contains: string }; description?: { contains: string } }[];
      isPublic?: boolean;
      userId?: string;
    } = {};

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (isPublic !== null && isPublic !== "") {
      where.isPublic = isPublic === "true";
    }

    if (userId) {
      where.userId = userId;
    }

    const [ideas, total] = await Promise.all([
      prisma.idea.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          description: true,
          tags: true,
          score: true,
          isPublic: true,
          likes: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.idea.count({ where }),
    ]);

    return NextResponse.json({
      ideas: ideas.map((idea) => ({
        ...idea,
        tags: JSON.parse(idea.tags),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("获取创意列表错误:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
