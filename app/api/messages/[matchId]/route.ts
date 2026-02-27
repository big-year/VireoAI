import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// 获取与某个匹配用户的消息
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { matchId } = await params;

    // 检查是否是该匹配的参与者
    const match = await prisma.userMatch.findFirst({
      where: {
        id: matchId,
        OR: [
          { user1Id: session.user.id },
          { user2Id: session.user.id },
        ],
      },
      include: {
        user1: { select: { id: true, name: true, image: true } },
        user2: { select: { id: true, name: true, image: true } },
      },
    });

    if (!match) {
      return NextResponse.json({ error: "匹配不存在" }, { status: 404 });
    }

    // 检查 directMessage 模型是否存在
    if (!prisma.directMessage) {
      return NextResponse.json({ messages: [], match });
    }

    // 获取消息
    const messages = await prisma.directMessage.findMany({
      where: { matchId },
      orderBy: { createdAt: "asc" },
      include: {
        sender: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    // 标记对方发送的消息为已读
    await prisma.directMessage.updateMany({
      where: {
        matchId,
        senderId: { not: session.user.id },
        read: false,
      },
      data: { read: true },
    });

    // 获取对方用户信息
    const otherUser = match.user1Id === session.user.id ? match.user2 : match.user1;

    return NextResponse.json({ messages, match, otherUser });
  } catch (error) {
    console.error("获取消息失败:", error);
    return NextResponse.json({ messages: [], match: null, otherUser: null });
  }
}

// 发送消息
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { matchId } = await params;
    const { content } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: "消息内容不能为空" }, { status: 400 });
    }

    // 检查是否是该匹配的参与者
    const match = await prisma.userMatch.findFirst({
      where: {
        id: matchId,
        OR: [
          { user1Id: session.user.id },
          { user2Id: session.user.id },
        ],
      },
    });

    if (!match) {
      return NextResponse.json({ error: "匹配不存在" }, { status: 404 });
    }

    // 检查 directMessage 模型是否存在
    if (!prisma.directMessage) {
      return NextResponse.json({ error: "消息功能尚未启用" }, { status: 500 });
    }

    const message = await prisma.directMessage.create({
      data: {
        content: content.trim(),
        matchId,
        senderId: session.user.id,
      },
      include: {
        sender: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error("发送消息失败:", error);
    return NextResponse.json({ error: "发送失败" }, { status: 500 });
  }
}
