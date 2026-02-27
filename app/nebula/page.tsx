"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Heart,
  MessageCircle,
  Users,
  Sparkles,
  Filter,
  TrendingUp,
  Clock,
  Zap,
  Star,
  Send,
  Loader2,
  Plus,
  Search,
  X,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface NebulaIdea {
  id: string;
  title: string;
  description: string;
  author: {
    id: string;
    name: string;
    image: string | null;
    initials: string;
  };
  likes: number;
  comments: number;
  collaborators: number;
  tags: string[];
  isLiked: boolean;
  createdAt: string;
  size: "small" | "medium" | "large";
  position: { x: number; y: number };
  hot: boolean;
}

interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    image: string | null;
    initials: string;
  };
  createdAt: string;
}

interface Stats {
  totalIdeas: number;
  totalUsers: number;
  todayIdeas: number;
  totalMatches: number;
}

const filterOptions = [
  { id: "hot", label: "热门", icon: TrendingUp },
  { id: "recent", label: "最新", icon: Clock },
  { id: "rising", label: "上升中", icon: Zap },
];

// 根据创意数据计算位置和大小 - 改进的算法，避免重叠
function calculateIdeaDisplay(ideas: NebulaIdea[], index: number): { position: { x: number; y: number }; size: "small" | "medium" | "large" } {
  // 使用黄金角度分布，确保点不重叠
  const goldenAngle = 137.5;
  const angle = index * goldenAngle * (Math.PI / 180);
  const radius = 15 + Math.sqrt(index) * 12; // 螺旋向外扩展

  // 转换为百分比坐标，确保在可视区域内
  const x = 50 + Math.cos(angle) * Math.min(radius, 35);
  const y = 50 + Math.sin(angle) * Math.min(radius, 35);

  const idea = ideas[index];

  // 根据点赞数决定大小
  let size: "small" | "medium" | "large" = "small";
  if (idea.likes >= 100) {
    size = "large";
  } else if (idea.likes >= 30) {
    size = "medium";
  }

  return {
    position: {
      x: Math.max(10, Math.min(90, x)),
      y: Math.max(10, Math.min(90, y))
    },
    size
  };
}

export default function NebulaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // 登录验证
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const [selectedFilter, setSelectedFilter] = useState("hot");
  const [ideas, setIdeas] = useState<NebulaIdea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<NebulaIdea | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [userIdeas, setUserIdeas] = useState<{ id: string; title: string; description: string; tags: string[] }[]>([]);
  const [selectedIdeaToPublish, setSelectedIdeaToPublish] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalIdeas: 0,
    totalUsers: 0,
    todayIdeas: 0,
    totalMatches: 0,
  });

  // 获取创意列表
  const fetchIdeas = async (append = false) => {
    try {
      if (!append) setLoading(true);
      else setLoadingMore(true);

      const sortMap: Record<string, string> = {
        hot: "likes",
        recent: "recent",
        rising: "rising",
      };
      const offset = append ? ideas.length : 0;
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : "";
      const res = await fetch(`/api/nebula?sort=${sortMap[selectedFilter]}&limit=20&offset=${offset}${searchParam}`);
      if (!res.ok) throw new Error("获取失败");
      const data = await res.json();

      // 添加位置和大小信息
      const startIndex = append ? ideas.length : 0;
      const ideasWithDisplay = data.ideas.map((idea: NebulaIdea, index: number) => {
        const display = calculateIdeaDisplay(data.ideas, startIndex + index);
        return {
          ...idea,
          ...display,
          hot: idea.likes >= 100,
        };
      });

      if (append) {
        setIdeas(prev => [...prev, ...ideasWithDisplay]);
      } else {
        setIdeas(ideasWithDisplay);
      }
      setHasMore(data.ideas.length === 20);
    } catch (error) {
      console.error("获取创意失败:", error);
      toast.error("获取创意列表失败");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // 获取用户的创意列表（用于发布）
  const fetchUserIdeas = async () => {
    if (!session?.user) return;
    try {
      const res = await fetch("/api/user/ideas?limit=50&isPublic=false");
      if (res.ok) {
        const data = await res.json();
        setUserIdeas(data.ideas || []);
      }
    } catch (error) {
      console.error("获取用户创意失败:", error);
    }
  };

  // 发布创意到星云
  const handlePublish = async () => {
    if (!selectedIdeaToPublish) {
      toast.error("请选择要发布的创意");
      return;
    }
    setPublishing(true);
    try {
      const res = await fetch("/api/nebula", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaId: selectedIdeaToPublish }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "发布失败");
      }
      toast.success("创意已发布到星云！");
      setShowPublishDialog(false);
      setSelectedIdeaToPublish(null);
      fetchIdeas(); // 刷新列表
    } catch (error: any) {
      toast.error(error.message || "发布失败");
    } finally {
      setPublishing(false);
    }
  };

  // 获取统计数据
  const fetchStats = async () => {
    try {
      const res = await fetch("/api/nebula/stats");
      if (!res.ok) throw new Error("获取失败");
      const data = await res.json();
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error("获取统计失败:", error);
    }
  };

  useEffect(() => {
    fetchIdeas();
    fetchStats();
  }, [selectedFilter]);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== "") {
        fetchIdeas();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 点赞/取消点赞
  const handleLike = async (ideaId: string) => {
    if (!session) {
      toast.error("请先登录");
      return;
    }

    try {
      const res = await fetch(`/api/nebula/${ideaId}/like`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("操作失败");
      const data = await res.json();

      // 更新本地状态
      setIdeas((prev) =>
        prev.map((idea) =>
          idea.id === ideaId
            ? {
                ...idea,
                isLiked: data.liked,
                likes: data.liked ? idea.likes + 1 : idea.likes - 1,
              }
            : idea
        )
      );

      // 如果选中的创意被点赞，也更新它
      if (selectedIdea?.id === ideaId) {
        setSelectedIdea((prev) =>
          prev
            ? {
                ...prev,
                isLiked: data.liked,
                likes: data.liked ? prev.likes + 1 : prev.likes - 1,
              }
            : null
        );
      }

      toast.success(data.liked ? "已点赞" : "已取消点赞");
    } catch (error) {
      console.error("点赞失败:", error);
      toast.error("操作失败");
    }
  };

  const formatNumber = (num: number | undefined | null): string => {
    if (num === undefined || num === null) return "0";
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + "万";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background - Nebula Effect */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Stars */}
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-foreground/20 rounded-full animate-glow-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
        {/* Nebula clouds */}
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] animate-glow-pulse" />
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[80px] animate-glow-pulse delay-1000" />
        <div className="absolute top-1/2 right-1/4 w-[300px] h-[300px] bg-neon-cyan/10 rounded-full blur-[60px] animate-glow-pulse delay-500" />
      </div>

      <Navigation />

      <div className="relative z-10">
        {/* Header */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                灵感<span className="text-primary text-glow">星云</span>
              </h1>
              <p className="text-muted-foreground">
                探索创业者社区中闪耀的创意星球
              </p>
            </div>
            <div className="flex items-center gap-2">
              {filterOptions.map((filter) => (
                <Button
                  key={filter.id}
                  variant={selectedFilter === filter.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedFilter(filter.id)}
                  className={cn(
                    selectedFilter === filter.id
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "text-muted-foreground"
                  )}
                >
                  <filter.icon className="h-4 w-4 mr-2" />
                  {filter.label}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索创意..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-48 bg-secondary/30"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      fetchIdeas();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {session?.user && (
                <Button
                  onClick={() => {
                    fetchUserIdeas();
                    setShowPublishDialog(true);
                  }}
                  className="gap-2"
                >
                  <Globe className="h-4 w-4" />
                  发布创意
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Nebula View - Interactive Star Map */}
        <div className="relative h-[70vh] max-w-7xl mx-auto px-4">
          <div className="absolute inset-0 glass rounded-2xl border border-glass-border overflow-hidden">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : ideas.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                <Sparkles className="h-12 w-12 mb-4 opacity-50" />
                <p>暂无公开创意</p>
                <p className="text-sm mt-2">成为第一个分享创意的人吧！</p>
              </div>
            ) : (
              <>
                {/* Ideas as planets */}
                {ideas.map((idea) => (
                  <IdeaPlanet
                    key={idea.id}
                    idea={idea}
                    isHovered={hoveredId === idea.id}
                    isSelected={selectedIdea?.id === idea.id}
                    onHover={() => setHoveredId(idea.id)}
                    onLeave={() => setHoveredId(null)}
                    onClick={() => setSelectedIdea(idea)}
                  />
                ))}

                {/* Connection lines between planets */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {ideas.slice(0, -1).map((idea, i) => {
                    const nextIdea = ideas[i + 1];
                    return (
                      <line
                        key={idea.id}
                        x1={`${idea.position.x}%`}
                        y1={`${idea.position.y}%`}
                        x2={`${nextIdea.position.x}%`}
                        y2={`${nextIdea.position.y}%`}
                        stroke="currentColor"
                        strokeWidth="1"
                        className="text-primary/10"
                        strokeDasharray="4 4"
                      />
                    );
                  })}
                </svg>
              </>
            )}
          </div>
        </div>

        {/* Selected Idea Detail Panel */}
        {selectedIdea && (
          <IdeaDetailPanel
            idea={selectedIdea}
            onClose={() => setSelectedIdea(null)}
            onLike={() => handleLike(selectedIdea.id)}
            isLoggedIn={!!session}
            currentUserId={session?.user?.id}
          />
        )}

        {/* Quick Stats */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Load More Button */}
          {hasMore && ideas.length > 0 && (
            <div className="text-center mb-8">
              <Button
                variant="outline"
                onClick={() => fetchIdeas(true)}
                disabled={loadingMore}
                className="gap-2"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    加载中...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    加载更多创意
                  </>
                )}
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "活跃创意", value: formatNumber(stats.totalIdeas), icon: Sparkles },
              { label: "创业者", value: formatNumber(stats.totalUsers), icon: Users },
              { label: "今日新增", value: formatNumber(stats.todayIdeas), icon: TrendingUp },
              { label: "成功配对", value: formatNumber(stats.totalMatches), icon: Heart },
            ].map((stat) => (
              <div
                key={stat.label}
                className="glass rounded-xl p-4 border border-glass-border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      {stat.value}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {stat.label}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="glass border-glass-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              发布创意到星云
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              选择一个你的创意发布到灵感星云，让其他创业者看到并互动。
            </p>
            {userIdeas.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">你还没有创意</p>
                <Button
                  className="mt-4"
                  onClick={() => {
                    setShowPublishDialog(false);
                    router.push("/generate");
                  }}
                >
                  去生成创意
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {userIdeas.map((idea) => (
                  <div
                    key={idea.id}
                    onClick={() => setSelectedIdeaToPublish(idea.id)}
                    className={cn(
                      "p-3 rounded-lg cursor-pointer transition-all border",
                      selectedIdeaToPublish === idea.id
                        ? "bg-primary/10 border-primary/50"
                        : "bg-secondary/30 border-transparent hover:bg-secondary/50"
                    )}
                  >
                    <h4 className="font-medium text-sm">{idea.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {idea.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {idea.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {userIdeas.length > 0 && (
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowPublishDialog(false)}>
                取消
              </Button>
              <Button
                onClick={handlePublish}
                disabled={!selectedIdeaToPublish || publishing}
              >
                {publishing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    发布中...
                  </>
                ) : (
                  "发布"
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function IdeaPlanet({
  idea,
  isHovered,
  isSelected,
  onHover,
  onLeave,
  onClick,
}: {
  idea: NebulaIdea;
  isHovered: boolean;
  isSelected: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
}) {
  const sizeClasses = {
    small: "w-16 h-16 sm:w-20 sm:h-20",
    medium: "w-24 h-24 sm:w-28 sm:h-28",
    large: "w-32 h-32 sm:w-36 sm:h-36",
  };

  return (
    <div
      className={cn(
        "absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 cursor-pointer",
        isHovered && "scale-110 z-20",
        isSelected && "scale-125 z-30"
      )}
      style={{ left: `${idea.position.x}%`, top: `${idea.position.y}%` }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      {/* Planet glow */}
      <div
        className={cn(
          "absolute inset-0 rounded-full blur-xl transition-opacity duration-300",
          idea.hot ? "bg-primary/40" : "bg-accent/30",
          isHovered || isSelected ? "opacity-100" : "opacity-50"
        )}
      />

      {/* Planet body */}
      <div
        className={cn(
          "relative rounded-full glass border transition-all duration-300 flex flex-col items-center justify-center p-2 text-center",
          sizeClasses[idea.size],
          idea.hot ? "border-primary/50" : "border-glass-border",
          (isHovered || isSelected) && "border-primary glow-border"
        )}
      >
        {idea.hot && (
          <Star className="absolute -top-1 -right-1 h-4 w-4 text-yellow-400 fill-yellow-400" />
        )}
        <span className="text-xs sm:text-sm font-medium text-foreground line-clamp-2 px-1">
          {idea.title}
        </span>
        <div className="flex items-center gap-1 mt-1 text-muted-foreground">
          <Heart className={cn("h-3 w-3", idea.isLiked && "fill-primary text-primary")} />
          <span className="text-xs">{idea.likes}</span>
        </div>
      </div>

      {/* Tooltip on hover */}
      {isHovered && !isSelected && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 glass rounded-lg p-3 border border-glass-border z-40">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {idea.description}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src={idea.author.image || ""} />
              <AvatarFallback className="text-[8px] bg-primary/20">
                {idea.author.initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">
              {idea.author.name}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function IdeaDetailPanel({
  idea,
  onClose,
  onLike,
  isLoggedIn,
  currentUserId,
}: {
  idea: NebulaIdea;
  onClose: () => void;
  onLike: () => void;
  isLoggedIn: boolean;
  currentUserId?: string;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [collaborateStatus, setCollaborateStatus] = useState<string | null>(null);
  const [applyingCollaborate, setApplyingCollaborate] = useState(false);

  const isOwner = currentUserId === idea.author.id;

  // 获取评论
  const fetchComments = async () => {
    try {
      setLoadingComments(true);
      const res = await fetch(`/api/nebula/${idea.id}/comments`);
      if (!res.ok) throw new Error("获取失败");
      const data = await res.json();
      setComments(data.comments);
    } catch (error) {
      console.error("获取评论失败:", error);
    } finally {
      setLoadingComments(false);
    }
  };

  // 获取协作状态
  const fetchCollaborateStatus = async () => {
    if (!isLoggedIn) return;
    try {
      const res = await fetch(`/api/nebula/${idea.id}/collaborate`);
      const data = await res.json();
      setCollaborateStatus(data.status);
    } catch (error) {
      console.error("获取协作状态失败:", error);
    }
  };

  useEffect(() => {
    fetchComments();
    fetchCollaborateStatus();
  }, [idea.id]);

  // 申请加入
  const handleApplyCollaborate = async () => {
    if (!isLoggedIn) {
      toast.error("请先登录");
      return;
    }
    if (isOwner) {
      toast.error("不能申请加入自己的创意");
      return;
    }

    try {
      setApplyingCollaborate(true);
      const res = await fetch(`/api/nebula/${idea.id}/collaborate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "申请失败");
        return;
      }
      setCollaborateStatus("pending");
      toast.success("申请已提交，等待作者审核");
    } catch (error) {
      console.error("申请协作失败:", error);
      toast.error("申请失败");
    } finally {
      setApplyingCollaborate(false);
    }
  };

  // 提交评论
  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    if (!isLoggedIn) {
      toast.error("请先登录");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/nebula/${idea.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      });
      if (!res.ok) throw new Error("提交失败");
      const data = await res.json();
      setComments((prev) => [data.comment, ...prev]);
      setNewComment("");
      toast.success("评论成功");
    } catch (error) {
      console.error("提交评论失败:", error);
      toast.error("评论失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300">
      <div className="max-w-4xl mx-auto px-4 pb-4">
        <div className="glass rounded-2xl border border-glass-border p-6 relative max-h-[70vh] overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
          >
            <span className="sr-only">关闭</span>
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Left: Main Info */}
            <div className="flex-1">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    {idea.title}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={idea.author.image || ""} />
                      <AvatarFallback className="text-xs bg-primary/20">
                        {idea.author.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">
                      {idea.author.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {idea.createdAt}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-muted-foreground mb-4">{idea.description}</p>

              <div className="flex flex-wrap gap-2 mb-6">
                {idea.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="bg-secondary/50"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Comments Section */}
              <div className="border-t border-glass-border pt-4">
                <h3 className="text-sm font-medium text-foreground mb-3">
                  评论 ({comments.length})
                </h3>

                {/* Comment Input */}
                <div className="flex gap-2 mb-4">
                  <Textarea
                    placeholder={isLoggedIn ? "写下你的想法..." : "请先登录后评论"}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    disabled={!isLoggedIn || submitting}
                    className="min-h-[60px] bg-secondary/30 border-glass-border resize-none"
                  />
                  <Button
                    size="icon"
                    onClick={handleSubmitComment}
                    disabled={!isLoggedIn || !newComment.trim() || submitting}
                    className="shrink-0"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Comments List */}
                <div className="space-y-3 max-h-[200px] overflow-y-auto">
                  {loadingComments ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      暂无评论，来说点什么吧
                    </p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="flex gap-2">
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarImage src={comment.author.image || ""} />
                          <AvatarFallback className="text-[8px] bg-primary/20">
                            {comment.author.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-foreground">
                              {comment.author.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {comment.createdAt}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right: Stats & Actions */}
            <div className="md:w-64 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg bg-secondary/30">
                  <Heart className={cn("h-5 w-5 mx-auto mb-1", idea.isLiked ? "text-primary fill-primary" : "text-primary")} />
                  <div className="text-lg font-bold text-foreground">
                    {idea.likes}
                  </div>
                  <div className="text-xs text-muted-foreground">点赞</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-secondary/30">
                  <MessageCircle className="h-5 w-5 text-accent mx-auto mb-1" />
                  <div className="text-lg font-bold text-foreground">
                    {comments.length}
                  </div>
                  <div className="text-xs text-muted-foreground">评论</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-secondary/30">
                  <Users className="h-5 w-5 text-neon-cyan mx-auto mb-1" />
                  <div className="text-lg font-bold text-foreground">
                    {idea.collaborators}
                  </div>
                  <div className="text-xs text-muted-foreground">协作</div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  className={cn(
                    "w-full",
                    idea.isLiked
                      ? "bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30"
                      : "bg-primary hover:bg-primary/90 text-primary-foreground"
                  )}
                  onClick={onLike}
                >
                  <Heart className={cn("h-4 w-4 mr-2", idea.isLiked && "fill-current")} />
                  {idea.isLiked ? "已点赞" : "点赞"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={handleApplyCollaborate}
                  disabled={isOwner || collaborateStatus === "accepted" || collaborateStatus === "pending" || applyingCollaborate}
                >
                  {applyingCollaborate ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Users className="h-4 w-4 mr-2" />
                  )}
                  {isOwner
                    ? "我的创意"
                    : collaborateStatus === "accepted"
                    ? "已加入"
                    : collaborateStatus === "pending"
                    ? "等待审核"
                    : "申请加入"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
