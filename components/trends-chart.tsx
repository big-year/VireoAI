"use client";

import { useState, useEffect } from "react";
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
import { TrendingUp, TrendingDown, Minus, MapPin, Search, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TrendData {
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
  geoData: {
    region: string;
    value: number;
  }[];
}

interface TrendsChartProps {
  keywords?: string[];
  title?: string;
  description?: string;
  className?: string;
}

export function TrendsChart({ keywords, title, description, className }: TrendsChartProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TrendData[] | null>(null);
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);

  const fetchTrends = async (forceRefresh = false) => {
    if (!keywords?.length && !title && !description) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords, title, description, forceRefresh }),
      });

      if (!res.ok) {
        throw new Error("获取趋势数据失败");
      }

      const result = await res.json();
      if (result.success && result.data) {
        setData(result.data);
        if (result.data.length > 0) {
          setSelectedKeyword(result.data[0].keyword);
        }
      } else {
        setError(result.error || "暂无趋势数据");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, [keywords, title, description]);

  const selectedData = data?.find((d) => d.keyword === selectedKeyword);

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getTrendColor = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return "text-green-500";
      case "down":
        return "text-red-500";
      default:
        return "text-yellow-500";
    }
  };

  const getTrendText = (trend: "up" | "down" | "stable", percent: number) => {
    switch (trend) {
      case "up":
        return `上升趋势 (+${percent}%)`;
      case "down":
        return `下降趋势 (${percent}%)`;
      default:
        return "趋势平稳";
    }
  };

  if (loading) {
    return (
      <div className={cn("glass rounded-xl border border-glass-border p-6", className)}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
          <span className="text-muted-foreground">正在获取市场趋势数据...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("glass rounded-xl border border-glass-border p-6", className)}>
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <AlertCircle className="h-5 w-5 mr-2 mb-2" />
          <span>{error}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTrends(true)}
            className="mt-4 gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            重新获取
          </Button>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <div className={cn("glass rounded-xl border border-glass-border p-6", className)}>
      {/* 标题 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">市场热度分析</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
            数据来源：Google Trends
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchTrends(true)}
            disabled={loading}
            className="gap-2 h-8"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            刷新
          </Button>
        </div>
      </div>

      {/* 关键词选择 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {data.map((item) => (
          <Badge
            key={item.keyword}
            variant={selectedKeyword === item.keyword ? "default" : "outline"}
            className={cn(
              "cursor-pointer transition-all",
              selectedKeyword === item.keyword && "bg-primary"
            )}
            onClick={() => setSelectedKeyword(item.keyword)}
          >
            {item.keyword}
            <span className={cn("ml-1", getTrendColor(item.trend))}>
              {item.trend === "up" ? "↑" : item.trend === "down" ? "↓" : "→"}
            </span>
          </Badge>
        ))}
      </div>

      {selectedData && (
        <>
          {/* 趋势概览 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-secondary/30 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-foreground">
                {selectedData.averageValue}
              </div>
              <div className="text-xs text-muted-foreground">平均热度指数</div>
            </div>
            <div className="bg-secondary/30 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                {getTrendIcon(selectedData.trend)}
                <span className={cn("text-2xl font-bold", getTrendColor(selectedData.trend))}>
                  {selectedData.trendPercent > 0 ? "+" : ""}
                  {selectedData.trendPercent}%
                </span>
              </div>
              <div className="text-xs text-muted-foreground">同比变化</div>
            </div>
            <div className="bg-secondary/30 rounded-lg p-4 text-center">
              <div className={cn("text-lg font-semibold", getTrendColor(selectedData.trend))}>
                {getTrendText(selectedData.trend, Math.abs(selectedData.trendPercent))}
              </div>
              <div className="text-xs text-muted-foreground">趋势判断</div>
            </div>
          </div>

          {/* 趋势图表 */}
          {selectedData.timelineData.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                搜索趋势（过去12个月）
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selectedData.timelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="formattedDate"
                      stroke="#666"
                      fontSize={12}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis stroke="#666" fontSize={12} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1a1a2e",
                        border: "1px solid #333",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "#fff" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6, fill: "#8b5cf6" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 地区分布和相关搜索 */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* 热门地区 */}
            {selectedData.geoData.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  热门地区
                </h4>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={selectedData.geoData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis type="number" stroke="#666" fontSize={12} />
                      <YAxis
                        type="category"
                        dataKey="region"
                        stroke="#666"
                        fontSize={12}
                        width={60}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1a1a2e",
                          border: "1px solid #333",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* 相关搜索 */}
            {selectedData.relatedQueries.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  相关搜索
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedData.relatedQueries.map((query, index) => (
                    <Badge key={index} variant="outline" className="bg-secondary/30">
                      {query}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
