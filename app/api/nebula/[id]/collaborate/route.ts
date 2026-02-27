import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createCollaborationNotification } from "@/lib/notifications";

// 申请加入协作
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
    const body = await request.json().catch(() => ({}));
    const message = body.message || "";

    // 检查创意是否存在且公开
    const idea = await prisma.idea.findFirst({
      where: { id, isPublic: true },
    });

    if (!idea) {
      return NextResponse.json({ error: "创意不存在" }, { status: 404 });
    }

    // 不能申请加入自己的创意
    if (idea.userId === session.user.id) {
      return NextResponse.json({ error: "不能申请加入自己的创意" }, { status: 400 });
    }

    // 检查是否已申请
    const existingRequest = await prisma.ideaCollaborator.findUnique({
      where: {
        ideaId_userId: {
          ideaId: id,
          userId: session.user.id,
        },
      },
    });

    if (existingRequest) {
      if (existingRequest.status === "accepted") {
        return NextResponse.json({ error: "你已经是协作者了" }, { status: 400 });
      }
      if (existingRequest.status === "pending") {
        return NextResponse.json({ error: "你已经申请过了，请等待审核" }, { status: 400 });
      }
      // 如果之前被拒绝，可以重新申请
      await prisma.ideaCollaborator.update({
        where: { id: existingRequest.id },
        data: { status: "pending", message },
      });
    } else {
      await prisma.ideaCollaborator.create({
        data: {
          ideaId: id,
          userId: session.user.id,
          message,
        },
      });
    }

    // 发送通知给创意作者
    try {
      const requester = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true },
      });
      await createCollaborationNotification(
        idea.userId,
        requester?.name || "用户",
        session.user.id,
        idea.title
      );
    } catch (notifyError) {
      console.error("发送协作通知失败:", notifyError);
    }

    return NextResponse.json({ success: true, message: "申请已提交" });
  } catch (error) {
    console.error("申请协作错误:", error);
    return NextResponse.json({ error: "申请失败" }, { status: 500 });
  }
}

// 获取协作状态
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ status: null });
    }

    const { id } = await params;

    const collaboration = await prisma.ideaCollaborator.findUnique({
      where: {
        ideaId_userId: {
          ideaId: id,
          userId: session.user.id,
        },
      },
    });

    return NextResponse.json({
      status: collaboration?.status || null,
      isOwner: false, // 会在前端判断
    });
  } catch (error) {
    console.error("获取协作状态错误:", error);
    return NextResponse.json({ status: null });
  }
}
