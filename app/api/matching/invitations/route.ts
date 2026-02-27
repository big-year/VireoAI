import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// 获取收到的连接邀请
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const userId = session.user.id;

    // 获取收到的连接请求（排除已忽略的和已匹配的）
    const receivedLikes = await prisma.userLike.findMany({
      where: {
        toUserId: userId,
        ignored: false,
      },
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            image: true,
            title: true,
            bio: true,
            location: true,
            skills: true,
            interests: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 获取已匹配的用户ID
    const matches = await prisma.userMatch.findMany({
      where: {
        OR: [
          { user1Id: userId },
          { user2Id: userId },
        ],
      },
    });

    const matchedUserIds = new Set(
      matches.map((m) =>
        m.user1Id === userId ? m.user2Id : m.user1Id
      )
    );

    // 过滤掉已匹配的用户
    const invitations = receivedLikes
      .filter((like) => !matchedUserIds.has(like.fromUserId))
      .map((like) => ({
        id: like.id,
        createdAt: like.createdAt,
        user: {
          id: like.fromUser.id,
          name: like.fromUser.name || "未设置昵称",
          image: like.fromUser.image,
          title: like.fromUser.title || "创业者",
          bio: like.fromUser.bio || "",
          location: like.fromUser.location || "未知",
          initials: like.fromUser.name?.[0] || "U",
          skills: like.fromUser.skills ? JSON.parse(like.fromUser.skills) : [],
          interests: like.fromUser.interests ? JSON.parse(like.fromUser.interests) : [],
        },
      }));

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error("获取连接邀请错误:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
