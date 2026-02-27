import googleTrends from "google-trends-api";

// 代理配置（从环境变量读取）
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

export interface TrendData {
  keyword: string;
  timelineData: {
    date: string;
    value: number;
    formattedDate: string;
  }[];
  averageValue: number;
  trend: "up" | "down" | "stable";
  trendPercent: number;
  relatedQueries: string[];
  relatedTopics: string[];
  geoData: {
    region: string;
    value: number;
  }[];
}

export interface TrendsResult {
  success: boolean;
  data?: TrendData[];
  error?: string;
  source: "google_trends";
  fetchedAt: string;
}

// 获取搜索趋势数据
export async function getSearchTrends(
  keywords: string[],
  geo: string = "CN" // 默认中国
): Promise<TrendsResult> {
  try {
    const results: TrendData[] = [];

    // 构建请求选项（包含代理）
    const requestOptions: any = {};
    if (proxyUrl) {
      const { HttpsProxyAgent } = await import("https-proxy-agent");
      requestOptions.agent = new HttpsProxyAgent(proxyUrl);
    }

    for (const keyword of keywords.slice(0, 5)) {
      // 最多5个关键词
      try {
        // 获取时间线数据（过去12个月）
        const interestOverTime = await googleTrends.interestOverTime({
          keyword,
          startTime: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          endTime: new Date(),
          geo,
          ...requestOptions,
        });

        const timelineResult = JSON.parse(interestOverTime);
        const timelineData =
          timelineResult.default?.timelineData?.map((item: any) => ({
            date: item.time,
            value: item.value[0],
            formattedDate: item.formattedTime,
          })) || [];

        // 计算趋势
        const values = timelineData.map((d: any) => d.value);
        const averageValue =
          values.length > 0
            ? Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length)
            : 0;

        // 计算趋势方向（对比前半年和后半年）
        const midPoint = Math.floor(values.length / 2);
        const firstHalf = values.slice(0, midPoint);
        const secondHalf = values.slice(midPoint);
        const firstAvg =
          firstHalf.length > 0
            ? firstHalf.reduce((a: number, b: number) => a + b, 0) / firstHalf.length
            : 0;
        const secondAvg =
          secondHalf.length > 0
            ? secondHalf.reduce((a: number, b: number) => a + b, 0) / secondHalf.length
            : 0;

        let trend: "up" | "down" | "stable" = "stable";
        let trendPercent = 0;
        if (firstAvg > 0) {
          trendPercent = Math.round(((secondAvg - firstAvg) / firstAvg) * 100);
          if (trendPercent > 10) trend = "up";
          else if (trendPercent < -10) trend = "down";
        }

        // 获取相关查询
        let relatedQueries: string[] = [];
        try {
          const relatedQueriesResult = await googleTrends.relatedQueries({
            keyword,
            geo,
            ...requestOptions,
          });
          const relatedData = JSON.parse(relatedQueriesResult);
          relatedQueries =
            relatedData.default?.rankedList?.[0]?.rankedKeyword
              ?.slice(0, 5)
              ?.map((item: any) => item.query) || [];
        } catch {
          // 忽略相关查询错误
        }

        // 获取地区分布
        let geoData: { region: string; value: number }[] = [];
        try {
          const interestByRegion = await googleTrends.interestByRegion({
            keyword,
            geo,
            resolution: "REGION",
            ...requestOptions,
          });
          const geoResult = JSON.parse(interestByRegion);
          geoData =
            geoResult.default?.geoMapData
              ?.slice(0, 5)
              ?.map((item: any) => ({
                region: item.geoName,
                value: item.value[0],
              })) || [];
        } catch {
          // 忽略地区数据错误
        }

        results.push({
          keyword,
          timelineData,
          averageValue,
          trend,
          trendPercent,
          relatedQueries,
          relatedTopics: [],
          geoData,
        });

        // 避免请求过快
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (err) {
        console.error(`获取关键词 "${keyword}" 趋势失败:`, err);
        // 单个关键词失败不影响其他
      }
    }

    return {
      success: results.length > 0,
      data: results,
      source: "google_trends",
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Google Trends API 错误:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "获取趋势数据失败",
      source: "google_trends",
      fetchedAt: new Date().toISOString(),
    };
  }
}

// 从创意描述中提取关键词（简单实现，后续可用AI优化）
export function extractKeywords(title: string, description: string): string[] {
  const text = `${title} ${description}`;

  // 移除常见停用词
  const stopWords = [
    "的",
    "是",
    "在",
    "和",
    "与",
    "或",
    "一个",
    "这个",
    "那个",
    "我们",
    "他们",
    "可以",
    "通过",
    "进行",
    "使用",
    "提供",
    "实现",
    "帮助",
    "用户",
    "平台",
    "系统",
    "服务",
    "产品",
    "功能",
    "基于",
    "利用",
    "打造",
    "构建",
  ];

  // 提取2-6个字的词组
  const words: string[] = [];

  // 简单分词：按标点和空格分割
  const segments = text.split(/[，。！？、；：""''（）\s]+/);

  for (const segment of segments) {
    if (segment.length >= 2 && segment.length <= 8) {
      const isStopWord = stopWords.some((sw) => segment.includes(sw));
      if (!isStopWord && !words.includes(segment)) {
        words.push(segment);
      }
    }
  }

  // 返回前5个关键词
  return words.slice(0, 5);
}
