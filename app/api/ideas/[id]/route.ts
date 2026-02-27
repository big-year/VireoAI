import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// 更新创意
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { id } = await params;
    const { canvas, analysis, title, description, tags, marketSize, score } = await request.json();

    // 检查创意是否属于当前用户
    const idea = await prisma.idea.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!idea) {
      return NextResponse.json({ error: "创意不存在" }, { status: 404 });
    }

    // 构建更新数据
    const updateData: {
      canvas?: string;
      analysis?: string;
      title?: string;
      description?: string;
      tags?: string;
      marketSize?: string;
      score?: number;
    } = {};

    if (canvas !== undefined) updateData.canvas = JSON.stringify(canvas);
    if (analysis !== undefined) updateData.analysis = JSON.stringify(analysis);
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) updateData.tags = JSON.stringify(tags);
    if (marketSize !== undefined) updateData.marketSize = marketSize;
    if (score !== undefined) updateData.score = score;

    const updatedIdea = await prisma.idea.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      idea: {
        ...updatedIdea,
        tags: JSON.parse(updatedIdea.tags),
        canvas: updatedIdea.canvas ? JSON.parse(updatedIdea.canvas) : null,
        analysis: updatedIdea.analysis ? JSON.parse(updatedIdea.analysis) : null,
      },
    });
  } catch (error) {
    console.error("更新创意错误:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

// 获取单个创意
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { id } = await params;

    const idea = await prisma.idea.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!idea) {
      return NextResponse.json({ error: "创意不存在" }, { status: 404 });
    }

    return NextResponse.json({
      idea: {
        ...idea,
        tags: JSON.parse(idea.tags),
        canvas: idea.canvas ? JSON.parse(idea.canvas) : null,
        analysis: idea.analysis ? JSON.parse(idea.analysis) : null,
      },
    });
  } catch (error) {
    console.error("获取创意错误:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
