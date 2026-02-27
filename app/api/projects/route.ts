import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// 获取用户项目列表
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // active, archived, all

    const where: { userId: string; stage?: { not: string } | string } = {
      userId: session.user.id,
    };

    if (status === "active") {
      where.stage = { not: "archived" };
    } else if (status === "archived") {
      where.stage = "archived";
    }

    const projects = await prisma.project.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        idea: {
          select: {
            id: true,
            title: true,
            tags: true,
            description: true,
            canvas: true,
            analysis: true,
          },
        },
        tasks: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({
      projects: projects.map((p) => ({
        ...p,
        idea: p.idea
          ? {
              ...p.idea,
              tags: JSON.parse(p.idea.tags),
              canvas: p.idea.canvas ? JSON.parse(p.idea.canvas) : null,
              analysis: p.idea.analysis ? JSON.parse(p.idea.analysis) : null,
            }
          : null,
        insights: p.insights ? JSON.parse(p.insights) : [],
      })),
    });
  } catch (error) {
    console.error("获取项目列表错误:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// 创建新项目
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { name, description, ideaId } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "项目名称不能为空" }, { status: 400 });
    }

    // 如果关联创意，检查创意是否属于当前用户
    if (ideaId) {
      const idea = await prisma.idea.findFirst({
        where: { id: ideaId, userId: session.user.id },
      });
      if (!idea) {
        return NextResponse.json({ error: "创意不存在" }, { status: 404 });
      }
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        userId: session.user.id,
        ideaId,
      },
      include: {
        idea: {
          select: {
            id: true,
            title: true,
            tags: true,
          },
        },
        tasks: true,
      },
    });

    return NextResponse.json({
      project: {
        ...project,
        idea: project.idea
          ? {
              ...project.idea,
              tags: JSON.parse(project.idea.tags),
            }
          : null,
        insights: [],
      },
    });
  } catch (error) {
    console.error("创建项目错误:", error);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}

// 更新项目
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { id, name, description, stage, progress } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "项目 ID 不能为空" }, { status: 400 });
    }

    // 检查项目是否属于当前用户
    const existing = await prisma.project.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    const updateData: {
      name?: string;
      description?: string;
      stage?: string;
      progress?: number;
    } = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (stage !== undefined) updateData.stage = stage;
    if (progress !== undefined) updateData.progress = progress;

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        idea: {
          select: {
            id: true,
            title: true,
            tags: true,
          },
        },
        tasks: true,
      },
    });

    return NextResponse.json({
      project: {
        ...project,
        idea: project.idea
          ? {
              ...project.idea,
              tags: JSON.parse(project.idea.tags),
            }
          : null,
        insights: project.insights ? JSON.parse(project.insights) : [],
      },
    });
  } catch (error) {
    console.error("更新项目错误:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

// 删除项目
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "项目 ID 不能为空" }, { status: 400 });
    }

    // 检查项目是否属于当前用户
    const existing = await prisma.project.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除项目错误:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
