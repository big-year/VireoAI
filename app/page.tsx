"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Send,
  Zap,
  Lightbulb,
  FlaskConical,
  Users,
  Compass,
  TrendingUp,
  Heart,
} from "lucide-react";

const suggestedKeywords = [
  "AI + 教育",
  "绿色科技",
  "远程医疗",
  "Web3 社交",
  "可持续时尚",
  "智能家居",
  "银发经济",
  "宠物科技",
];

const features = [
  {
    icon: Lightbulb,
    title: "智能生成",
    description: "AI 分析市场趋势，生成独特创业点子",
  },
  {
    icon: FlaskConical,
    title: "深入分析",
    description: "商业画布、市场分析、竞争格局一键生成",
  },
  {
    icon: Users,
    title: "转入实验室",
    description: "看中的点子可直接转入项目实验室孵化",
  },
];

interface PlatformStats {
  totalIdeas: number;
  totalUsers: number;
  totalProjects: number;
  totalMatches: number;
}

export default function HomePage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [stats, setStats] = useState<PlatformStats>({
    totalIdeas: 0,
    totalUsers: 0,
    totalProjects: 0,
    totalMatches: 0,
  });

  useEffect(() => {
    // 获取平台统计数据
    fetch("/api/nebula/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.stats) {
          setStats(data.stats);
        }
      })
      .catch(console.error);
  }, []);

  const handleGenerate = () => {
    if (!input.trim()) return;
    router.push(`/generate?q=${encodeURIComponent(input.trim())}`);
  };

  const handleKeywordClick = (keyword: string) => {
    setInput(keyword);
    inputRef.current?.focus();
  };

  const formatNumber = (num: number) => {
    if (num >= 10000) return (num / 10000).toFixed(1) + "万";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-glow-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/15 rounded-full blur-3xl animate-glow-pulse delay-1000" />
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <Navigation />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12 sm:py-20">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-glass-border mb-6">
            <Sparkles className="h-4 w-4 text-primary animate-glow-pulse" />
            <span className="text-sm text-muted-foreground">
              AI 驱动的创业灵感引擎
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-balance">
            <span className="text-foreground">将灵感转化为</span>
            <br />
            <span className="text-primary text-glow">创业蓝图</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty mb-8">
            输入你的关键词或行业兴趣，AI 将为你生成创业点子、商业模式画布和市场分析，
            助你快速验证创业想法
          </p>
        </div>

        {/* Input Section */}
        <div className="max-w-3xl mx-auto mb-16">
          <div className="relative">
            <div className="glass rounded-2xl p-2 border border-glass-border glow-border">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    type="text"
                    placeholder="输入关键词，例如：AI + 健康科技..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                    className="bg-transparent border-none text-lg placeholder:text-muted-foreground/50 focus-visible:ring-0 h-14 px-4"
                  />
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={!input.trim()}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground h-12 px-6 gap-2"
                >
                  <Send className="h-4 w-4" />
                  生成灵感
                </Button>
              </div>
            </div>
          </div>

          {/* Suggested Keywords */}
          <div className="flex flex-wrap items-center gap-2 mt-4 justify-center">
            <span className="text-sm text-muted-foreground">热门关键词：</span>
            {suggestedKeywords.map((keyword) => (
              <Badge
                key={keyword}
                variant="outline"
                className="cursor-pointer hover:bg-primary/20 hover:border-primary/50 transition-colors"
                onClick={() => handleKeywordClick(keyword)}
              >
                {keyword}
              </Badge>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="glass rounded-xl p-6 border border-glass-border hover:border-primary/30 transition-colors group"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/30 transition-colors">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">或者探索其他功能</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => router.push("/nebula")}
            >
              <Compass className="h-4 w-4" />
              创意星云
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => router.push("/lab")}
            >
              <FlaskConical className="h-4 w-4" />
              项目实验室
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => router.push("/matching")}
            >
              <Users className="h-4 w-4" />
              合伙人匹配
            </Button>
          </div>
        </div>

        {/* Platform Stats */}
        {(stats.totalIdeas > 0 || stats.totalUsers > 0) && (
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            <div className="glass rounded-xl p-4 border border-glass-border text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Lightbulb className="h-5 w-5 text-primary" />
              </div>
              <div className="text-2xl font-bold text-foreground">{formatNumber(stats.totalIdeas)}</div>
              <div className="text-sm text-muted-foreground">创意生成</div>
            </div>
            <div className="glass rounded-xl p-4 border border-glass-border text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Users className="h-5 w-5 text-accent" />
              </div>
              <div className="text-2xl font-bold text-foreground">{formatNumber(stats.totalUsers)}</div>
              <div className="text-sm text-muted-foreground">创业者</div>
            </div>
            <div className="glass rounded-xl p-4 border border-glass-border text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <FlaskConical className="h-5 w-5 text-green-400" />
              </div>
              <div className="text-2xl font-bold text-foreground">{formatNumber(stats.totalProjects || 0)}</div>
              <div className="text-sm text-muted-foreground">孵化项目</div>
            </div>
            <div className="glass rounded-xl p-4 border border-glass-border text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Heart className="h-5 w-5 text-pink-400" />
              </div>
              <div className="text-2xl font-bold text-foreground">{formatNumber(stats.totalMatches)}</div>
              <div className="text-sm text-muted-foreground">成功匹配</div>
            </div>
          </div>
        )}

        {/* Empty State Animation */}
        <div className="flex justify-center mt-16">
          <div className="relative">
            <div className="w-32 h-32 rounded-full glass border border-glass-border flex items-center justify-center">
              <Zap className="h-12 w-12 text-primary animate-float" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center animate-bounce">
              <Sparkles className="h-4 w-4 text-accent" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
