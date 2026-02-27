"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Users,
  Lightbulb,
  Bot,
  TrendingUp,
  Activity,
  Clock,
  Star,
} from "lucide-react";

type Stats = {
  totalUsers: number;
  todayUsers: number;
  totalIdeas: number;
  todayIdeas: number;
  activeUsers: number;
  aiCalls: number;
  todayAiCalls: number;
};

type TrendData = {
  date: string;
  count: number;
};

type RecentUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: string;
};

type RecentIdea = {
  id: string;
  title: string;
  score: number | null;
  createdAt: string;
  user: {
    name: string | null;
    email: string;
  };
};

type ProviderStat = {
  name: string;
  provider: string;
  isDefault: boolean;
};

type TagStat = {
  tag: string;
  count: number;
};

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [userTrends, setUserTrends] = useState<TrendData[]>([]);
  const [ideaTrends, setIdeaTrends] = useState<TrendData[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [recentIdeas, setRecentIdeas] = useState<RecentIdea[]>([]);
  const [providerStats, setProviderStats] = useState<ProviderStat[]>([]);
  const [topTags, setTopTags] = useState<TagStat[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();

      if (res.ok) {
        setStats(data.stats);
        setUserTrends(data.trends.users);
        setIdeaTrends(data.trends.ideas);
        setRecentUsers(data.recentUsers);
        setRecentIdeas(data.recentIdeas);
        setProviderStats(data.providerStats);
        setTopTags(data.topTags);
      }
    } catch (error) {
      console.error("获取统计数据失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="glass border-glass-border">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass border-glass-border">
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[200px] w-full" />
            </CardContent>
          </Card>
          <Card className="glass border-glass-border">
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[200px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "总用户数",
      value: stats?.totalUsers || 0,
      change: stats?.todayUsers || 0,
      changeLabel: "今日新增",
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "总创意数",
      value: stats?.totalIdeas || 0,
      change: stats?.todayIdeas || 0,
      changeLabel: "今日生成",
      icon: Lightbulb,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      title: "AI 调用次数",
      value: stats?.aiCalls || 0,
      change: stats?.todayAiCalls || 0,
      changeLabel: "今日调用",
      icon: Bot,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "活跃用户",
      value: stats?.activeUsers || 0,
      change: null,
      changeLabel: "7天内活跃",
      icon: Activity,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
  ];

  const chartConfig = {
    count: {
      label: "数量",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.title} className="glass border-glass-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                {card.change !== null && (
                  <>
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-green-500">+{card.change}</span>
                  </>
                )}
                <span>{card.changeLabel}</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 用户增长趋势 */}
        <Card className="glass border-glass-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              用户增长趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px]">
              <LineChart data={userTrends}>
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  allowDecimals={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 0 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* 创意生成趋势 */}
        <Card className="glass border-glass-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              创意生成趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px]">
              <LineChart data={ideaTrends}>
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  allowDecimals={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--chart-2))", strokeWidth: 0 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* 下方区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 最近注册用户 */}
        <Card className="glass border-glass-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              最近注册用户
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.image || ""} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                    {user.name?.[0] || user.email[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.name || "未设置昵称"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDateTime(user.createdAt)}
                </div>
              </div>
            ))}
            {recentUsers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                暂无用户
              </p>
            )}
          </CardContent>
        </Card>

        {/* 最近生成的创意 */}
        <Card className="glass border-glass-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              最近生成的创意
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentIdeas.map((idea) => (
              <div key={idea.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate flex-1">
                    {idea.title}
                  </p>
                  {idea.score && (
                    <Badge variant="secondary" className="ml-2 shrink-0">
                      <Star className="h-3 w-3 mr-1" />
                      {idea.score}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{idea.user.name || idea.user.email}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDateTime(idea.createdAt)}
                  </span>
                </div>
              </div>
            ))}
            {recentIdeas.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                暂无创意
              </p>
            )}
          </CardContent>
        </Card>

        {/* AI 提供商和热门标签 */}
        <div className="space-y-6">
          {/* AI 提供商分布 */}
          <Card className="glass border-glass-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="h-4 w-4 text-purple-500" />
                AI 提供商
              </CardTitle>
            </CardHeader>
            <CardContent>
              {providerStats.length > 0 ? (
                <div className="flex items-center gap-4">
                  <ChartContainer config={chartConfig} className="h-[100px] w-[100px]">
                    <PieChart>
                      <Pie
                        data={providerStats.map((p, i) => ({
                          name: p.name,
                          value: 1,
                          fill: COLORS[i % COLORS.length],
                        }))}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={25}
                        outerRadius={40}
                      >
                        {providerStats.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="flex-1 space-y-1">
                    {providerStats.map((provider, i) => (
                      <div
                        key={provider.provider}
                        className="flex items-center gap-2 text-sm"
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        <span className="flex-1">{provider.name}</span>
                        {provider.isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            默认
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  暂无启用的提供商
                </p>
              )}
            </CardContent>
          </Card>

          {/* 热门标签 */}
          <Card className="glass border-glass-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">热门标签</CardTitle>
            </CardHeader>
            <CardContent>
              {topTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {topTags.slice(0, 8).map((tag) => (
                    <Badge
                      key={tag.tag}
                      variant="secondary"
                      className="text-xs"
                    >
                      {tag.tag}
                      <span className="ml-1 text-muted-foreground">
                        ({tag.count})
                      </span>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  暂无标签数据
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
