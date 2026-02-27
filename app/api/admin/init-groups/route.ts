import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// 为所有已公开但没有群组的创意创建群组（管理员功能）
export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    // 检查是否是管理员
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "admin") {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    // 查找所有公开但没有群组的创意
    const publicIdeasWithoutGroup = await prisma.idea.findMany({
      where: {
        isPublic: true,
        group: null,
      },
      select: {
        id: true,
        title: true,
        userId: true,
      },
    });

    let createdCount = 0;

    for (const idea of publicIdeasWithoutGroup) {
      try {
        await prisma.ideaGroup.create({
          data: {
            ideaId: idea.id,
            name: `${idea.title} 协作群`,
            members: {
              create: {
                userId: idea.userId,
                role: "owner",
              },
            },
          },
        });
        createdCount++;
      } catch (error) {
        console.error(`为创意 ${idea.id} 创建群组失败:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `已为 ${createdCount} 个创意创建群组`,
      total: publicIdeasWithoutGroup.length,
      created: createdCount,
    });
  } catch (error) {
    console.error("批量创建群组失败:", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
