import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// 获取用户所有群组的未读消息数量
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    // 获取用户所有群组成员记录
    const memberships = await prisma.ideaGroupMember.findMany({
      where: { userId: session.user.id },
      select: {
        groupId: true,
        lastReadAt: true,
      },
    });

    if (memberships.length === 0) {
      return NextResponse.json({ total: 0, groups: {} });
    }

    // 统计每个群组的未读消息数
    const groupUnreadCounts: Record<string, number> = {};
    let total = 0;

    for (const membership of memberships) {
      const unreadCount = await prisma.ideaGroupMessage.count({
        where: {
          groupId: membership.groupId,
          createdAt: { gt: membership.lastReadAt },
          senderId: { not: session.user.id }, // 不计算自己发的消息
        },
      });

      groupUnreadCounts[membership.groupId] = unreadCount;
      total += unreadCount;
    }

    return NextResponse.json({
      total,
      groups: groupUnreadCounts,
    });
  } catch (error) {
    console.error("获取未读消息数失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
