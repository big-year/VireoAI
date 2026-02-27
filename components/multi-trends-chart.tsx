"use client";

import { useState, useEffect, useMemo, useCallback, memo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  AlertCircle,
  BookOpen,
  Github,
  Star,
  GitFork,
  ExternalLink,
  Activity,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MultiTrendsChartProps {
  keywords?: string[];
  title?: string;
  description?: string;
  className?: string;
}

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00C49F"];

export function MultiTrendsChart({
  keywords,
  title,
  description,
  className,
}: MultiTrendsChartProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"wikipedia" | "github">("wikipedia");

  const fetchTrends = useCallback(async (forceRefresh = false) => {
    if (!keywords?.length && !title && !description) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/trends/multi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords,
          title,
          description,
          sources: ["wikipedia", "github"],
          forceRefresh,
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setData(result);
      } else {
        setError(result.error || "获取数据失败");
      }
    } catch (err) {
      console.error("获取趋势数据失败:", err);
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [keywords, title, description]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  const handleRefresh = useCallback(() => {
    fetchTrends(true);
  }, [fetchTrends]);

  const wikipediaData = useMemo(() => data?.sources?.wikipedia?.data || [], [data]);
  const githubData = useMemo(() => data?.sources?.github?.data || [], [data]);

  if (loading) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">正在获取趋势数据...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12", className)}>
        <AlertCircle className="h-8 w-8 text-amber-500 mb-4" />
        <p className="text-muted-foreground">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="mt-4 gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          重新获取
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12", className)}>
        <p className="text-muted-foreground">暂无趋势数据</p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="mt-4 gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          获取数据
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* 数据源切换 */}
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === "wikipedia" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("wikipedia")}
            className="gap-2"
          >
            <BookOpen className="h-4 w-4" />
            Wikipedia
            {wikipediaData.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {wikipediaData.length}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeTab === "github" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("github")}
            className="gap-2"
          >
            <Github className="h-4 w-4" />
            GitHub
            {githubData.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {githubData.length}
              </Badge>
            )}
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          刷新
        </Button>
      </div>

      {/* 使用 CSS 控制显示隐藏，避免切换时重新挂载 */}
      <div className={activeTab === "wikipedia" ? "block" : "hidden"}>
        <WikipediaSection data={wikipediaData} />
      </div>
      <div className={activeTab === "github" ? "block" : "hidden"}>
        <GitHubSection data={githubData} />
      </div>
    </div>
  );
}

// Wikipedia 数据展示 - 使用 memo 优化
const WikipediaSection = memo(function WikipediaSection({ data }: { data: any[] }) {
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);

  // 初始化选中的关键词
  useEffect(() => {
    if (data.length > 0 && !selectedKeyword) {
      setSelectedKeyword(data[0].keyword);
    }
  }, [data, selectedKeyword]);

  const selectedData = useMemo(
    () => data.find((d) => d.keyword === selectedKeyword),
    [data, selectedKeyword]
  );

  // 缓存图表数据
  const chartData = useMemo(() => {
    if (!selectedData?.views) return [];
    return selectedData.views.filter((_: any, i: number) => i % 3 === 0);
  }, [selectedData?.views]);

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>未找到相关 Wikipedia 页面数据</p>
        <p className="text-sm mt-2">可能原因：网络连接问题或关键词无对应页面</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 关键词选择 */}
      <div className="flex flex-wrap gap-2">
        {data.map((item) => (
          <button
            key={item.keyword}
            onClick={() => setSelectedKeyword(item.keyword)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm transition-colors",
              selectedKeyword === item.keyword
                ? "bg-primary text-primary-foreground"
                : "bg-secondary hover:bg-secondary/80"
            )}
          >
            {item.keyword}
            <TrendIndicator trend={item.trend} className="ml-2 inline" />
          </button>
        ))}
      </div>

      {selectedData && (
        <>
          {/* 统计卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="总浏览量"
              value={formatNumber(selectedData.totalViews)}
              icon={<BookOpen className="h-4 w-4" />}
            />
            <StatCard
              label="日均浏览"
              value={formatNumber(selectedData.avgDailyViews)}
              icon={<Activity className="h-4 w-4" />}
            />
            <StatCard
              label="趋势变化"
              value={`${selectedData.trendPercent > 0 ? "+" : ""}${selectedData.trendPercent}%`}
              icon={<TrendIndicator trend={selectedData.trend} />}
              valueColor={
                selectedData.trend === "up"
                  ? "text-green-500"
                  : selectedData.trend === "down"
                  ? "text-red-500"
                  : ""
              }
            />
            <StatCard
              label="Wikipedia 页面"
              value={selectedData.article.replace(/_/g, " ")}
              icon={<ExternalLink className="h-4 w-4" />}
              small
            />
          </div>

          {/* 浏览量趋势图 */}
          {chartData.length > 0 && (
            <div className="bg-secondary/30 rounded-lg p-4">
              <h4 className="text-sm font-medium mb-4">90 天浏览量趋势</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => value.slice(5)}
                    />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={formatNumber} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1a1a1a",
                        border: "1px solid #333",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [formatNumber(value), "浏览量"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="views"
                      stroke="#8884d8"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
});

// GitHub 数据展示 - 使用 memo 优化
const GitHubSection = memo(function GitHubSection({ data }: { data: any[] }) {
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);

  // 初始化选中的关键词
  useEffect(() => {
    if (data.length > 0 && !selectedKeyword) {
      setSelectedKeyword(data[0].keyword);
    }
  }, [data, selectedKeyword]);

  const selectedData = useMemo(
    () => data.find((d) => d.keyword === selectedKeyword),
    [data, selectedKeyword]
  );

  // 缓存语言分布数据
  const languageData = useMemo(() => {
    return selectedData?.languageDistribution || [];
  }, [selectedData?.languageDistribution]);

  // 缓存仓库列表
  const topRepos = useMemo(() => {
    return selectedData?.topRepos?.slice(0, 5) || [];
  }, [selectedData?.topRepos]);

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Github className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>未找到相关 GitHub 仓库</p>
        <p className="text-sm mt-2">可能原因：网络连接问题或关键词无相关项目</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 关键词选择 */}
      <div className="flex flex-wrap gap-2">
        {data.map((item) => (
          <button
            key={item.keyword}
            onClick={() => setSelectedKeyword(item.keyword)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm transition-colors",
              selectedKeyword === item.keyword
                ? "bg-primary text-primary-foreground"
                : "bg-secondary hover:bg-secondary/80"
            )}
          >
            {item.keyword}
            <ActivityIndicator level={item.recentActivity} className="ml-2" />
          </button>
        ))}
      </div>

      {selectedData && (
        <>
          {/* 统计卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="相关仓库"
              value={formatNumber(selectedData.totalRepos)}
              icon={<Github className="h-4 w-4" />}
            />
            <StatCard
              label="总 Star 数"
              value={formatNumber(selectedData.totalStars)}
              icon={<Star className="h-4 w-4" />}
            />
            <StatCard
              label="近期活跃度"
              value={
                selectedData.recentActivity === "high"
                  ? "高"
                  : selectedData.recentActivity === "medium"
                  ? "中"
                  : "低"
              }
              icon={<Activity className="h-4 w-4" />}
              valueColor={
                selectedData.recentActivity === "high"
                  ? "text-green-500"
                  : selectedData.recentActivity === "medium"
                  ? "text-yellow-500"
                  : "text-gray-500"
              }
            />
            <StatCard
              label="主要语言"
              value={languageData[0]?.language || "-"}
              icon={<span className="text-xs">{"</>"}</span>}
            />
          </div>

          {/* 语言分布 - 使用条形图替代饼图，渲染更快 */}
          {languageData.length > 0 && (
            <div className="bg-secondary/30 rounded-lg p-4">
              <h4 className="text-sm font-medium mb-4">编程语言分布</h4>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={languageData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis
                      type="category"
                      dataKey="language"
                      tick={{ fontSize: 10 }}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1a1a1a",
                        border: "1px solid #333",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill="#8884d8"
                      radius={[0, 4, 4, 0]}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 热门仓库 */}
          {topRepos.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">热门仓库</h4>
              {topRepos.map((repo: any) => (
                <RepoCard key={repo.fullName} repo={repo} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
});

// 仓库卡片 - 单独抽离并 memo
const RepoCard = memo(function RepoCard({ repo }: { repo: any }) {
  return (
    <a
      href={repo.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">
              {repo.fullName}
            </span>
            {repo.language && (
              <Badge variant="outline" className="text-xs">
                {repo.language}
              </Badge>
            )}
          </div>
          {repo.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {repo.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground ml-4 shrink-0">
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3" />
            {formatNumber(repo.stars)}
          </span>
          <span className="flex items-center gap-1">
            <GitFork className="h-3 w-3" />
            {formatNumber(repo.forks)}
          </span>
        </div>
      </div>
    </a>
  );
});

// 统计卡片组件 - memo 优化
const StatCard = memo(function StatCard({
  label,
  value,
  icon,
  valueColor,
  small,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  valueColor?: string;
  small?: boolean;
}) {
  return (
    <div className="bg-secondary/30 rounded-lg p-3">
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          "font-semibold",
          small ? "text-sm truncate" : "text-lg",
          valueColor
        )}
      >
        {value}
      </div>
    </div>
  );
});

// 趋势指示器 - memo 优化
const TrendIndicator = memo(function TrendIndicator({
  trend,
  className,
}: {
  trend: "up" | "down" | "stable";
  className?: string;
}) {
  if (trend === "up") {
    return <TrendingUp className={cn("h-4 w-4 text-green-500", className)} />;
  }
  if (trend === "down") {
    return <TrendingDown className={cn("h-4 w-4 text-red-500", className)} />;
  }
  return <Minus className={cn("h-4 w-4 text-gray-500", className)} />;
});

// 活跃度指示器 - memo 优化
const ActivityIndicator = memo(function ActivityIndicator({
  level,
  className,
}: {
  level: "high" | "medium" | "low";
  className?: string;
}) {
  const color =
    level === "high"
      ? "bg-green-500"
      : level === "medium"
      ? "bg-yellow-500"
      : "bg-gray-500";

  return (
    <span
      className={cn("inline-block w-2 h-2 rounded-full", color, className)}
    />
  );
});

// 数字格式化
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}
