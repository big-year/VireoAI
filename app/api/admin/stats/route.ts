import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// 检查管理员权限
async function checkAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "未登录", status: 401 };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== "admin") {
    return { error: "无权限", status: 403 };
  }

  return { user: session.user };
}

export async function GET() {
  try {
    const adminCheck = await checkAdmin();
    if ("error" in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    // 获取今天的开始时间
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 获取过去7天的日期
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 并行获取统计数据
    const [
      totalUsers,
      todayUsers,
      totalIdeas,
      todayIdeas,
      activeUsers,
      recentUsers,
      recentIdeas,
      providerStats,
      topTags,
      usersLast7Days,
      ideasLast7Days,
    ] = await Promise.all([
      // 总用户数（只统计已验证邮箱的用户）
      prisma.user.count({
        where: { emailVerified: { not: null } },
      }),
      // 今日新增用户（只统计已验证邮箱的用户）
      prisma.user.count({
        where: {
          emailVerified: { not: null },
          createdAt: { gte: today },
        },
      }),
      // 总创意数
      prisma.idea.count(),
      // 今日创意数
      prisma.idea.count({
        where: { createdAt: { gte: today } },
      }),
      // 活跃用户（7天内有创意的用户，只统计已验证邮箱的）
      prisma.user.count({
        where: {
          emailVerified: { not: null },
          ideas: {
            some: {
              createdAt: { gte: sevenDaysAgo },
            },
          },
        },
      }),
      // 最近注册用户（只显示已验证邮箱的用户）
      prisma.user.findMany({
        where: { emailVerified: { not: null } },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
        },
      }),
      // 最近创意
      prisma.idea.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          score: true,
          createdAt: true,
          user: {
            select: { name: true, email: true },
          },
        },
      }),
      // AI 提供商使用统计
      prisma.aIProvider.findMany({
        where: { isEnabled: true },
        select: {
          name: true,
          provider: true,
          isDefault: true,
        },
      }),
      // 热门标签
      prisma.idea.findMany({
        select: { tags: true },
      }),
      // 过去7天的用户（只统计已验证邮箱的）
      prisma.user.findMany({
        where: {
          emailVerified: { not: null },
          createdAt: { gte: sevenDaysAgo },
        },
        select: { createdAt: true },
      }),
      // 过去7天的创意
      prisma.idea.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true },
      }),
    ]);

    // 处理标签统计
    const tagCounts: Record<string, number> = {};
    topTags.forEach((idea) => {
      try {
        const tags = JSON.parse(idea.tags);
        tags.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      } catch {
        // 忽略解析错误
      }
    });
    const sortedTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    // 格式化趋势数据
    const formatTrends = (items: { createdAt: Date }[]) => {
      const result: { date: string; count: number }[] = [];
      const dateMap = new Map<string, number>();

      items.forEach((item) => {
        const dateStr = item.createdAt.toISOString().split("T")[0];
        dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1);
      });

      // 填充过去7天的数据
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        result.push({
          date: dateStr,
          count: dateMap.get(dateStr) || 0,
        });
      }

      return result;
    };

    return NextResponse.json({
      stats: {
        totalUsers,
        todayUsers,
        totalIdeas,
        todayIdeas,
        activeUsers,
        aiCalls: 0, // 暂时没有统计
        todayAiCalls: 0,
      },
      trends: {
        users: formatTrends(usersLast7Days),
        ideas: formatTrends(ideasLast7Days),
      },
      recentUsers,
      recentIdeas,
      providerStats,
      topTags: sortedTags,
    });
  } catch (error) {
    console.error("获取统计数据错误:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
