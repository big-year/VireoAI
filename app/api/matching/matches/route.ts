import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// 获取我的匹配列表
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const matches = await prisma.userMatch.findMany({
      where: {
        OR: [
          { user1Id: session.user.id },
          { user2Id: session.user.id },
        ],
      },
      include: {
        user1: {
          select: {
            id: true,
            name: true,
            image: true,
            title: true,
            bio: true,
          },
        },
        user2: {
          select: {
            id: true,
            name: true,
            image: true,
            title: true,
            bio: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 返回匹配的对方用户信息
    const matchedUsers = matches.map((match) => {
      const otherUser =
        match.user1Id === session.user.id ? match.user2 : match.user1;
      return {
        matchId: match.id,
        matchedAt: match.createdAt,
        user: {
          id: otherUser.id,
          name: otherUser.name || "未设置昵称",
          image: otherUser.image,
          title: otherUser.title || "创业者",
          bio: otherUser.bio || "",
          initials: otherUser.name?.[0] || "U",
        },
      };
    });

    return NextResponse.json({ matches: matchedUsers });
  } catch (error) {
    console.error("获取匹配列表错误:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
