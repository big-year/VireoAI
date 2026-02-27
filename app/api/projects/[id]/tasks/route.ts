import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// 获取项目任务
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

    // 检查项目是否属于当前用户
    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    const tasks = await prisma.projectTask.findMany({
      where: { projectId: id },
      orderBy: [{ completed: "asc" }, { priority: "desc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("获取任务错误:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// 创建任务
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
    const { title, description, priority, dueDate } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "任务标题不能为空" }, { status: 400 });
    }

    // 检查项目是否属于当前用户
    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    const task = await prisma.projectTask.create({
      data: {
        title,
        description,
        priority: priority || "medium",
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId: id,
      },
    });

    return NextResponse.json({ task });
  } catch (error) {
    console.error("创建任务错误:", error);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}

// 更新任务
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
    const { taskId, title, description, completed, priority, dueDate } =
      await request.json();

    if (!taskId) {
      return NextResponse.json({ error: "任务 ID 不能为空" }, { status: 400 });
    }

    // 检查项目是否属于当前用户
    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    const updateData: {
      title?: string;
      description?: string;
      completed?: boolean;
      priority?: string;
      dueDate?: Date | null;
    } = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (completed !== undefined) updateData.completed = completed;
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined)
      updateData.dueDate = dueDate ? new Date(dueDate) : null;

    const task = await prisma.projectTask.update({
      where: { id: taskId },
      data: updateData,
    });

    // 更新项目进度
    const allTasks = await prisma.projectTask.findMany({
      where: { projectId: id },
    });
    const completedTasks = allTasks.filter((t) => t.completed).length;
    const progress =
      allTasks.length > 0
        ? Math.round((completedTasks / allTasks.length) * 100)
        : 0;

    await prisma.project.update({
      where: { id },
      data: { progress },
    });

    return NextResponse.json({ task, progress });
  } catch (error) {
    console.error("更新任务错误:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

// 删除任务
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
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json({ error: "任务 ID 不能为空" }, { status: 400 });
    }

    // 检查项目是否属于当前用户
    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    await prisma.projectTask.delete({
      where: { id: taskId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除任务错误:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
