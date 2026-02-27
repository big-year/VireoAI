import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// 根据创意ID获取关联的项目
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ideaId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { ideaId } = await params;

    // 查找该创意关联的项目
    const project = await prisma.project.findFirst({
      where: {
        ideaId,
        userId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        stage: true,
      },
    });

    return NextResponse.json({ project });
  } catch (error) {
    console.error("查询项目错误:", error);
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}
