import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// 获取所有对话列表（带未读消息数）
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    // 检查 directMessage 模型是否存在
    if (!prisma.directMessage) {
      return NextResponse.json({ conversations: [], unreadTotal: 0 });
    }

    // 获取用户的所有匹配
    const matches = await prisma.userMatch.findMany({
      where: {
        OR: [
          { user1Id: session.user.id },
          { user2Id: session.user.id },
        ],
      },
      include: {
        user1: { select: { id: true, name: true, image: true, title: true } },
        user2: { select: { id: true, name: true, image: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // 获取每个匹配的最新消息和未读数
    const conversations = await Promise.all(
      matches.map(async (match) => {
        const otherUser = match.user1Id === session.user.id ? match.user2 : match.user1;

        // 获取最新消息
        const lastMessage = await prisma.directMessage.findFirst({
          where: { matchId: match.id },
          orderBy: { createdAt: "desc" },
        });

        // 获取未读消息数
        const unreadCount = await prisma.directMessage.count({
          where: {
            matchId: match.id,
            senderId: { not: session.user.id },
            read: false,
          },
        });

        return {
          matchId: match.id,
          otherUser: {
            id: otherUser.id,
            name: otherUser.name || "未知用户",
            image: otherUser.image,
            title: otherUser.title || "",
            initials: (otherUser.name || "U")[0].toUpperCase(),
          },
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            createdAt: lastMessage.createdAt,
            isFromMe: lastMessage.senderId === session.user.id,
          } : null,
          unreadCount,
          updatedAt: lastMessage?.createdAt || match.createdAt,
        };
      })
    );

    // 按最后消息时间排序
    conversations.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    // 计算总未读数
    const unreadTotal = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

    return NextResponse.json({ conversations, unreadTotal });
  } catch (error) {
    console.error("获取对话列表失败:", error);
    return NextResponse.json({ conversations: [], unreadTotal: 0 });
  }
}
