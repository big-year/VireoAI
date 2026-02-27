import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// 获取用户的创意列表
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const [ideas, total] = await Promise.all([
      prisma.idea.findMany({
        where: { userId: session.user.id },
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
          canvas: true,
          analysis: true,
        },
      }),
      prisma.idea.count({ where: { userId: session.user.id } }),
    ]);

    const formattedIdeas = ideas.map((idea) => ({
      ...idea,
      tags: idea.tags ? JSON.parse(idea.tags) : [],
      canvas: idea.canvas ? JSON.parse(idea.canvas) : null,
      analysis: idea.analysis ? JSON.parse(idea.analysis) : null,
    }));

    return NextResponse.json({
      ideas: formattedIdeas,
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
