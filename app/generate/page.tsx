"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Sparkles,
  Lightbulb,
  TrendingUp,
  Target,
  Zap,
  RefreshCw,
  Save,
  Share2,
  Check,
  Users,
  DollarSign,
  Rocket,
  Shield,
  Heart,
  Package,
  Megaphone,
  Handshake,
  ChevronRight,
  Plus,
  Loader2,
  ArrowLeft,
  Trash2,
  FlaskConical,
  Star,
  BarChart3,
  Shuffle,
  History,
  X,
} from "lucide-react";
import { TrendsChart } from "@/components/trends-chart";
import { ScoreGauge, MultiScore } from "@/components/score-gauge";
import { SwotChart } from "@/components/swot-chart";
import { AnalysisRadar, getDefaultRadarData } from "@/components/analysis-radar";
import { BusinessCanvas } from "@/components/business-canvas";

type BusinessCanvas = {
  valueProposition: string;
  customerSegments: string;
  channels: string;
  customerRelationships: string;
  revenueStreams: string;
  keyResources: string;
  keyActivities: string;
  keyPartners: string;
  costStructure: string;
};

type MarketAnalysis = {
  marketSize: string;
  growthRate: string;
  targetAudience: string;
  competitors: string[];
  opportunities: string[];
  threats: string[];
  entryBarriers: string;
  recommendations: string[];
};

type Idea = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  score: number;
  marketSize: string;
  targetUsers?: string;
  uniqueValue?: string;
  saved?: boolean;
  canvas?: BusinessCanvas;
  analysis?: MarketAnalysis;
  isAnalyzing?: boolean;
};

export default function GeneratePage() {
  return (
    <Suspense fallback={<GeneratePageLoading />}>
      <GeneratePageContent />
    </Suspense>
  );
}

function GeneratePageLoading() {
  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    </main>
  );
}

function GeneratePageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialLoadRef = React.useRef(false);

  // 登录验证
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const [keywords, setKeywords] = useState(searchParams.get("q") || "");
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [savedIdeas, setSavedIdeas] = useState<Idea[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationCount, setGenerationCount] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const selectedIdea = ideas.find((i) => i.id === selectedId);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  // 从 localStorage 恢复创意
  useEffect(() => {
    const cached = localStorage.getItem("vireoai_ideas");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setIdeas(parsed);
          setSelectedId(parsed[0].id);
        }
      } catch {}
    }
  }, []);

  // 保存创意到 localStorage
  useEffect(() => {
    if (ideas.length > 0) {
      localStorage.setItem("vireoai_ideas", JSON.stringify(ideas));
    }
  }, [ideas]);

  // 加载已保存的创意历史
  const loadSavedIdeas = async () => {
    if (!session?.user) {
      toast.error("请先登录查看历史记录");
      return;
    }
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/ideas");
      if (res.ok) {
        const data = await res.json();
        setSavedIdeas(data.ideas.map((idea: any) => ({
          ...idea,
          canvas: idea.canvas || null,
          analysis: idea.analysis || null,
          saved: true,
        })));
        setShowHistory(true);
      }
    } catch {
      toast.error("加载历史记录失败");
    } finally {
      setLoadingHistory(false);
    }
  };

  // 从历史记录中加载创意到当前列表
  const loadFromHistory = (idea: Idea) => {
    // 检查是否已存在
    if (ideas.some(i => i.id === idea.id)) {
      setSelectedId(idea.id);
      setShowHistory(false);
      return;
    }
    setIdeas(prev => [idea, ...prev]);
    setSelectedId(idea.id);
    setShowHistory(false);
  };

  const handleGenerate = async (newDirection?: boolean) => {
    if (!keywords.trim()) {
      toast.error("请输入关键词");
      return;
    }

    setIsGenerating(true);

    try {
      // 获取已有的点子标题，避免重复
      const existingTitles = ideas.map((i) => i.title);

      const res = await fetch("/api/ideas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: newDirection ? `${keywords}（换个方向）` : keywords,
          existingTitles,
          count: 5,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "生成失败");
      }

      // 添加新生成的点子
      const newIdeas: Idea[] = data.ideas.map((idea: Omit<Idea, "id">) => ({
        ...idea,
        id: generateId(),
        saved: false,
      }));

      setIdeas((prev) => [...prev, ...newIdeas]);
      setGenerationCount((prev) => prev + 1);

      // 如果是第一次生成，自动选中第一个
      if (ideas.length === 0 && newIdeas.length > 0) {
        setSelectedId(newIdeas[0].id);
      }

      toast.success(`成功生成 ${newIdeas.length} 个新点子`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "生成失败，请稍后重试");
    } finally {
      setIsGenerating(false);
    }
  };

  // 初始加载时自动生成
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !initialLoadRef.current) {
      initialLoadRef.current = true;
      handleGenerate();
    }
  }, []);

  const handleAnalyze = async (ideaId: string) => {
    const idea = ideas.find((i) => i.id === ideaId);
    if (!idea || idea.canvas) return;

    setIdeas((prev) =>
      prev.map((i) => (i.id === ideaId ? { ...i, isAnalyzing: true } : i))
    );

    try {
      const res = await fetch("/api/ideas/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
      });

      const data = await res.json();

      if (res.ok) {
        setIdeas((prev) =>
          prev.map((i) =>
            i.id === ideaId
              ? { ...i, canvas: data.canvas, analysis: data.analysis, isAnalyzing: false }
              : i
          )
        );
        toast.success("深入分析完成");
      } else {
        throw new Error(data.error);
      }
    } catch {
      toast.error("分析失败，请稍后重试");
      setIdeas((prev) =>
        prev.map((i) => (i.id === ideaId ? { ...i, isAnalyzing: false } : i))
      );
    }
  };

  const handleSave = async (ideaId: string) => {
    if (!session?.user) {
      toast.error("请先登录后再保存");
      return;
    }

    const idea = ideas.find((i) => i.id === ideaId);
    if (!idea) return;

    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords,
          save: true,
          singleIdea: idea,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newId = data.idea?.id || ideaId;
        setIdeas((prev) =>
          prev.map((i) => (i.id === ideaId ? { ...i, id: newId, saved: true } : i))
        );
        // 如果当前选中的是这个创意，也更新选中ID
        if (selectedId === ideaId) {
          setSelectedId(newId);
        }
        toast.success("已保存到我的创意");
      }
    } catch {
      toast.error("保存失败");
    }
  };

  const handleTransferToLab = async (ideaId: string) => {
    if (!session?.user) {
      toast.error("请先登录");
      return;
    }

    const idea = ideas.find((i) => i.id === ideaId);
    if (!idea) return;

    try {
      let savedIdeaId = ideaId;
      let needSave = !idea.saved;

      // 如果创意标记为已保存，先尝试更新（始终更新，确保最新数据同步到数据库）
      if (idea.saved) {
        const updateRes = await fetch(`/api/ideas/${ideaId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: idea.title,
            description: idea.description,
            tags: idea.tags,
            marketSize: idea.marketSize,
            score: idea.score,
            canvas: idea.canvas,
            analysis: idea.analysis,
          }),
        });
        // 如果更新失败（404），说明数据库中的创意已被删除，需要重新保存
        if (!updateRes.ok) {
          needSave = true;
        }
      }

      // 保存创意（新创意或数据库中已删除的创意）
      if (needSave) {
        const saveRes = await fetch("/api/ideas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keywords,
            save: true,
            singleIdea: idea,
          }),
        });
        const saveData = await saveRes.json();
        if (saveRes.ok) {
          savedIdeaId = saveData.idea?.id || ideaId;
          setIdeas((prev) =>
            prev.map((i) => (i.id === ideaId ? { ...i, saved: true, id: savedIdeaId } : i))
          );
          if (selectedId === ideaId) {
            setSelectedId(savedIdeaId);
          }
        } else {
          throw new Error("保存创意失败");
        }
      }

      // 检查是否已有关联项目
      const checkRes = await fetch(`/api/projects/by-idea/${savedIdeaId}`);
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.project) {
          // 已有项目，直接跳转（canvas/analysis 已在上面更新）
          toast.success("已跳转到项目实验室");
          router.push(`/lab?project=${checkData.project.id}`);
          return;
        }
      }

      // 创建新项目
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: idea.title,
          description: idea.description,
          ideaId: savedIdeaId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("已转入项目实验室");
        router.push(`/lab?project=${data.project.id}`);
      } else {
        throw new Error("创建项目失败");
      }
    } catch {
      toast.error("转入实验室失败");
    }
  };

  const handleShare = async (idea: Idea) => {
    const shareText = `【${idea.title}】\n\n${idea.description}\n\n市场规模：${idea.marketSize}\n潜力评分：${idea.score}%\n\n— 由 Vireo AI 灵感生成器创建`;

    if (navigator.share) {
      try {
        await navigator.share({ title: idea.title, text: shareText });
      } catch {
        // 用户取消
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast.success("已复制到剪贴板");
    }
  };

  const handleRemove = (ideaId: string) => {
    setIdeas((prev) => prev.filter((i) => i.id !== ideaId));
    if (selectedId === ideaId) {
      const remaining = ideas.filter((i) => i.id !== ideaId);
      setSelectedId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleClearAll = () => {
    if (confirm("确定要清空所有生成的点子吗？")) {
      setIdeas([]);
      setSelectedId(null);
      setGenerationCount(0);
      localStorage.removeItem("vireoai_ideas");
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <Navigation />

      <div className="flex h-[calc(100vh-64px)]">
        {/* 左侧：点子列表 */}
        <div className="hidden md:flex w-80 lg:w-96 border-r border-border flex-col bg-secondary/20 relative">
          {/* 搜索和生成 */}
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/")}
                className="shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Input
                placeholder="输入关键词..."
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                className="flex-1"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleGenerate()}
                disabled={isGenerating || !keywords.trim()}
                className="flex-1 gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    {ideas.length > 0 ? "继续生成" : "生成点子"}
                  </>
                )}
              </Button>
              {ideas.length > 0 && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleGenerate(true)}
                  disabled={isGenerating}
                  title="换个方向"
                >
                  <Shuffle className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* 统计信息 */}
          {ideas.length > 0 && (
            <div className="px-4 py-2 border-b border-border flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                已生成 <span className="text-foreground font-medium">{ideas.length}</span> 个点子
              </span>
              <div className="flex items-center gap-1">
                {session?.user && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground h-7 px-2"
                    onClick={loadSavedIdeas}
                    disabled={loadingHistory}
                  >
                    {loadingHistory ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <History className="h-3 w-3 mr-1" />
                    )}
                    历史
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive h-7 px-2"
                  onClick={handleClearAll}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  清空
                </Button>
              </div>
            </div>
          )}

          {/* 历史记录面板 */}
          {showHistory && (
            <div className="absolute inset-0 z-10 bg-background/95 backdrop-blur-sm flex flex-col">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h3 className="font-medium">已保存的创意</h3>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowHistory(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <ScrollArea className="flex-1">
                {savedIdeas.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>暂无保存的创意</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    {savedIdeas.map((idea) => (
                      <div
                        key={idea.id}
                        onClick={() => loadFromHistory(idea)}
                        className="p-3 rounded-lg cursor-pointer bg-background/50 border border-transparent hover:bg-background hover:border-border transition-all"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-medium text-sm line-clamp-1 flex-1">{idea.title}</h4>
                          <Badge variant="secondary" className="text-xs">{idea.score}%</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{idea.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {idea.canvas && (
                            <Badge variant="outline" className="text-xs">商业画布</Badge>
                          )}
                          {idea.analysis && (
                            <Badge variant="outline" className="text-xs">市场分析</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {/* 点子列表 */}
          <ScrollArea className="flex-1">
            {ideas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-medium mb-2">开始生成创业点子</h3>
                <p className="text-sm text-muted-foreground">
                  输入关键词，AI 将为你生成多个创业点子
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {ideas.map((idea) => (
                  <div
                    key={idea.id}
                    onClick={() => setSelectedId(idea.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-all group relative ${
                      selectedId === idea.id
                        ? "bg-primary/10 border border-primary/30"
                        : "bg-background/50 border border-transparent hover:bg-background hover:border-border"
                    }`}
                  >
                    {/* 删除按钮 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(idea.id);
                      }}
                      className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                      title="删除"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                    <div className="flex items-start justify-between gap-2 mb-2 pr-6">
                      <h4 className="font-medium text-sm line-clamp-1 flex-1">
                        {idea.title}
                      </h4>
                      <div className="flex items-center gap-1 shrink-0">
                        {idea.saved && (
                          <Check className="h-3 w-3 text-green-500" />
                        )}
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            idea.score >= 80
                              ? "bg-green-500/20 text-green-500"
                              : idea.score >= 60
                              ? "bg-yellow-500/20 text-yellow-500"
                              : ""
                          }`}
                        >
                          {idea.score}%
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {idea.description}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {idea.tags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-xs px-1.5 py-0"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* 右侧：详情面板 */}
        <div className="flex-1 flex flex-col min-h-0">
          {selectedIdea ? (
            <>
              {/* 头部信息 */}
              <div className="p-6 border-b border-border shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <ScoreGauge score={selectedIdea.score} label="潜力评分" size="sm" />
                      <div>
                        <h1 className="text-xl font-bold">{selectedIdea.title}</h1>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <BarChart3 className="h-3 w-3" />
                            {selectedIdea.marketSize}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-muted-foreground">{selectedIdea.description}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selectedIdea.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShare(selectedIdea)}
                    >
                      <Share2 className="h-4 w-4 mr-1" />
                      分享
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSave(selectedIdea.id)}
                      disabled={selectedIdea.saved}
                    >
                      {selectedIdea.saved ? (
                        <>
                          <Check className="h-4 w-4 mr-1 text-green-500" />
                          已保存
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-1" />
                          保存
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleTransferToLab(selectedIdea.id)}
                      className="gap-1"
                    >
                      <FlaskConical className="h-4 w-4" />
                      转入实验室
                    </Button>
                  </div>
                </div>
              </div>

              {/* 详细内容 - 使用原生滚动 */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-6">
                  {/* 深入分析按钮 */}
                  {!selectedIdea.canvas && (
                    <div className="mb-6 p-6 rounded-xl border border-dashed border-border bg-secondary/20 text-center">
                      <Zap className="h-8 w-8 mx-auto mb-3 text-primary" />
                      <h3 className="font-medium mb-2">获取深入分析</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        AI 将为你生成商业模式画布和市场分析报告
                      </p>
                      <Button
                        onClick={() => handleAnalyze(selectedIdea.id)}
                        disabled={selectedIdea.isAnalyzing}
                        className="gap-2"
                      >
                        {selectedIdea.isAnalyzing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            正在分析...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            开始深入分析
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* 分析结果 */}
                  {selectedIdea.canvas && (
                    <Tabs defaultValue="canvas" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="canvas" className="gap-2">
                          <Target className="h-4 w-4" />
                          商业画布
                        </TabsTrigger>
                        <TabsTrigger value="analysis" className="gap-2">
                          <TrendingUp className="h-4 w-4" />
                          市场分析
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="canvas" className="mt-0">
                        <BusinessCanvas data={selectedIdea.canvas} />
                      </TabsContent>

                      <TabsContent value="analysis" className="mt-0">
                        {/* Google Trends 趋势图表 */}
                        <TrendsChart
                          title={selectedIdea.title}
                          description={selectedIdea.description}
                          className="mb-6"
                        />

                        {selectedIdea.analysis && (
                          <div className="space-y-6">
                            {/* 综合评估 - 雷达图 + 关键指标 */}
                            <div className="grid md:grid-cols-2 gap-6">
                              {/* 雷达图 */}
                              <div className="glass rounded-xl border border-glass-border p-4">
                                <h4 className="font-medium mb-2 text-sm text-muted-foreground">多维度评估</h4>
                                <AnalysisRadar
                                  data={getDefaultRadarData(selectedIdea.analysis)}
                                />
                              </div>

                              {/* 关键指标 */}
                              <div className="glass rounded-xl border border-glass-border p-4">
                                <h4 className="font-medium mb-4 text-sm text-muted-foreground">关键指标</h4>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
                                    <p className="text-xs text-muted-foreground mb-1">市场规模</p>
                                    <p className="text-base font-bold text-primary">
                                      {selectedIdea.analysis.marketSize}
                                    </p>
                                  </div>
                                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                                    <p className="text-xs text-muted-foreground mb-1">增长率</p>
                                    <p className="text-base font-bold text-green-500">
                                      {selectedIdea.analysis.growthRate}
                                    </p>
                                  </div>
                                  <div className="p-3 rounded-lg bg-secondary border border-border text-center">
                                    <p className="text-xs text-muted-foreground mb-1">目标用户</p>
                                    <p className="text-xs font-medium">
                                      {selectedIdea.analysis.targetAudience}
                                    </p>
                                  </div>
                                  <div className="p-3 rounded-lg bg-secondary border border-border text-center">
                                    <p className="text-xs text-muted-foreground mb-1">进入壁垒</p>
                                    <p className="text-xs font-medium">
                                      {selectedIdea.analysis.entryBarriers}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* SWOT 分析 */}
                            <div className="glass rounded-xl border border-glass-border p-4">
                              <h4 className="font-medium mb-4 text-sm text-muted-foreground">SWOT 分析</h4>
                              <SwotChart
                                data={{
                                  strengths: selectedIdea.analysis.opportunities.slice(0, 3),
                                  weaknesses: selectedIdea.analysis.threats.slice(0, 3),
                                  opportunities: selectedIdea.analysis.opportunities.slice(0, 3),
                                  threats: selectedIdea.analysis.threats.slice(0, 3),
                                }}
                              />
                            </div>

                            {/* 竞争对手 */}
                            {selectedIdea.analysis.competitors.length > 0 && (
                              <div className="glass rounded-xl border border-glass-border p-4">
                                <h4 className="font-medium mb-3 text-sm text-muted-foreground">主要竞争对手</h4>
                                <div className="flex flex-wrap gap-2">
                                  {selectedIdea.analysis.competitors.map((comp, i) => (
                                    <Badge key={i} variant="outline" className="px-3 py-1.5">
                                      {comp}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* 行动建议 */}
                            {selectedIdea.analysis.recommendations.length > 0 && (
                              <div className="glass rounded-xl border border-primary/30 p-4 bg-primary/5">
                                <h4 className="font-medium text-primary mb-3 flex items-center gap-2">
                                  <Rocket className="h-4 w-4" />
                                  行动建议
                                </h4>
                                <ul className="space-y-2">
                                  {selectedIdea.analysis.recommendations.map((rec, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm">
                                      <ChevronRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                      {rec}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Lightbulb className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-medium mb-2">选择一个点子查看详情</h2>
              <p className="text-muted-foreground max-w-md">
                从左侧列表中选择一个创业点子，查看详细信息、商业画布和市场分析
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
