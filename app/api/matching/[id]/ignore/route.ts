import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// 忽略连接邀请
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

    // 标记为已忽略
    await prisma.userLike.update({
      where: {
        fromUserId_toUserId: {
          fromUserId: fromUserId,
          toUserId: session.user.id,
        },
      },
      data: {
        ignored: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("忽略连接邀请错误:", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
