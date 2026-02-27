import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// 获取用户的项目列表
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: { userId: session.user.id },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          stage: true,
          progress: true,
          feasibility: true,
          potential: true,
          riskLevel: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.project.count({ where: { userId: session.user.id } }),
    ]);

    return NextResponse.json({
      projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("获取项目列表错误:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
