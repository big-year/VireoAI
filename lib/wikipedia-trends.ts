/**
 * Wikipedia 页面浏览量趋势
 * 使用 Wikimedia REST API 获取页面浏览统计
 * 文档: https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/
 */

import { ProxyAgent, fetch as undiciFetch } from "undici";

export interface WikipediaViewsData {
  keyword: string;
  article: string;
  views: { date: string; views: number }[];
  totalViews: number;
  avgDailyViews: number;
  trend: "up" | "down" | "stable";
  trendPercent: number;
}

export interface WikipediaResult {
  success: boolean;
  data?: WikipediaViewsData[];
  error?: string;
}

/**
 * 获取代理 URL（在函数内部读取，确保环境变量已加载）
 */
function getProxyUrl(): string | undefined {
  return process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
}

/**
 * 使用代理发送请求
 */
async function fetchWithProxy(url: string, options: RequestInit = {}): Promise<Response> {
  const proxyUrl = getProxyUrl();
  const headers = {
    "User-Agent": "SparkAI/1.0 (https://sparkai.app; contact@sparkai.app)",
    ...options.headers as Record<string, string>,
  };

  if (proxyUrl) {
    const dispatcher = new ProxyAgent(proxyUrl);
    return undiciFetch(url, {
      ...options,
      headers,
      dispatcher,
    } as any) as unknown as Response;
  }

  return fetch(url, { ...options, headers });
}

/**
 * 获取 Wikipedia 页面浏览量
 * @param keywords 关键词列表
 * @param days 获取多少天的数据，默认 90 天
 */
export async function getWikipediaViews(
  keywords: string[],
  days: number = 90
): Promise<WikipediaResult> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const formatDate = (date: Date) => {
      return date.toISOString().slice(0, 10).replace(/-/g, "");
    };

    const start = formatDate(startDate);
    const end = formatDate(endDate);

    const results: WikipediaViewsData[] = [];

    for (const keyword of keywords.slice(0, 5)) {
      // 最多查询 5 个关键词
      try {
        // 将关键词转换为 Wikipedia 文章名格式（空格转下划线，首字母大写）
        const article = keyword
          .trim()
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join("_");

        // 尝试中文维基百科
        let data = await fetchWikipediaData("zh.wikipedia", article, start, end);

        // 如果中文没有数据，尝试英文维基百科
        if (!data || data.length === 0) {
          data = await fetchWikipediaData("en.wikipedia", article, start, end);
        }

        if (data && data.length > 0) {
          const totalViews = data.reduce((sum, d) => sum + d.views, 0);
          const avgDailyViews = Math.round(totalViews / data.length);

          // 计算趋势（比较前半段和后半段的平均值）
          const midPoint = Math.floor(data.length / 2);
          const firstHalf = data.slice(0, midPoint);
          const secondHalf = data.slice(midPoint);

          const firstAvg =
            firstHalf.reduce((sum, d) => sum + d.views, 0) / firstHalf.length;
          const secondAvg =
            secondHalf.reduce((sum, d) => sum + d.views, 0) / secondHalf.length;

          const trendPercent =
            firstAvg > 0 ? Math.round(((secondAvg - firstAvg) / firstAvg) * 100) : 0;

          let trend: "up" | "down" | "stable" = "stable";
          if (trendPercent > 10) trend = "up";
          else if (trendPercent < -10) trend = "down";

          results.push({
            keyword,
            article,
            views: data,
            totalViews,
            avgDailyViews,
            trend,
            trendPercent,
          });
        }
      } catch (err) {
        console.error(`获取 Wikipedia 数据失败 (${keyword}):`, err);
        // 继续处理其他关键词
      }
    }

    return {
      success: true,
      data: results,
    };
  } catch (error) {
    console.error("Wikipedia API 错误:", error);
    return {
      success: false,
      error: "获取 Wikipedia 数据失败",
    };
  }
}

/**
 * 从 Wikipedia API 获取页面浏览数据
 */
async function fetchWikipediaData(
  project: string,
  article: string,
  start: string,
  end: string
): Promise<{ date: string; views: number }[] | null> {
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${project}/all-access/user/${encodeURIComponent(
    article
  )}/daily/${start}/${end}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超时

    const response = await fetchWithProxy(url, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    return data.items.map((item: any) => ({
      date: `${item.timestamp.slice(0, 4)}-${item.timestamp.slice(4, 6)}-${item.timestamp.slice(6, 8)}`,
      views: item.views,
    }));
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log(`Wikipedia API 超时 (${article})`);
    } else {
      console.error(`Wikipedia API 错误 (${article}):`, error.message);
    }
    return null;
  }
}

/**
 * 搜索相关的 Wikipedia 文章
 */
export async function searchWikipediaArticles(
  query: string,
  lang: string = "zh"
): Promise<string[]> {
  try {
    const url = `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(
      query
    )}&limit=5&namespace=0&format=json`;

    const response = await fetchWithProxy(url);
    if (!response.ok) return [];

    const data = await response.json();
    return data[1] || [];
  } catch (error) {
    console.error("Wikipedia 搜索错误:", error);
    return [];
  }
}
