"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  Search,
  Filter,
  Link2,
  X,
  MessageCircle,
  MapPin,
  Briefcase,
  TrendingUp,
  Star,
  CheckCircle2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Zap,
  Target,
  Lightbulb,
  Loader2,
  PartyPopper,
  Inbox,
  Check,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Founder {
  id: string;
  name: string;
  title: string;
  image: string | null;
  initials: string;
  location: string;
  lookingFor: string[];
  skills: string[];
  interests: string[];
  experience: string;
  matchScore: number;
  verified: boolean;
  bio: string;
  achievements: string[];
  ideasCount: number;
  connectionStatus: "none" | "pending" | "connected" | "received";
}

interface Match {
  matchId: string;
  matchedAt: string;
  user: {
    id: string;
    name: string;
    image: string | null;
    title: string;
    bio: string;
    initials: string;
  };
}

interface Invitation {
  id: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    image: string | null;
    title: string;
    bio: string;
    location: string;
    initials: string;
    skills: string[];
    interests: string[];
  };
}

const filterOptions = {
  role: ["技术", "商业", "营销", "投资", "设计"],
  location: ["北京", "上海", "深圳", "杭州", "成都", "其他"],
  lookingFor: ["合伙人", "投资", "顾问", "项目机会"],
};

export default function MatchingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // 登录验证
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const [founders, setFounders] = useState<Founder[]>([]);
  const [filteredFounders, setFilteredFounders] = useState<Founder[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showMatchDialog, setShowMatchDialog] = useState(false);
  const [matchedUser, setMatchedUser] = useState<{ id: string; name: string; image: string | null; matchId?: string } | null>(null);
  const [showMatchesDialog, setShowMatchesDialog] = useState(false);
  const [showInvitationsDialog, setShowInvitationsDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<{
    role: string[];
    location: string[];
    lookingFor: string[];
  }>({
    role: [],
    location: [],
    lookingFor: [],
  });

  // 获取推荐列表
  const fetchFounders = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/matching?limit=50");
      if (!res.ok) throw new Error("获取失败");
      const data = await res.json();
      setFounders(data.founders);
      setFilteredFounders(data.founders);
    } catch (error) {
      console.error("获取推荐失败:", error);
      toast.error("获取推荐列表失败");
    } finally {
      setLoading(false);
    }
  };

  // 获取匹配列表
  const fetchMatches = async () => {
    try {
      const res = await fetch("/api/matching/matches");
      if (!res.ok) throw new Error("获取失败");
      const data = await res.json();
      setMatches(data.matches);
    } catch (error) {
      console.error("获取连接列表失败:", error);
    }
  };

  // 获取收到的邀请
  const fetchInvitations = async () => {
    try {
      const res = await fetch("/api/matching/invitations");
      if (!res.ok) throw new Error("获取失败");
      const data = await res.json();
      setInvitations(data.invitations);
    } catch (error) {
      console.error("获取邀请列表失败:", error);
    }
  };

  useEffect(() => {
    if (session) {
      fetchFounders();
      fetchMatches();
      fetchInvitations();
    }
  }, [session]);

  // 搜索和筛选
  useEffect(() => {
    let result = [...founders];

    // 搜索
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(query) ||
          f.title?.toLowerCase().includes(query) ||
          f.bio?.toLowerCase().includes(query) ||
          f.skills.some((s) => s.toLowerCase().includes(query)) ||
          f.interests.some((i) => i.toLowerCase().includes(query))
      );
    }

    // 筛选 - 角色/技能
    if (selectedFilters.role.length > 0) {
      result = result.filter((f) =>
        f.skills.some((s) =>
          selectedFilters.role.some((r) => s.toLowerCase().includes(r.toLowerCase()))
        )
      );
    }

    // 筛选 - 地点
    if (selectedFilters.location.length > 0) {
      result = result.filter((f) =>
        selectedFilters.location.some((l) =>
          f.location?.toLowerCase().includes(l.toLowerCase())
        )
      );
    }

    // 筛选 - 寻找
    if (selectedFilters.lookingFor.length > 0) {
      result = result.filter((f) =>
        f.lookingFor.some((lf) =>
          selectedFilters.lookingFor.some((s) => lf.toLowerCase().includes(s.toLowerCase()))
        )
      );
    }

    setFilteredFounders(result);
    setCurrentIndex(0);
  }, [searchQuery, selectedFilters, founders]);

  const toggleFilter = (category: keyof typeof selectedFilters, value: string) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter((v) => v !== value)
        : [...prev[category], value],
    }));
  };

  const clearFilters = () => {
    setSelectedFilters({ role: [], location: [], lookingFor: [] });
    setSearchQuery("");
  };

  const currentFounder = filteredFounders[currentIndex];

  // 发起连接
  const handleConnect = async () => {
    if (!currentFounder || !session) {
      toast.error("请先登录");
      return;
    }

    // 检查当前状态
    if (currentFounder.connectionStatus === "pending") {
      toast.info("已发送连接请求，等待对方回应");
      return;
    }
    if (currentFounder.connectionStatus === "connected") {
      toast.info("已建立连接");
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`/api/matching/${currentFounder.id}/like`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "操作失败");
      }
      const data = await res.json();

      // 检查是否连接成功
      if (data.matched && data.matchedUser) {
        setMatchedUser({ ...data.matchedUser, matchId: data.matchId });
        setShowMatchDialog(true);
        // 更新当前用户的连接状态
        updateFounderStatus(currentFounder.id, "connected");
        // 刷新连接列表
        fetchMatches();
      } else {
        toast.success("已发送连接请求");
        // 更新当前用户的连接状态为 pending
        updateFounderStatus(currentFounder.id, "pending");
      }
    } catch (error: any) {
      console.error("发起连接失败:", error);
      toast.error(error.message || "操作失败");
    } finally {
      setActionLoading(false);
    }
  };

  // 更新用户连接状态
  const updateFounderStatus = (userId: string, status: Founder["connectionStatus"]) => {
    setFounders((prev) =>
      prev.map((f) => (f.id === userId ? { ...f, connectionStatus: status } : f))
    );
    setFilteredFounders((prev) =>
      prev.map((f) => (f.id === userId ? { ...f, connectionStatus: status } : f))
    );
  };

  // 聊天按钮 - 只有连接后才能聊天
  const handleChat = () => {
    if (!currentFounder || !session) {
      toast.error("请先登录");
      return;
    }

    // 检查是否已经连接
    const existingMatch = matches.find(m => m.user.id === currentFounder.id);
    if (existingMatch) {
      // 已连接，直接跳转到消息
      router.push(`/messages?match=${existingMatch.matchId}`);
    } else {
      // 未连接，提示用户需要先建立连接
      toast.info("需要双方互相发起连接后才能聊天");
    }
  };

  // 跳过用户（不再移除，只是切换到下一个）
  const handlePass = () => {
    if (filteredFounders.length > 1) {
      handleNext();
    }
  };

  // 接受连接邀请
  const handleAcceptInvitation = async (userId: string) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/matching/${userId}/accept`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "操作失败");
      }
      const data = await res.json();

      toast.success("连接成功！");
      setMatchedUser({ ...data.matchedUser, matchId: data.matchId });
      setShowMatchDialog(true);

      // 从邀请列表中移除
      setInvitations((prev) => prev.filter((inv) => inv.user.id !== userId));
      // 更新用户状态
      updateFounderStatus(userId, "connected");
      // 刷新连接列表
      fetchMatches();
    } catch (error: any) {
      console.error("接受邀请失败:", error);
      toast.error(error.message || "操作失败");
    } finally {
      setActionLoading(false);
    }
  };

  // 忽略连接邀请
  const handleIgnoreInvitation = async (userId: string) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/matching/${userId}/ignore`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "操作失败");
      }

      toast.success("已忽略");
      // 从邀请列表中移除
      setInvitations((prev) => prev.filter((inv) => inv.user.id !== userId));
      // 更新用户状态为 none（恢复正常）
      updateFounderStatus(userId, "none");
    } catch (error: any) {
      console.error("忽略邀请失败:", error);
      toast.error(error.message || "操作失败");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : filteredFounders.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < filteredFounders.length - 1 ? prev + 1 : 0));
  };

  if (!session) {
    return (
      <main className="min-h-screen relative">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-glow-pulse" />
          <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-glow-pulse delay-700" />
        </div>
        <Navigation />
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full glass border border-glass-border flex items-center justify-center mx-auto mb-6">
              <Users className="h-10 w-10 text-primary animate-float" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              请先登录
            </h3>
            <p className="text-muted-foreground mb-6">
              登录后即可发现志同道合的创业伙伴
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-glow-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-glow-pulse delay-700" />
      </div>

      <Navigation />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              合作<span className="text-primary text-glow">发现</span>
            </h1>
            <p className="text-muted-foreground">
              AI 智能匹配，找到你的完美创业伙伴
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* 收到的邀请按钮 */}
            <Button
              variant={invitations.length > 0 ? "default" : "outline"}
              className={cn(
                "relative",
                invitations.length > 0 && "bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
              )}
              onClick={() => setShowInvitationsDialog(true)}
            >
              <Inbox className="h-4 w-4 mr-2" />
              收到的邀请
              {invitations.length > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-white/20 text-xs font-bold">
                  {invitations.length}
                </span>
              )}
            </Button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索技能、行业..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-48 bg-secondary/30"
              />
            </div>
            <Button
              variant={showFilters ? "default" : "outline"}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="glass rounded-xl border border-glass-border p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-foreground">筛选条件</h3>
              {(selectedFilters.role.length > 0 || selectedFilters.location.length > 0 || selectedFilters.lookingFor.length > 0) && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  清除筛选
                </Button>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">技能方向</p>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.role.map((role) => (
                    <Badge
                      key={role}
                      variant={selectedFilters.role.includes(role) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleFilter("role", role)}
                    >
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">所在城市</p>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.location.map((loc) => (
                    <Badge
                      key={loc}
                      variant={selectedFilters.location.includes(loc) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleFilter("location", loc)}
                    >
                      {loc}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">正在寻找</p>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.lookingFor.map((lf) => (
                    <Badge
                      key={lf}
                      variant={selectedFilters.lookingFor.includes(lf) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleFilter("lookingFor", lf)}
                    >
                      {lf}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            {filteredFounders.length !== founders.length && (
              <p className="text-sm text-muted-foreground mt-4">
                找到 {filteredFounders.length} 位符合条件的创业者
              </p>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="glass rounded-xl p-4 border border-glass-border text-center">
            <div className="text-2xl font-bold text-foreground">{filteredFounders.length}</div>
            <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Users className="h-4 w-4 text-accent" />
              待发现
            </div>
          </div>
          <div
            className="glass rounded-xl p-4 border border-glass-border text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setShowMatchesDialog(true)}
          >
            <div className="text-2xl font-bold text-foreground">{matches.length}</div>
            <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Link2 className="h-4 w-4 text-primary" />
              已连接
            </div>
          </div>
          <div className="glass rounded-xl p-4 border border-glass-border text-center">
            <div className="text-2xl font-bold text-foreground">0</div>
            <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <MessageCircle className="h-4 w-4 text-neon-cyan" />
              对话中
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredFounders.length > 0 && currentFounder ? (
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Main Card */}
            <div className="lg:col-span-3">
              <FounderCard
                founder={currentFounder}
                onConnect={handleConnect}
                onPass={handlePass}
                onPrev={handlePrev}
                onNext={handleNext}
                onChat={handleChat}
                hasMore={filteredFounders.length > 1}
                loading={actionLoading}
              />
            </div>

            {/* Side Panel */}
            <div className="lg:col-span-2 space-y-6">
              {/* Match Analysis */}
              <div className="glass rounded-xl border border-glass-border p-6">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI 匹配分析
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">整体匹配度</span>
                      <span className="text-primary font-bold">
                        {currentFounder.matchScore}%
                      </span>
                    </div>
                    <Progress value={currentFounder.matchScore} className="h-2" />
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-2 rounded-lg bg-secondary/30">
                      <Target className="h-4 w-4 text-primary mx-auto mb-1" />
                      <div className="text-xs text-muted-foreground">技能互补</div>
                      <div className="text-sm font-medium text-foreground">
                        {currentFounder.matchScore >= 80 ? "高" : currentFounder.matchScore >= 60 ? "中" : "低"}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-secondary/30">
                      <Lightbulb className="h-4 w-4 text-accent mx-auto mb-1" />
                      <div className="text-xs text-muted-foreground">兴趣契合</div>
                      <div className="text-sm font-medium text-foreground">
                        {currentFounder.interests.length > 2 ? "高" : currentFounder.interests.length > 0 ? "中" : "低"}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-secondary/30">
                      <Zap className="h-4 w-4 text-neon-cyan mx-auto mb-1" />
                      <div className="text-xs text-muted-foreground">目标一致</div>
                      <div className="text-sm font-medium text-foreground">
                        {currentFounder.lookingFor.length > 0 ? "高" : "中"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Why Match */}
              <div className="glass rounded-xl border border-glass-border p-6">
                <h3 className="font-semibold text-foreground mb-3">为什么推荐</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {currentFounder.interests.length > 0 && (
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                      <span>你们都对 {currentFounder.interests[0]} 感兴趣</span>
                    </li>
                  )}
                  {currentFounder.lookingFor.length > 0 && (
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                      <span>对方正在寻找{currentFounder.lookingFor[0]}</span>
                    </li>
                  )}
                  {currentFounder.verified && (
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                      <span>已认证用户，信息真实可靠</span>
                    </li>
                  )}
                  {currentFounder.ideasCount > 0 && (
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                      <span>已发布 {currentFounder.ideasCount} 个创意</span>
                    </li>
                  )}
                </ul>
              </div>

              {/* Quick Filters */}
              <div className="glass rounded-xl border border-glass-border p-6">
                <h3 className="font-semibold text-foreground mb-3">快速筛选</h3>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.role.map((role) => (
                    <Badge
                      key={role}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/20 hover:border-primary/50"
                    >
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full glass border border-glass-border flex items-center justify-center mx-auto mb-6">
              <Users className="h-10 w-10 text-primary animate-float" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              暂无更多推荐
            </h3>
            <p className="text-muted-foreground mb-6">
              你已经浏览了所有推荐的创业者
            </p>
            <Button
              onClick={fetchFounders}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              刷新推荐
            </Button>
          </div>
        )}
      </div>

      {/* Match Success Dialog */}
      <Dialog open={showMatchDialog} onOpenChange={setShowMatchDialog}>
        <DialogContent className="glass border-glass-border">
          <DialogHeader>
            <DialogTitle className="text-center">
              <PartyPopper className="h-12 w-12 text-primary mx-auto mb-4" />
              <span className="text-2xl">连接成功！</span>
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <Avatar className="h-20 w-20 mx-auto mb-4 border-2 border-primary">
              <AvatarImage src={matchedUser?.image || ""} />
              <AvatarFallback className="text-xl bg-primary/20 text-primary">
                {matchedUser?.name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <p className="text-lg font-medium text-foreground mb-2">
              你和 {matchedUser?.name} 已建立连接
            </p>
            <p className="text-muted-foreground mb-6">
              现在可以开始聊天了！
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => setShowMatchDialog(false)}>
                继续浏览
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={() => {
                  setShowMatchDialog(false);
                  if (matchedUser?.matchId) {
                    router.push(`/messages?match=${matchedUser.matchId}`);
                  } else {
                    router.push("/messages");
                  }
                }}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                发送消息
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Matches List Dialog */}
      <Dialog open={showMatchesDialog} onOpenChange={setShowMatchesDialog}>
        <DialogContent className="glass border-glass-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              已连接 ({matches.length})
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-3">
            {matches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无连接</p>
                <p className="text-sm mt-2">继续浏览，找到你的创业伙伴</p>
              </div>
            ) : (
              matches.map((match) => (
                <div
                  key={match.matchId}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setShowMatchesDialog(false);
                    router.push(`/messages?match=${match.matchId}`);
                  }}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={match.user.image || ""} />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {match.user.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {match.user.name}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {match.user.title}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost">
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Invitations Dialog */}
      <Dialog open={showInvitationsDialog} onOpenChange={setShowInvitationsDialog}>
        <DialogContent className="glass border-glass-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Inbox className="h-5 w-5 text-orange-400" />
              收到的邀请 ({invitations.length})
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-3">
            {invitations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Inbox className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无邀请</p>
                <p className="text-sm mt-2">当有人向你发起连接时会显示在这里</p>
              </div>
            ) : (
              invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="p-4 rounded-lg bg-secondary/30 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={invitation.user.image || ""} />
                      <AvatarFallback className="bg-orange-500/20 text-orange-400">
                        {invitation.user.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {invitation.user.name}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {invitation.user.title}
                      </p>
                      {invitation.user.location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {invitation.user.location}
                        </p>
                      )}
                    </div>
                  </div>
                  {invitation.user.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {invitation.user.bio}
                    </p>
                  )}
                  {invitation.user.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {invitation.user.skills.slice(0, 3).map((skill) => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleIgnoreInvitation(invitation.user.id)}
                      disabled={actionLoading}
                    >
                      <X className="h-4 w-4 mr-1" />
                      忽略
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-primary hover:bg-primary/90"
                      onClick={() => handleAcceptInvitation(invitation.user.id)}
                      disabled={actionLoading}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      接受
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function FounderCard({
  founder,
  onConnect,
  onPass,
  onPrev,
  onNext,
  onChat,
  hasMore,
  loading,
}: {
  founder: Founder;
  onConnect: () => void;
  onPass: () => void;
  onPrev: () => void;
  onNext: () => void;
  onChat: () => void;
  hasMore: boolean;
  loading: boolean;
}) {
  // 获取连接状态显示
  const getStatusDisplay = () => {
    switch (founder.connectionStatus) {
      case "pending":
        return (
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30">
            <Clock className="h-4 w-4 text-orange-400" />
            <span className="text-sm font-medium text-orange-400">已发送邀请</span>
          </div>
        );
      case "connected":
        return (
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <span className="text-sm font-medium text-green-400">已连接</span>
          </div>
        );
      case "received":
        return (
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30">
            <Inbox className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-400">对方已邀请你</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="glass rounded-2xl border border-glass-border overflow-hidden">
      {/* Header */}
      <div className="relative p-6 pb-4">
        {/* Match Score Badge */}
        <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/20 border border-primary/30">
            <Star className="h-4 w-4 text-primary fill-primary" />
            <span className="text-sm font-bold text-primary">
              {founder.matchScore}% 匹配
            </span>
          </div>
          {getStatusDisplay()}
        </div>

        <div className="flex items-start gap-4">
          <Avatar className="h-20 w-20 border-2 border-primary/30">
            <AvatarImage src={founder.image || ""} />
            <AvatarFallback className="text-xl bg-primary/20 text-primary">
              {founder.initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-foreground">
                {founder.name}
              </h2>
              {founder.verified && (
                <CheckCircle2 className="h-5 w-5 text-primary fill-primary/20" />
              )}
            </div>
            <p className="text-muted-foreground">{founder.title}</p>
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {founder.location}
              </span>
              {founder.experience && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-4 w-4" />
                  {founder.experience}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bio */}
      {founder.bio && (
        <div className="px-6 pb-4">
          <p className="text-foreground leading-relaxed">{founder.bio}</p>
        </div>
      )}

      {/* Looking For */}
      {founder.lookingFor.length > 0 && (
        <div className="px-6 pb-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            正在寻找
          </h4>
          <div className="flex flex-wrap gap-2">
            {founder.lookingFor.map((item) => (
              <Badge key={item} className="bg-primary/20 text-primary border-primary/30">
                {item}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Skills & Interests */}
      <div className="px-6 pb-4 grid grid-cols-2 gap-4">
        {founder.skills.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              核心技能
            </h4>
            <div className="flex flex-wrap gap-1">
              {founder.skills.map((skill) => (
                <Badge
                  key={skill}
                  variant="outline"
                  className="text-xs bg-secondary/30"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {founder.interests.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              感兴趣领域
            </h4>
            <div className="flex flex-wrap gap-1">
              {founder.interests.map((interest) => (
                <Badge
                  key={interest}
                  variant="outline"
                  className="text-xs bg-secondary/30"
                >
                  {interest}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Achievements */}
      {founder.achievements.length > 0 && (
        <div className="px-6 pb-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            成就亮点
          </h4>
          <div className="flex flex-wrap gap-2">
            {founder.achievements.map((achievement) => (
              <span
                key={achievement}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-accent/10 text-accent text-xs"
              >
                <TrendingUp className="h-3 w-3" />
                {achievement}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-6 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrev}
            disabled={!hasMore || loading}
            className="h-10 w-10"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNext}
            disabled={!hasMore || loading}
            className="h-10 w-10"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={onPass}
            disabled={loading || !hasMore}
            className="w-14 h-14 rounded-full border-2 hover:bg-secondary/50 bg-transparent"
            title="跳过"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
          {founder.connectionStatus === "connected" ? (
            <Button
              size="lg"
              onClick={onChat}
              disabled={loading}
              className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 text-white"
              title="发送消息"
            >
              <MessageCircle className="h-6 w-6" />
            </Button>
          ) : founder.connectionStatus === "pending" ? (
            <Button
              size="lg"
              disabled
              className="w-14 h-14 rounded-full bg-orange-500/50 text-white cursor-not-allowed"
              title="等待对方回应"
            >
              <Clock className="h-6 w-6" />
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={onConnect}
              disabled={loading}
              className="w-14 h-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
              title="发起连接"
            >
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Link2 className="h-6 w-6" />
              )}
            </Button>
          )}
          <Button
            variant="outline"
            size="lg"
            onClick={onChat}
            disabled={loading || founder.connectionStatus !== "connected"}
            className={cn(
              "w-14 h-14 rounded-full border-2 bg-transparent",
              founder.connectionStatus === "connected"
                ? "hover:bg-accent/10 hover:border-accent/50"
                : "opacity-50 cursor-not-allowed"
            )}
            title={founder.connectionStatus === "connected" ? "发送消息" : "需要先建立连接"}
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        </div>

        <div className="w-20" /> {/* Spacer for balance */}
      </div>
    </div>
  );
}
