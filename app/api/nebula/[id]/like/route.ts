import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createLikeNotification } from "@/lib/notifications";

// 点赞创意
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { id } = await params;

    // 检查创意是否存在且公开
    const idea = await prisma.idea.findFirst({
      where: { id, isPublic: true },
    });

    if (!idea) {
      return NextResponse.json({ error: "创意不存在" }, { status: 404 });
    }

    // 检查是否已点赞
    const existingLike = await prisma.ideaLike.findUnique({
      where: {
        ideaId_userId: {
          ideaId: id,
          userId: session.user.id,
        },
      },
    });

    if (existingLike) {
      // 取消点赞
      await prisma.ideaLike.delete({
        where: { id: existingLike.id },
      });

      await prisma.idea.update({
        where: { id },
        data: { likes: { decrement: 1 } },
      });

      return NextResponse.json({ liked: false, likes: idea.likes - 1 });
    } else {
      // 点赞
      await prisma.ideaLike.create({
        data: {
          ideaId: id,
          userId: session.user.id,
        },
      });

      await prisma.idea.update({
        where: { id },
        data: { likes: { increment: 1 } },
      });

      // 发送通知给创意作者（不通知自己）
      if (idea.userId !== session.user.id) {
        try {
          const liker = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { name: true },
          });
          await createLikeNotification(
            idea.userId,
            liker?.name || "用户",
            session.user.id,
            idea.title
          );
        } catch (notifyError) {
          // 通知失败不影响点赞操作
          console.error("发送点赞通知失败:", notifyError);
        }
      }

      return NextResponse.json({ liked: true, likes: idea.likes + 1 });
    }
  } catch (error) {
    console.error("点赞错误:", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
