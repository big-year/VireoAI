import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// 获取当前用户应该看到的公告
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const triggerType = searchParams.get("trigger") || "login"; // login, immediate
    const includeRead = searchParams.get("includeRead") === "true"; // 是否包含已读公告

    const now = new Date();

    // 获取用户已读的公告ID
    let readAnnouncementIds: string[] = [];
    if (session?.user?.id && !includeRead) {
      const readRecords = await prisma.announcementRead.findMany({
        where: { userId: session.user.id },
        select: { announcementId: true },
      });
      readAnnouncementIds = readRecords.map((r) => r.announcementId);
    }

    // 获取公告
    const announcements = await prisma.announcement.findMany({
      where: {
        isActive: true,
        triggerType,
        target: session?.user?.id ? { in: ["all", "loggedIn"] } : { in: ["all", "guest"] },
        OR: [{ startAt: null }, { startAt: { lte: now } }],
        AND: [{ OR: [{ endAt: null }, { endAt: { gte: now } }] }],
        ...(readAnnouncementIds.length > 0 ? { id: { notIn: readAnnouncementIds } } : {}),
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 10,
    });

    return NextResponse.json({ announcements });
  } catch (error) {
    console.error("获取公告错误:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// 标记公告为已读
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      // 未登录用户不记录已读状态，由前端用 localStorage 处理
      return NextResponse.json({ success: true });
    }

    const { announcementId } = await request.json();

    if (!announcementId) {
      return NextResponse.json({ error: "公告ID不能为空" }, { status: 400 });
    }

    // 创建已读记录（如果已存在则忽略）
    await prisma.announcementRead.upsert({
      where: {
        announcementId_userId: {
          announcementId,
          userId: session.user.id,
        },
      },
      update: {},
      create: {
        announcementId,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("标记公告已读错误:", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
