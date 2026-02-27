import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// 获取项目里程碑
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

    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    const milestones = await prisma.projectMilestone.findMany({
      where: { projectId: id },
      orderBy: { order: "asc" },
      include: {
        tasks: {
          select: { id: true, title: true, completed: true },
        },
      },
    });

    return NextResponse.json({ milestones });
  } catch (error) {
    console.error("获取里程碑错误:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// 创建里程碑
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { id } = await params;
    const { title, description, dueDate } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    // 获取最大 order
    const maxOrder = await prisma.projectMilestone.aggregate({
      where: { projectId: id },
      _max: { order: true },
    });

    const milestone = await prisma.projectMilestone.create({
      data: {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId: id,
        order: (maxOrder._max.order || 0) + 1,
      },
      include: {
        tasks: {
          select: { id: true, title: true, completed: true },
        },
      },
    });

    return NextResponse.json({ milestone });
  } catch (error) {
    console.error("创建里程碑错误:", error);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}

// 更新里程碑
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
    const { milestoneId, title, description, dueDate, completed } = await request.json();

    if (!milestoneId) {
      return NextResponse.json({ error: "里程碑 ID 不能为空" }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (completed !== undefined) {
      updateData.completed = completed;
      updateData.completedAt = completed ? new Date() : null;
    }

    const milestone = await prisma.projectMilestone.update({
      where: { id: milestoneId },
      data: updateData,
      include: {
        tasks: {
          select: { id: true, title: true, completed: true },
        },
      },
    });

    return NextResponse.json({ milestone });
  } catch (error) {
    console.error("更新里程碑错误:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

// 删除里程碑
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const milestoneId = searchParams.get("milestoneId");

    if (!milestoneId) {
      return NextResponse.json({ error: "里程碑 ID 不能为空" }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    await prisma.projectMilestone.delete({
      where: { id: milestoneId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除里程碑错误:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
