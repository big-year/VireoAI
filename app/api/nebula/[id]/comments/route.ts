import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createCommentNotification } from "@/lib/notifications";

// 获取创意评论
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const comments = await prisma.ideaComment.findMany({
      where: { ideaId: id, parentId: null },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    // 转换格式，将 user 转为 author
    const formattedComments = comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      author: {
        id: comment.user.id,
        name: comment.user.name || "匿名用户",
        image: comment.user.image,
        initials: (comment.user.name || "匿名")[0],
      },
      replies: comment.replies.map((reply) => ({
        id: reply.id,
        content: reply.content,
        createdAt: reply.createdAt.toISOString(),
        author: {
          id: reply.user.id,
          name: reply.user.name || "匿名用户",
          image: reply.user.image,
          initials: (reply.user.name || "匿名")[0],
        },
      })),
    }));

    return NextResponse.json({ comments: formattedComments });
  } catch (error) {
    console.error("获取评论错误:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// 发表评论
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
    const { content, parentId } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: "评论内容不能为空" }, { status: 400 });
    }

    // 检查创意是否存在且公开
    const idea = await prisma.idea.findFirst({
      where: { id, isPublic: true },
    });

    if (!idea) {
      return NextResponse.json({ error: "创意不存在" }, { status: 404 });
    }

    const comment = await prisma.ideaComment.create({
      data: {
        content: content.trim(),
        ideaId: id,
        userId: session.user.id,
        parentId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // 发送通知给创意作者（不通知自己）
    if (idea.userId !== session.user.id) {
      try {
        await createCommentNotification(
          idea.userId,
          comment.user.name || "用户",
          session.user.id,
          idea.title,
          idea.id
        );
      } catch (notifyError) {
        // 通知失败不影响评论操作
        console.error("发送评论通知失败:", notifyError);
      }
    }

    // 返回格式化的评论
    const formattedComment = {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      author: {
        id: comment.user.id,
        name: comment.user.name || "匿名用户",
        image: comment.user.image,
        initials: (comment.user.name || "匿名")[0],
      },
    };

    return NextResponse.json({ comment: formattedComment });
  } catch (error) {
    console.error("发表评论错误:", error);
    return NextResponse.json({ error: "发表失败" }, { status: 500 });
  }
}
