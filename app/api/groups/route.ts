import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// 获取用户的所有群组
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const memberships = await prisma.ideaGroupMember.findMany({
      where: { userId: session.user.id },
      include: {
        group: {
          include: {
            idea: {
              select: {
                id: true,
                title: true,
                description: true,
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
                  },
                },
              },
            },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: {
                sender: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        group: {
          updatedAt: "desc",
        },
      },
    });

    const groups = memberships.map((m) => ({
      id: m.group.id,
      name: m.group.name,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
      idea: {
        id: m.group.idea.id,
        title: m.group.idea.title,
        description: m.group.idea.description,
        author: m.group.idea.user,
      },
      members: m.group.members.map((member) => ({
        id: member.user.id,
        name: member.user.name,
        image: member.user.image,
        role: member.role,
      })),
      lastMessage: m.group.messages[0]
        ? {
            content: m.group.messages[0].content,
            sender: m.group.messages[0].sender.name,
            createdAt: m.group.messages[0].createdAt.toISOString(),
          }
        : null,
    }));

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("获取群组列表失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
