import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// 获取项目的咨询记录
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { id: projectId } = await params;

    // 验证项目所有权
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    // 获取项目关联的所有对话
    const conversations = await prisma.conversation.findMany({
      where: {
        projectId: projectId,
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 1, // 只取第一条消息作为预览
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("获取项目咨询记录失败:", error);
    return NextResponse.json(
      { error: "获取咨询记录失败" },
      { status: 500 }
    );
  }
}
