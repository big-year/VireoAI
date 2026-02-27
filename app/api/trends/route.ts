import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSearchTrends, extractKeywords } from "@/lib/google-trends";
import prisma from "@/lib/prisma";

// 获取趋势数据
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const body = await request.json();
    const { keywords, title, description, forceRefresh } = body;

    // 如果没有提供关键词，从标题和描述中提取
    let searchKeywords: string[] = keywords || [];
    if (searchKeywords.length === 0 && (title || description)) {
      searchKeywords = extractKeywords(title || "", description || "");
    }

    if (searchKeywords.length === 0) {
      return NextResponse.json(
        { error: "请提供关键词或创意描述" },
        { status: 400 }
      );
    }

    // 检查缓存（24小时内的数据直接返回，除非强制刷新）
    const cacheKey = searchKeywords.sort().join(",");

    if (!forceRefresh) {
      const cached = await prisma.trendCache.findFirst({
        where: {
          keyword: cacheKey,
          source: "google_trends",
          updatedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      });

      if (cached) {
        return NextResponse.json({
          ...JSON.parse(cached.data),
          cached: true,
        });
      }
    }

    // 调用 Google Trends API
    const result = await getSearchTrends(searchKeywords);

    if (result.success && result.data) {
      // 存入缓存
      await prisma.trendCache.upsert({
        where: {
          keyword_source: {
            keyword: cacheKey,
            source: "google_trends",
          },
        },
        update: {
          data: JSON.stringify(result),
          updatedAt: new Date(),
        },
        create: {
          keyword: cacheKey,
          source: "google_trends",
          data: JSON.stringify(result),
        },
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("趋势API错误:", error);
    return NextResponse.json(
      { error: "获取趋势数据失败" },
      { status: 500 }
    );
  }
}
