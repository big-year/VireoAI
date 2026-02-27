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

// 获取创意详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await checkAdmin();
    if ("error" in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const { id } = await params;

    const idea = await prisma.idea.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
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
    console.error("获取创意详情错误:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// 更新创意
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await checkAdmin();
    if ("error" in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const { id } = await params;
    const { isPublic, title, description } = await request.json();

    const updateData: { isPublic?: boolean; title?: string; description?: string } = {};
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;

    const idea = await prisma.idea.update({
      where: { id },
      data: updateData,
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
    });

    return NextResponse.json({
      idea: {
        ...idea,
        tags: JSON.parse(idea.tags),
      },
    });
  } catch (error) {
    console.error("更新创意错误:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

// 删除创意
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await checkAdmin();
    if ("error" in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const { id } = await params;

    await prisma.idea.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除创意错误:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
