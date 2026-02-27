import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createMatchNotification } from "@/lib/notifications";

// 接受连接邀请
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { id: fromUserId } = await params;

    // 检查是否有对方发来的连接请求
    const existingLike = await prisma.userLike.findUnique({
      where: {
        fromUserId_toUserId: {
          fromUserId: fromUserId,
          toUserId: session.user.id,
        },
      },
    });

    if (!existingLike) {
      return NextResponse.json({ error: "未找到连接请求" }, { status: 404 });
    }

    if (existingLike.ignored) {
      return NextResponse.json({ error: "该请求已被忽略" }, { status: 400 });
    }

    // 获取双方用户信息
    const [currentUser, fromUser] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true },
      }),
      prisma.user.findUnique({
        where: { id: fromUserId },
        select: { id: true, name: true, image: true, emailVerified: true },
      }),
    ]);

    if (!fromUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 未验证邮箱的用户视为不存在
    if (!fromUser.emailVerified) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 检查是否已经匹配
    const existingMatch = await prisma.userMatch.findFirst({
      where: {
        OR: [
          { user1Id: session.user.id, user2Id: fromUserId },
          { user1Id: fromUserId, user2Id: session.user.id },
        ],
      },
    });

    if (existingMatch) {
      return NextResponse.json({ error: "已经连接" }, { status: 400 });
    }

    // 创建匹配记录
    const match = await prisma.userMatch.create({
      data: {
        user1Id: fromUserId,
        user2Id: session.user.id,
      },
    });

    // 同时创建当前用户对对方的喜欢记录（如果不存在）
    await prisma.userLike.upsert({
      where: {
        fromUserId_toUserId: {
          fromUserId: session.user.id,
          toUserId: fromUserId,
        },
      },
      update: {},
      create: {
        fromUserId: session.user.id,
        toUserId: fromUserId,
      },
    });

    // 发送匹配通知给双方
    await Promise.all([
      createMatchNotification(
        fromUserId,
        currentUser?.name || "用户",
        session.user.id
      ),
      createMatchNotification(
        session.user.id,
        fromUser.name || "用户",
        fromUserId
      ),
    ]);

    return NextResponse.json({
      success: true,
      matchId: match.id,
      matchedUser: {
        id: fromUser.id,
        name: fromUser.name,
        image: fromUser.image,
      },
    });
  } catch (error) {
    console.error("接受连接邀请错误:", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
