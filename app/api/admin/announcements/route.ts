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

// 获取公告列表
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

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        include: {
          _count: {
            select: { readRecords: true },
          },
        },
      }),
      prisma.announcement.count(),
    ]);

    return NextResponse.json({
      announcements: announcements.map((a) => ({
        ...a,
        readCount: a._count.readRecords,
        _count: undefined,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("获取公告列表错误:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// 创建公告
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await checkAdmin();
    if ("error" in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const data = await request.json();

    const announcement = await prisma.announcement.create({
      data: {
        title: data.title,
        content: data.content,
        image: data.image || null,
        type: data.type || "popup",
        target: data.target || "all",
        triggerType: data.triggerType || "login",
        priority: data.priority || 0,
        isActive: data.isActive ?? true,
        startAt: data.startAt ? new Date(data.startAt) : null,
        endAt: data.endAt ? new Date(data.endAt) : null,
      },
    });

    return NextResponse.json({ announcement });
  } catch (error) {
    console.error("创建公告错误:", error);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}

// 更新公告
export async function PUT(request: NextRequest) {
  try {
    const adminCheck = await checkAdmin();
    if ("error" in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const data = await request.json();

    if (!data.id) {
      return NextResponse.json({ error: "公告ID不能为空" }, { status: 400 });
    }

    const announcement = await prisma.announcement.update({
      where: { id: data.id },
      data: {
        title: data.title,
        content: data.content,
        image: data.image || null,
        type: data.type,
        target: data.target,
        triggerType: data.triggerType,
        priority: data.priority,
        isActive: data.isActive,
        startAt: data.startAt ? new Date(data.startAt) : null,
        endAt: data.endAt ? new Date(data.endAt) : null,
      },
    });

    return NextResponse.json({ announcement });
  } catch (error) {
    console.error("更新公告错误:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

// 删除公告
export async function DELETE(request: NextRequest) {
  try {
    const adminCheck = await checkAdmin();
    if ("error" in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "公告ID不能为空" }, { status: 400 });
    }

    await prisma.announcement.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除公告错误:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
