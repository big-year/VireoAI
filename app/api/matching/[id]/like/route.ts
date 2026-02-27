import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createMatchNotification, createUserLikeNotification } from "@/lib/notifications";

// 发起连接请求
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { id: targetUserId } = await params;

    if (targetUserId === session.user.id) {
      return NextResponse.json({ error: "不能向自己发起连接" }, { status: 400 });
    }

    // 检查目标用户是否存在且已验证邮箱
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 未验证邮箱的用户视为不存在
    if (!targetUser.emailVerified) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 检查是否已发送过连接请求
    const existingLike = await prisma.userLike.findUnique({
      where: {
        fromUserId_toUserId: {
          fromUserId: session.user.id,
          toUserId: targetUserId,
        },
      },
    });

    if (existingLike) {
      // 如果之前被忽略了，重新激活
      if (existingLike.ignored) {
        // 这种情况不应该发生，因为被忽略后状态会恢复为 none
        return NextResponse.json({ error: "已经发送过连接请求" }, { status: 400 });
      }
      return NextResponse.json({ error: "已经发送过连接请求" }, { status: 400 });
    }

    // 创建连接请求记录
    await prisma.userLike.create({
      data: {
        fromUserId: session.user.id,
        toUserId: targetUserId,
      },
    });

    // 获取当前用户信息用于通知
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    });

    // 检查对方是否也向我发送过连接请求（双向连接 = 匹配）
    const mutualLike = await prisma.userLike.findUnique({
      where: {
        fromUserId_toUserId: {
          fromUserId: targetUserId,
          toUserId: session.user.id,
        },
      },
    });

    let matched = false;
    let matchId = null;
    if (mutualLike && !mutualLike.ignored) {
      // 创建匹配
      const match = await prisma.userMatch.create({
        data: {
          user1Id: session.user.id,
          user2Id: targetUserId,
        },
      });
      matched = true;
      matchId = match.id;

      // 发送连接成功通知给双方
      await Promise.all([
        createMatchNotification(
          targetUserId,
          currentUser?.name || "用户",
          session.user.id
        ),
        createMatchNotification(
          session.user.id,
          targetUser.name || "用户",
          targetUserId
        ),
      ]);
    } else {
      // 单方面发起连接，通知对方有人想与他建立连接
      await createUserLikeNotification(
        targetUserId,
        currentUser?.name || "有人",
        session.user.id
      );
    }

    return NextResponse.json({
      success: true,
      matched,
      matchId,
      matchedUser: matched
        ? {
            id: targetUser.id,
            name: targetUser.name,
            image: targetUser.image,
          }
        : null,
    });
  } catch (error) {
    console.error("发起连接错误:", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
