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

// 获取所有通知（管理员）
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
    const limit = parseInt(searchParams.get("limit") || "20");
    const type = searchParams.get("type") || "";
    const search = searchParams.get("search") || "";

    const where: any = {};
    if (type) {
      where.type = type;
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
        { user: { email: { contains: search } } },
        { user: { name: { contains: search } } },
      ];
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          fromUser: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      }),
      prisma.notification.count({ where }),
    ]);

    // 获取统计数据
    const [totalCount, unreadCount, typeStats] = await Promise.all([
      prisma.notification.count(),
      prisma.notification.count({ where: { read: false } }),
      prisma.notification.groupBy({
        by: ["type"],
        _count: { type: true },
      }),
    ]);

    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total: totalCount,
        unread: unreadCount,
        byType: typeStats.reduce((acc, item) => {
          acc[item.type] = item._count.type;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    console.error("获取通知列表失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// 发送系统通知（管理员）
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await checkAdmin();
    if ("error" in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const { title, content, link, userIds, sendToAll } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
    }

    let targetUserIds: string[] = [];

    if (sendToAll) {
      // 发送给所有已验证邮箱的用户
      const users = await prisma.user.findMany({
        where: { emailVerified: { not: null } },
        select: { id: true },
      });
      targetUserIds = users.map((u) => u.id);
    } else if (userIds && userIds.length > 0) {
      targetUserIds = userIds;
    } else {
      return NextResponse.json(
        { error: "请选择接收用户" },
        { status: 400 }
      );
    }

    // 批量创建通知
    const notifications = await prisma.notification.createMany({
      data: targetUserIds.map((userId) => ({
        type: "system",
        title,
        content,
        link,
        userId,
      })),
    });

    return NextResponse.json({
      success: true,
      count: notifications.count,
    });
  } catch (error) {
    console.error("发送通知失败:", error);
    return NextResponse.json({ error: "发送失败" }, { status: 500 });
  }
}

// 删除通知（管理员）
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
    const clearAll = searchParams.get("clearAll") === "true";
    const clearRead = searchParams.get("clearRead") === "true";

    if (clearAll) {
      await prisma.notification.deleteMany({});
    } else if (clearRead) {
      await prisma.notification.deleteMany({
        where: { read: true },
      });
    } else if (id) {
      await prisma.notification.delete({
        where: { id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除通知失败:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
