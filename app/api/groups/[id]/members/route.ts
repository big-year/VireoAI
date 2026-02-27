import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

// 获取群组成员列表
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

    const members = await prisma.ideaGroupMember.findMany({
      where: {
        groupId: id,
        user: {
          emailVerified: { not: null },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            bio: true,
            skills: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.user.id,
        name: m.user.name || "匿名用户",
        email: m.user.email,
        image: m.user.image,
        bio: m.user.bio,
        skills: m.user.skills ? JSON.parse(m.user.skills) : [],
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
      })),
      currentUserRole: membership.role,
    });
  } catch (error) {
    console.error("获取成员列表失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// 踢出成员
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "缺少用户ID" }, { status: 400 });
    }

    // 检查当前用户是否是群主
    const currentMembership = await prisma.ideaGroupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: id,
          userId: session.user.id,
        },
      },
    });

    if (!currentMembership || currentMembership.role !== "owner") {
      return NextResponse.json({ error: "只有群主可以踢出成员" }, { status: 403 });
    }

    // 不能踢出自己
    if (userId === session.user.id) {
      return NextResponse.json({ error: "不能踢出自己" }, { status: 400 });
    }

    // 获取群组信息
    const group = await prisma.ideaGroup.findUnique({
      where: { id },
      include: {
        idea: {
          select: { id: true, title: true },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "群组不存在" }, { status: 404 });
    }

    // 删除成员
    await prisma.ideaGroupMember.delete({
      where: {
        groupId_userId: {
          groupId: id,
          userId,
        },
      },
    });

    // 同时更新协作者状态为 rejected
    await prisma.ideaCollaborator.updateMany({
      where: {
        ideaId: group.ideaId,
        userId,
      },
      data: { status: "rejected" },
    });

    // 发送通知给被踢出的用户
    try {
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true },
      });

      await createNotification({
        userId,
        type: "collaboration",
        title: "你已被移出群组",
        content: `${currentUser?.name || "群主"} 将你移出了「${group.idea.title}」协作群`,
        link: "/groups",
        fromUserId: session.user.id,
      });
    } catch (notifyError) {
      console.error("发送通知失败:", notifyError);
    }

    return NextResponse.json({ success: true, message: "已移出成员" });
  } catch (error) {
    console.error("踢出成员失败:", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
