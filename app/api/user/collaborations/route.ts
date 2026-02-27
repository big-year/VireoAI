import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

// 获取我收到的协作申请
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    // 获取用户所有创意的协作申请（只显示已验证邮箱用户的申请）
    const collaborations = await prisma.ideaCollaborator.findMany({
      where: {
        idea: {
          userId: session.user.id,
        },
        user: {
          emailVerified: { not: null },
        },
      },
      orderBy: { createdAt: "desc" },
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
        idea: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // 格式化返回数据
    const formatted = collaborations.map((c) => ({
      id: c.id,
      status: c.status,
      message: c.message,
      createdAt: c.createdAt.toISOString(),
      user: {
        id: c.user.id,
        name: c.user.name || "匿名用户",
        email: c.user.email,
        image: c.user.image,
        bio: c.user.bio,
        skills: c.user.skills ? JSON.parse(c.user.skills) : [],
      },
      idea: {
        id: c.idea.id,
        title: c.idea.title,
      },
    }));

    return NextResponse.json({ collaborations: formatted });
  } catch (error) {
    console.error("获取协作申请失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// 处理协作申请（接受/拒绝）
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { collaborationId, action } = await request.json();

    if (!collaborationId || !["accept", "reject"].includes(action)) {
      return NextResponse.json({ error: "参数错误" }, { status: 400 });
    }

    // 检查协作申请是否存在且属于当前用户的创意
    const collaboration = await prisma.ideaCollaborator.findUnique({
      where: { id: collaborationId },
      include: {
        idea: {
          select: {
            id: true,
            title: true,
            userId: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!collaboration) {
      return NextResponse.json({ error: "申请不存在" }, { status: 404 });
    }

    if (collaboration.idea.userId !== session.user.id) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    const newStatus = action === "accept" ? "accepted" : "rejected";

    // 更新状态
    await prisma.ideaCollaborator.update({
      where: { id: collaborationId },
      data: { status: newStatus },
    });

    // 如果接受，将用户加入群组
    if (action === "accept") {
      // 查找或创建群组
      let group = await prisma.ideaGroup.findUnique({
        where: { ideaId: collaboration.idea.id },
      });

      if (!group) {
        // 如果群组不存在，创建群组并将作者加入
        group = await prisma.ideaGroup.create({
          data: {
            ideaId: collaboration.idea.id,
            name: `${collaboration.idea.title} 协作群`,
            members: {
              create: {
                userId: collaboration.idea.userId,
                role: "owner",
              },
            },
          },
        });
      }

      // 将申请者加入群组
      await prisma.ideaGroupMember.upsert({
        where: {
          groupId_userId: {
            groupId: group.id,
            userId: collaboration.user.id,
          },
        },
        update: {},
        create: {
          groupId: group.id,
          userId: collaboration.user.id,
          role: "member",
        },
      });
    }

    // 发送通知给申请者
    try {
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true },
      });

      // 获取群组ID用于跳转
      const group = await prisma.ideaGroup.findUnique({
        where: { ideaId: collaboration.idea.id },
        select: { id: true },
      });

      await createNotification({
        userId: collaboration.user.id,
        type: "collaboration",
        title: action === "accept" ? "协作申请已通过" : "协作申请被拒绝",
        content:
          action === "accept"
            ? `${currentUser?.name || "创意作者"} 接受了你加入「${collaboration.idea.title}」的申请，快去群组打个招呼吧！`
            : `${currentUser?.name || "创意作者"} 拒绝了你加入「${collaboration.idea.title}」的申请`,
        link: action === "accept" && group ? `/groups/${group.id}` : "/nebula",
        fromUserId: session.user.id,
      });
    } catch (notifyError) {
      console.error("发送通知失败:", notifyError);
    }

    return NextResponse.json({
      success: true,
      message: action === "accept" ? "已接受申请" : "已拒绝申请",
    });
  } catch (error) {
    console.error("处理协作申请失败:", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
