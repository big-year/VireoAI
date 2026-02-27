/**
 * GitHub 趋势数据
 * 使用 GitHub REST API 获取仓库和话题趋势
 * 文档: https://docs.github.com/en/rest
 */

import { ProxyAgent, fetch as undiciFetch } from "undici";

export interface GitHubRepoData {
  name: string;
  fullName: string;
  description: string;
  stars: number;
  forks: number;
  watchers: number;
  language: string;
  topics: string[];
  createdAt: string;
  updatedAt: string;
  url: string;
}

export interface GitHubTrendData {
  keyword: string;
  totalRepos: number;
  totalStars: number;
  topRepos: GitHubRepoData[];
  languageDistribution: { language: string; count: number }[];
  recentActivity: "high" | "medium" | "low";
}

export interface GitHubResult {
  success: boolean;
  data?: GitHubTrendData[];
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
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "SparkAI/1.0",
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
 * 获取 GitHub 相关仓库趋势
 * @param keywords 关键词列表
 */
export async function getGitHubTrends(keywords: string[]): Promise<GitHubResult> {
  try {
    const results: GitHubTrendData[] = [];

    for (const keyword of keywords.slice(0, 5)) {
      try {
        // 搜索相关仓库
        const searchUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(
          keyword
        )}&sort=stars&order=desc&per_page=10`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超时

        const response = await fetchWithProxy(searchUrl, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.error(`GitHub API 错误: ${response.status}`);
          continue;
        }

        const data = await response.json();

        if (!data.items || data.items.length === 0) {
          continue;
        }

        // 处理仓库数据
        const topRepos: GitHubRepoData[] = data.items.slice(0, 5).map((repo: any) => ({
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description || "",
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          watchers: repo.watchers_count,
          language: repo.language || "Unknown",
          topics: repo.topics || [],
          createdAt: repo.created_at,
          updatedAt: repo.updated_at,
          url: repo.html_url,
        }));

        // 计算总星数
        const totalStars = data.items.reduce(
          (sum: number, repo: any) => sum + repo.stargazers_count,
          0
        );

        // 统计语言分布
        const languageMap = new Map<string, number>();
        data.items.forEach((repo: any) => {
          const lang = repo.language || "Other";
          languageMap.set(lang, (languageMap.get(lang) || 0) + 1);
        });

        const languageDistribution = Array.from(languageMap.entries())
          .map(([language, count]) => ({ language, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // 判断最近活跃度（基于最近更新时间）
        const recentUpdates = data.items.filter((repo: any) => {
          const updatedAt = new Date(repo.updated_at);
          const daysSinceUpdate =
            (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
          return daysSinceUpdate < 30;
        }).length;

        let recentActivity: "high" | "medium" | "low" = "low";
        if (recentUpdates >= 7) recentActivity = "high";
        else if (recentUpdates >= 3) recentActivity = "medium";

        results.push({
          keyword,
          totalRepos: data.total_count,
          totalStars,
          topRepos,
          languageDistribution,
          recentActivity,
        });
      } catch (err) {
        console.error(`获取 GitHub 数据失败 (${keyword}):`, err);
      }
    }

    return {
      success: true,
      data: results,
    };
  } catch (error) {
    console.error("GitHub API 错误:", error);
    return {
      success: false,
      error: "获取 GitHub 数据失败",
    };
  }
}

/**
 * 获取 GitHub 话题趋势
 */
export async function getGitHubTopicTrend(topic: string): Promise<{
  name: string;
  description: string;
  featuredRepos: number;
} | null> {
  try {
    const url = `https://api.github.com/search/topics?q=${encodeURIComponent(topic)}`;

    const response = await fetchWithProxy(url, {
      headers: {
        Accept: "application/vnd.github.mercy-preview+json",
      },
    });

    if (!response.ok) return null;

    const data = await response.json();

    if (!data.items || data.items.length === 0) return null;

    const topicData = data.items[0];
    return {
      name: topicData.name,
      description: topicData.description || "",
      featuredRepos: topicData.featured || 0,
    };
  } catch (error) {
    console.error("GitHub Topic API 错误:", error);
    return null;
  }
}
