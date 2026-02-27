import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// 获取群组详情和消息
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id } = await params;

    // 检查用户是否是群组成员
    const membership = await prisma.ideaGroupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: id,
          userId: session.user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "你不是该群组成员" }, { status: 403 });
    }

    // 更新最后阅读时间（标记为已读）
    await prisma.ideaGroupMember.update({
      where: {
        groupId_userId: {
          groupId: id,
          userId: session.user.id,
        },
      },
      data: { lastReadAt: new Date() },
    });

    const group = await prisma.ideaGroup.findUnique({
      where: { id },
      include: {
        idea: {
          select: {
            id: true,
            title: true,
            description: true,
            tags: true,
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                bio: true,
                skills: true,
              },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "群组不存在" }, { status: 404 });
    }

    return NextResponse.json({
      group: {
        id: group.id,
        name: group.name,
        createdAt: group.createdAt.toISOString(),
        idea: {
          id: group.idea.id,
          title: group.idea.title,
          description: group.idea.description,
          tags: JSON.parse(group.idea.tags),
          author: group.idea.user,
        },
        members: group.members.map((m) => ({
          id: m.user.id,
          name: m.user.name || "匿名用户",
          image: m.user.image,
          bio: m.user.bio,
          skills: m.user.skills ? JSON.parse(m.user.skills) : [],
          role: m.role,
          joinedAt: m.joinedAt.toISOString(),
        })),
        messages: group.messages.map((msg) => ({
          id: msg.id,
          content: msg.content,
          createdAt: msg.createdAt.toISOString(),
          sender: {
            id: msg.sender.id,
            name: msg.sender.name || "匿名用户",
            image: msg.sender.image,
          },
          isOwn: msg.senderId === session.user?.id,
        })),
      },
      currentUserRole: membership.role,
    });
  } catch (error) {
    console.error("获取群组详情失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// 发送消息
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id } = await params;
    const { content } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: "消息内容不能为空" }, { status: 400 });
    }

    // 检查用户是否是群组成员
    const membership = await prisma.ideaGroupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: id,
          userId: session.user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "你不是该群组成员" }, { status: 403 });
    }

    // 创建消息
    const message = await prisma.ideaGroupMessage.create({
      data: {
        groupId: id,
        senderId: session.user.id,
        content: content.trim(),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // 更新群组的 updatedAt
    await prisma.ideaGroup.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      message: {
        id: message.id,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
        sender: {
          id: message.sender.id,
          name: message.sender.name || "匿名用户",
          image: message.sender.image,
        },
        isOwn: true,
      },
    });
  } catch (error) {
    console.error("发送消息失败:", error);
    return NextResponse.json({ error: "发送失败" }, { status: 500 });
  }
}
