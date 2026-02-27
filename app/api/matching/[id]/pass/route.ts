import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// 跳过用户（不感兴趣）
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

    // 这里可以记录跳过的用户，用于后续不再推荐
    // 目前简单处理，只返回成功
    // 如果需要持久化，可以创建一个 UserPass 表

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("跳过用户错误:", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
