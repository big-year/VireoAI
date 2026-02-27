import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getWikipediaViews } from "@/lib/wikipedia-trends";
import { getGitHubTrends } from "@/lib/github-trends";
import { extractKeywords } from "@/lib/google-trends";
import prisma from "@/lib/prisma";

// 获取多源趋势数据
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const body = await request.json();
    const { keywords, title, description, sources, forceRefresh } = body;

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

    // 默认获取所有数据源
    const requestedSources: string[] = sources || ["wikipedia", "github"];
    const cacheKey = searchKeywords.sort().join(",");

    const result: any = {
      keywords: searchKeywords,
      sources: {},
    };

    // Wikipedia 数据
    if (requestedSources.includes("wikipedia")) {
      // 检查缓存（除非强制刷新）
      if (!forceRefresh) {
        const cached = await prisma.trendCache.findFirst({
          where: {
            keyword: cacheKey,
            source: "wikipedia",
            updatedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24小时缓存
            },
          },
        });

        if (cached) {
          result.sources.wikipedia = {
            ...JSON.parse(cached.data),
            cached: true,
          };
        }
      }

      // 如果没有缓存或强制刷新，重新获取
      if (!result.sources.wikipedia) {
        const wikiResult = await getWikipediaViews(searchKeywords);
        if (wikiResult.success && wikiResult.data) {
          result.sources.wikipedia = wikiResult;

          // 存入缓存
          await prisma.trendCache.upsert({
            where: {
              keyword_source: {
                keyword: cacheKey,
                source: "wikipedia",
              },
            },
            update: {
              data: JSON.stringify(wikiResult),
              updatedAt: new Date(),
            },
            create: {
              keyword: cacheKey,
              source: "wikipedia",
              data: JSON.stringify(wikiResult),
            },
          });
        } else {
          result.sources.wikipedia = { success: false, data: [] };
        }
      }
    }

    // GitHub 数据
    if (requestedSources.includes("github")) {
      // 检查缓存（除非强制刷新）
      if (!forceRefresh) {
        const cached = await prisma.trendCache.findFirst({
          where: {
            keyword: cacheKey,
            source: "github",
            updatedAt: {
              gte: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6小时缓存
            },
          },
        });

        if (cached) {
          result.sources.github = {
            ...JSON.parse(cached.data),
            cached: true,
          };
        }
      }

      // 如果没有缓存或强制刷新，重新获取
      if (!result.sources.github) {
        const githubResult = await getGitHubTrends(searchKeywords);
        if (githubResult.success && githubResult.data) {
          result.sources.github = githubResult;

          // 存入缓存
          await prisma.trendCache.upsert({
            where: {
              keyword_source: {
                keyword: cacheKey,
                source: "github",
              },
            },
            update: {
              data: JSON.stringify(githubResult),
              updatedAt: new Date(),
            },
            create: {
              keyword: cacheKey,
              source: "github",
              data: JSON.stringify(githubResult),
            },
          });
        } else {
          result.sources.github = { success: false, data: [] };
        }
      }
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("多源趋势API错误:", error);
    return NextResponse.json(
      { error: "获取趋势数据失败" },
      { status: 500 }
    );
  }
}
