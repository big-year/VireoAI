"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  MessageSquare,
  Send,
  Brain,
  Briefcase,
  Code,
  TrendingUp,
  Megaphone,
  Scale,
  Sparkles,
  User,
  Bot,
  History,
  Loader2,
  Plus,
  Trash2,
  Copy,
  Download,
  Link,
  X,
  Square,
  Check,
  Users,
  Settings2,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// 虚拟专家定义
const experts = [
  {
    id: "strategist",
    name: "李明",
    role: "战略顾问",
    icon: Briefcase,
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    description: "20年商业咨询经验，帮你理清商业模式和增长策略",
  },
  {
    id: "tech",
    name: "张工",
    role: "技术顾问",
    icon: Code,
    color: "text-green-400",
    bgColor: "bg-green-500/20",
    description: "连续创业CTO，实战派技术架构和选型专家",
  },
  {
    id: "investor",
    name: "王总",
    role: "投资顾问",
    icon: TrendingUp,
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
    description: "早期投资人视角，帮你打磨BP和融资策略",
  },
  {
    id: "marketing",
    name: "陈姐",
    role: "营销专家",
    icon: Megaphone,
    color: "text-orange-400",
    bgColor: "bg-orange-500/20",
    description: "大厂营销老兵，用户增长和品牌营销实操派",
  },
  {
    id: "legal",
    name: "刘律",
    role: "法务顾问",
    icon: Scale,
    color: "text-red-400",
    bgColor: "bg-red-500/20",
    description: "创业法律专家，股权架构和合规风险把控",
  },
];

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  expert?: (typeof experts)[0];
  specialRole?: { name: string; role: string };
  createdAt?: string;
};

type ConversationItem = {
  id: string;
  expertId: string;
  title: string | null;
  updatedAt: string;
  messages: { content: string }[];
};

// 项目类型
type ProjectInfo = {
  id: string;
  name: string;
  description: string | null;
  stage: string;
};

// 讨论模式
type DiscussionMode = "single" | "sequential" | "moderated" | "free";

// 用户参与时机
type ParticipationTiming = "after_each_round" | "on_key_points" | "before_summary";

// 加载占位组件
function ThinkTankLoading() {
  return (
    <main className="min-h-screen relative">
      <Navigation />
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </main>
  );
}

// 主页面组件
function ThinkTankContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  // 登录验证
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "system",
      content: "欢迎来到智囊团！选择顾问开始对话，可以选择单个顾问或多个顾问进行讨论。",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeExpert, setActiveExpert] = useState<(typeof experts)[0] | null>(null);
  const [selectedExperts, setSelectedExperts] = useState<string[]>([]);
  const [discussionMode, setDiscussionMode] = useState<DiscussionMode>("single");
  const [participationTiming, setParticipationTiming] = useState<ParticipationTiming>("before_summary");
  const [discussionRounds, setDiscussionRounds] = useState(3);
  const [showSettings, setShowSettings] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 关联项目
  const [linkedProject, setLinkedProject] = useState<ProjectInfo | null>(null);
  const [userProjects, setUserProjects] = useState<ProjectInfo[]>([]);
  const [showProjectSelector, setShowProjectSelector] = useState(false);

  // 从 URL 参数加载项目信息
  useEffect(() => {
    const projectId = searchParams.get("projectId");
    if (projectId && session?.user) {
      loadProjectInfo(projectId);
    }
  }, [searchParams, session]);

  // 从 URL 参数加载对话
  useEffect(() => {
    const convId = searchParams.get("conversationId");
    if (convId && session?.user) {
      loadConversationFromUrl(convId);
    }
  }, [searchParams, session]);

  const loadConversationFromUrl = async (convId: string) => {
    try {
      const res = await fetch(`/api/chat?conversationId=${convId}`);
      const data = await res.json();
      if (res.ok && data.messages && data.conversation) {
        const expertId = data.conversation.expertId;
        const expertIds = expertId.split(",");

        if (expertIds.length === 1) {
          // 单专家对话
          const expert = experts.find((e) => e.id === expertId);
          setActiveExpert(expert || null);
          setDiscussionMode("single");
        } else {
          // 多专家讨论
          setSelectedExperts(expertIds);
          setDiscussionMode(data.conversation.mode || "sequential");
        }

        setConversationId(convId);
        setMessages(
          data.messages.map((m: { id: string; role: string; content: string; createdAt: string }) => {
            const expert = experts.find((e) => e.id === expertId);
            return {
              id: m.id,
              role: m.role as "user" | "assistant",
              content: m.content,
              expert: m.role === "assistant" ? expert : undefined,
              createdAt: m.createdAt,
            };
          })
        );
      }
    } catch (error) {
      console.error("加载对话失败:", error);
    }
  };

  // 加载用户的项目列表
  useEffect(() => {
    if (session?.user) {
      loadUserProjects();
    }
  }, [session]);

  const loadProjectInfo = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setLinkedProject({
          id: data.id,
          name: data.name,
          description: data.description,
          stage: data.stage,
        });
        // 显示关联项目的系统消息（使用固定ID避免重复）
        const projectMsgId = `project-linked-${projectId}`;
        setMessages((prev) => {
          // 检查是否已存在该消息
          if (prev.some((m) => m.id === projectMsgId)) {
            return prev;
          }
          return [
            ...prev,
            {
              id: projectMsgId,
              role: "system",
              content: `已关联项目：${data.name}。专家将基于项目信息为你提供更精准的建议。`,
            },
          ];
        });
      }
    } catch (error) {
      console.error("加载项目信息失败:", error);
    }
  };

  const loadUserProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setUserProjects(data.projects || []);
      }
    } catch (error) {
      console.error("加载项目列表失败:", error);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  // 加载对话历史列表
  const loadConversations = async () => {
    if (!session?.user) return;
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/chat");
      const data = await res.json();
      if (res.ok) {
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error("加载对话历史失败:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // 加载特定对话
  const loadConversation = async (convId: string, expertId: string) => {
    try {
      const res = await fetch(`/api/chat?conversationId=${convId}`);
      const data = await res.json();
      if (res.ok && data.messages) {
        const expert = experts.find((e) => e.id === expertId);
        setActiveExpert(expert || null);
        setConversationId(convId);
        setMessages(
          data.messages.map((m: { id: string; role: string; content: string; createdAt: string }) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            expert: m.role === "assistant" ? expert : undefined,
            createdAt: m.createdAt,
          }))
        );
        setShowHistory(false);
      }
    } catch (error) {
      console.error("加载对话失败:", error);
    }
  };

  // 当前正在发言的专家信息（用于流式显示）
  const [currentSpeaker, setCurrentSpeaker] = useState<{
    id: string;
    name: string;
    role: string;
    round?: number;
  } | null>(null);

  // 发送消息（流式）
  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    // 检查是否选择了专家
    if (discussionMode === "single" && !activeExpert) {
      toast.error("请先选择一位顾问");
      return;
    }
    if (discussionMode !== "single" && selectedExperts.length < 2) {
      toast.error("多专家讨论模式需要选择至少2位顾问");
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setIsTyping(true);
    setStreamingContent("");
    setCurrentSpeaker(null);

    // 创建 AbortController 用于取消请求
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      let res: Response;

      if (discussionMode === "single") {
        // 单专家模式 - 使用原有 API
        const expert = activeExpert || experts[0];
        if (!activeExpert) {
          setActiveExpert(expert);
        }

        res = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: currentInput,
            expertId: expert.id,
            conversationId,
            projectId: linkedProject?.id,
          }),
          signal: abortController.signal,
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "对话失败");
        }

        // 获取新的对话 ID
        const newConversationId = res.headers.get("X-Conversation-Id");
        if (newConversationId && newConversationId !== conversationId) {
          setConversationId(newConversationId);
        }

        // 读取流式响应
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value, { stream: true });
            fullContent += text;
            setStreamingContent(fullContent);
          }
        }

        // 流结束后，添加完整消息
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: fullContent,
          expert: expert,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingContent("");
      } else {
        // 多专家讨论模式 - 使用新 API (SSE)
        res = await fetch("/api/chat/discussion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: currentInput,
            expertIds: selectedExperts,
            mode: discussionMode,
            participationTiming,
            conversationId,
            discussionRounds,
            projectId: linkedProject?.id,
          }),
          signal: abortController.signal,
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "对话失败");
        }

        // 获取新的对话 ID
        const newConversationId = res.headers.get("X-Conversation-Id");
        if (newConversationId && newConversationId !== conversationId) {
          setConversationId(newConversationId);
        }

        // 解析 SSE 流
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let currentExpertContent = "";
        let currentExpertInfo: { id: string; name: string; role: string; round?: number } | null = null;

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;

              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === "expert_start") {
                  // 新专家开始发言
                  if (currentExpertInfo && currentExpertContent) {
                    // 保存上一个专家的消息
                    const expertData = experts.find(e => e.id === currentExpertInfo!.id);
                    const newMessage: Message = {
                      id: `${Date.now()}-${currentExpertInfo.id}`,
                      role: "assistant",
                      content: currentExpertContent,
                      expert: expertData || undefined,
                    };
                    // 为特殊角色（主持人、纪要）添加标记
                    if (!expertData) {
                      (newMessage as Message & { specialRole?: { name: string; role: string } }).specialRole = {
                        name: currentExpertInfo.name,
                        role: currentExpertInfo.role,
                      };
                    }
                    setMessages((prev) => [...prev, newMessage]);
                  }

                  currentExpertInfo = {
                    id: data.expertId,
                    name: data.expertName,
                    role: data.expertRole,
                    round: data.round,
                  };
                  currentExpertContent = "";
                  setCurrentSpeaker(currentExpertInfo);
                  setStreamingContent("");
                } else if (data.type === "content") {
                  currentExpertContent += data.content;
                  setStreamingContent(currentExpertContent);
                } else if (data.type === "expert_end") {
                  // 专家发言结束，保存消息
                  if (currentExpertInfo && currentExpertContent) {
                    const expertData = experts.find(e => e.id === currentExpertInfo!.id);
                    const newMessage: Message = {
                      id: `${Date.now()}-${currentExpertInfo.id}`,
                      role: "assistant",
                      content: currentExpertContent,
                      expert: expertData || undefined,
                    };
                    if (!expertData) {
                      (newMessage as Message & { specialRole?: { name: string; role: string } }).specialRole = {
                        name: currentExpertInfo.name,
                        role: currentExpertInfo.role,
                      };
                    }
                    setMessages((prev) => [...prev, newMessage]);
                  }
                  currentExpertInfo = null;
                  currentExpertContent = "";
                  setCurrentSpeaker(null);
                  setStreamingContent("");
                } else if (data.type === "round") {
                  // 新一轮讨论开始，添加系统消息
                  const roundMessage: Message = {
                    id: `round-${data.round}`,
                    role: "system",
                    content: `第 ${data.round}/${data.totalRounds} 轮讨论`,
                  };
                  setMessages((prev) => [...prev, roundMessage]);
                } else if (data.type === "error") {
                  throw new Error(data.message);
                }
              } catch (e) {
                // 忽略解析错误
                console.error("SSE parse error:", e);
              }
            }
          }
        }
      }
    } catch (error) {
      // 如果是用户主动取消，不显示错误
      if (error instanceof Error && error.name === "AbortError") {
        const stopMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "system",
          content: "讨论已停止",
        };
        setMessages((prev) => [...prev, stopMessage]);
      } else {
        console.error("发送消息失败:", error);
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "system",
          content: error instanceof Error ? error.message : "网络错误，请检查连接后重试",
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
      setStreamingContent("");
    } finally {
      setIsTyping(false);
      setCurrentSpeaker(null);
      abortControllerRef.current = null;
    }
  };

  // 停止讨论
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // 切换专家选择（多选模式）
  const toggleExpertSelection = (expertId: string) => {
    setSelectedExperts((prev) => {
      if (prev.includes(expertId)) {
        return prev.filter((id) => id !== expertId);
      } else {
        return [...prev, expertId];
      }
    });
  };

  // 选择专家 - 单选模式
  const selectExpert = (expert: (typeof experts)[0]) => {
    if (discussionMode !== "single") {
      // 多选模式下，切换选择
      toggleExpertSelection(expert.id);
      return;
    }

    if (activeExpert?.id === expert.id) return;

    // 切换专家时，开始新对话
    setActiveExpert(expert);
    setConversationId(null); // 重置对话 ID，这样下次发消息会创建新对话

    const systemMessage: Message = {
      id: Date.now().toString(),
      role: "system",
      content: `${expert.name}（${expert.role}）已加入对话。有什么我能帮你的？`,
    };
    setMessages((prev) => [...prev, systemMessage]);
  };

  // 切换讨论模式
  const handleModeChange = (mode: DiscussionMode) => {
    setDiscussionMode(mode);
    setConversationId(null);

    if (mode === "single") {
      setSelectedExperts([]);
      const systemMessage: Message = {
        id: Date.now().toString(),
        role: "system",
        content: "已切换到单专家模式，请选择一位顾问开始对话。",
      };
      setMessages((prev) => [...prev, systemMessage]);
    } else {
      setActiveExpert(null);
      const modeNames: Record<string, string> = {
        sequential: "轮流发言",
        moderated: "主持人",
        free: "自由讨论",
      };
      const systemMessage: Message = {
        id: Date.now().toString(),
        role: "system",
        content: `已切换到${modeNames[mode]}模式，请选择至少2位顾问组成讨论小组。`,
      };
      setMessages((prev) => [...prev, systemMessage]);
    }
  };

  // 新建对话
  const startNewConversation = () => {
    setConversationId(null);
    setActiveExpert(null);
    setSelectedExperts([]);
    setMessages([
      {
        id: "welcome",
        role: "system",
        content: "欢迎来到智囊团！选择顾问开始对话，可以选择单个顾问或多个顾问进行讨论。",
      },
    ]);
  };

  // 删除对话
  const deleteConversation = async (convId: string) => {
    if (!confirm("确定要删除这个对话吗？")) return;
    try {
      const res = await fetch(`/api/chat?conversationId=${convId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== convId));
        if (conversationId === convId) {
          startNewConversation();
        }
        toast.success("对话已删除");
      }
    } catch (error) {
      console.error("删除对话失败:", error);
      toast.error("删除失败");
    }
  };

  // 复制消息
  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("已复制到剪贴板");
    } catch {
      toast.error("复制失败");
    }
  };

  // 导出对话
  const exportConversation = () => {
    const exportMessages = messages.filter((m) => m.role !== "system");
    if (exportMessages.length === 0) {
      toast.error("没有可导出的对话内容");
      return;
    }

    let content = `# 智囊团对话记录\n\n`;

    if (discussionMode === "single") {
      const expertName = activeExpert?.name || "AI 助手";
      content += `顾问：${expertName}（${activeExpert?.role || ""}）\n`;
    } else {
      const selectedExpertNames = selectedExperts
        .map((id) => experts.find((e) => e.id === id))
        .filter(Boolean)
        .map((e) => `${e!.name}（${e!.role}）`)
        .join("、");
      const modeNames: Record<string, string> = {
        sequential: "轮流发言",
        moderated: "主持人模式",
        free: "自由讨论",
      };
      content += `讨论模式：${modeNames[discussionMode]}\n`;
      content += `参与顾问：${selectedExpertNames}\n`;
    }

    content += `导出时间：${new Date().toLocaleString("zh-CN")}\n\n`;
    content += `---\n\n`;

    exportMessages.forEach((m) => {
      const role = m.role === "user" ? "我" : (m.expert?.name || "讨论");
      content += `**${role}**：\n${m.content}\n\n`;
    });

    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const fileName = discussionMode === "single"
      ? `智囊团对话_${activeExpert?.name || "AI"}_${new Date().toISOString().split("T")[0]}.md`
      : `智囊团讨论_${new Date().toISOString().split("T")[0]}.md`;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("对话已导出");
  };

  return (
    <main className="min-h-screen relative flex flex-col">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-glow-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-glow-pulse delay-500" />
      </div>

      <Navigation />

      <div className="flex-1 flex relative z-10 max-w-7xl mx-auto w-full px-4 py-6 gap-6">
        {/* Sidebar - Expert Selection */}
        <div className="hidden lg:block w-72 shrink-0">
          <div className="glass rounded-xl border border-glass-border p-4 sticky top-24">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              智囊团
            </h2>

            {/* 讨论模式选择 */}
            <div className="mb-4">
              <Label className="text-sm text-muted-foreground mb-2 block">讨论模式</Label>
              <Select value={discussionMode} onValueChange={(v) => handleModeChange(v as DiscussionMode)}>
                <SelectTrigger className="w-full bg-secondary/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">单专家对话</SelectItem>
                  <SelectItem value="sequential">轮流发言</SelectItem>
                  <SelectItem value="moderated">主持人模式</SelectItem>
                  <SelectItem value="free">自由讨论</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 多专家模式设置 */}
            {discussionMode !== "single" && (
              <Collapsible open={showSettings} onOpenChange={setShowSettings} className="mb-4">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between px-2">
                    <span className="flex items-center gap-2">
                      <Settings2 className="h-4 w-4" />
                      讨论设置
                    </span>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", showSettings && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-2">
                  {discussionMode === "moderated" && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">用户参与时机</Label>
                      <Select value={participationTiming} onValueChange={(v) => setParticipationTiming(v as ParticipationTiming)}>
                        <SelectTrigger className="w-full bg-secondary/30 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="after_each_round">每轮后参与</SelectItem>
                          <SelectItem value="on_key_points">关键点时参与</SelectItem>
                          <SelectItem value="before_summary">总结前参与</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {discussionMode === "free" && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">讨论轮数: {discussionRounds}</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={discussionRounds}
                        onChange={(e) => setDiscussionRounds(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                        className="h-8 bg-secondary/30"
                      />
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* 关联项目 */}
            <div className="mb-4">
              <Label className="text-xs text-muted-foreground mb-2 block">关联项目</Label>
              {linkedProject ? (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/30">
                  <Link className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm truncate flex-1">{linkedProject.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 shrink-0"
                    onClick={() => setLinkedProject(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Select
                  value=""
                  onValueChange={(projectId) => {
                    const project = userProjects.find((p) => p.id === projectId);
                    if (project) {
                      setLinkedProject(project);
                      setMessages((prev) => [
                        ...prev,
                        {
                          id: `project-${Date.now()}`,
                          role: "system",
                          content: `已关联项目：${project.name}。专家将基于项目信息为你提供更精准的建议。`,
                        },
                      ]);
                    }
                  }}
                >
                  <SelectTrigger className="w-full bg-secondary/30 h-8 text-xs">
                    <SelectValue placeholder="选择要关联的项目..." />
                  </SelectTrigger>
                  <SelectContent>
                    {userProjects.length === 0 ? (
                      <div className="p-2 text-xs text-muted-foreground text-center">
                        暂无项目
                      </div>
                    ) : (
                      userProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* 专家选择提示 */}
            <div className="mb-2 text-xs text-muted-foreground">
              {discussionMode === "single" ? (
                "选择一位顾问"
              ) : (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  已选择 {selectedExperts.length} 位顾问（至少2位）
                </span>
              )}
            </div>

            <div className="space-y-2">
              {experts.map((expert) => {
                const isSelected = discussionMode === "single"
                  ? activeExpert?.id === expert.id
                  : selectedExperts.includes(expert.id);

                return (
                  <button
                    key={expert.id}
                    onClick={() => selectExpert(expert)}
                    className={cn(
                      "w-full p-3 rounded-lg text-left transition-all border",
                      isSelected
                        ? "bg-primary/10 border-primary/50"
                        : "bg-secondary/30 border-transparent hover:bg-secondary/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {discussionMode !== "single" && (
                        <Checkbox
                          checked={selectedExperts.includes(expert.id)}
                          onCheckedChange={() => toggleExpertSelection(expert.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0"
                        />
                      )}
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                          expert.bgColor
                        )}
                      >
                        <expert.icon className={cn("h-5 w-5", expert.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground text-sm">
                          {expert.name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {expert.role}
                        </div>
                      </div>
                      {discussionMode === "single" && activeExpert?.id === expert.id && (
                        <Badge className="bg-primary/20 text-primary text-xs shrink-0">
                          对话中
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-border space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 bg-transparent"
                onClick={() => {
                  setShowHistory(true);
                  loadConversations();
                }}
              >
                <History className="h-4 w-4" />
                历史对话
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 bg-transparent"
                onClick={startNewConversation}
              >
                <Plus className="h-4 w-4" />
                新建对话
              </Button>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col glass rounded-xl border border-glass-border overflow-hidden">
          {/* Chat Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              {discussionMode === "single" && activeExpert ? (
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", activeExpert.bgColor)}>
                  <activeExpert.icon className={cn("h-5 w-5", activeExpert.color)} />
                </div>
              ) : discussionMode !== "single" && selectedExperts.length > 0 ? (
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
              )}
              <div>
                <h3 className="font-semibold text-foreground">
                  {discussionMode === "single"
                    ? activeExpert
                      ? activeExpert.name
                      : "智囊团"
                    : selectedExperts.length > 0
                    ? `讨论小组（${selectedExperts.length}人）`
                    : "智囊团"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {discussionMode === "single"
                    ? activeExpert
                      ? activeExpert.description
                      : "选择一位顾问开始对话"
                    : discussionMode === "sequential"
                    ? "轮流发言模式"
                    : discussionMode === "moderated"
                    ? "主持人模式"
                    : "自由讨论模式"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {messages.filter((m) => m.role !== "system").length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exportConversation}
                  title="导出对话"
                >
                  <Download className="h-4 w-4 mr-2" />
                  导出
                </Button>
              )}
              {session?.user && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowHistory(true);
                    loadConversations();
                  }}
                >
                  <History className="h-4 w-4 mr-2" />
                  历史
                </Button>
              )}
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4 pb-4">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} onCopy={copyMessage} />
              ))}
              {/* 流式输出中的消息 */}
              {isTyping && streamingContent && (
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    {(() => {
                      // 多专家模式下使用 currentSpeaker
                      if (currentSpeaker) {
                        const speakerExpert = experts.find(e => e.id === currentSpeaker.id);
                        if (speakerExpert) {
                          return (
                            <AvatarFallback className={speakerExpert.bgColor}>
                              <speakerExpert.icon className={cn("h-4 w-4", speakerExpert.color)} />
                            </AvatarFallback>
                          );
                        }
                        // 特殊角色（主持人、纪要）
                        return (
                          <AvatarFallback className="bg-primary/20">
                            <Brain className="h-4 w-4 text-primary" />
                          </AvatarFallback>
                        );
                      }
                      // 单专家模式
                      if (discussionMode === "single" && activeExpert) {
                        return (
                          <AvatarFallback className={activeExpert.bgColor}>
                            <activeExpert.icon className={cn("h-4 w-4", activeExpert.color)} />
                          </AvatarFallback>
                        );
                      }
                      return (
                        <AvatarFallback className="bg-primary/20">
                          <Bot className="h-4 w-4 text-primary" />
                        </AvatarFallback>
                      );
                    })()}
                  </Avatar>
                  <div className="max-w-[80%]">
                    {(() => {
                      // 多专家模式下显示当前发言者
                      if (currentSpeaker) {
                        const speakerExpert = experts.find(e => e.id === currentSpeaker.id);
                        return (
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn("text-sm font-medium", speakerExpert?.color || "text-primary")}>
                              {currentSpeaker.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {currentSpeaker.role}
                              {currentSpeaker.round && ` · 第${currentSpeaker.round}轮`}
                            </span>
                          </div>
                        );
                      }
                      // 单专家模式
                      if (discussionMode === "single" && activeExpert) {
                        return (
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn("text-sm font-medium", activeExpert.color)}>
                              {activeExpert.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {activeExpert.role}
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    <div className="glass rounded-lg px-4 py-3 border border-glass-border">
                      <div className="text-sm text-foreground prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-table:my-2 prose-th:bg-secondary/50 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-table:border prose-th:border prose-td:border prose-table:border-border">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingContent}</ReactMarkdown>
                        <span className="inline-block w-2 h-4 bg-primary/50 animate-pulse ml-1" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* 等待响应的动画 */}
              {isTyping && !streamingContent && (
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    {(() => {
                      if (currentSpeaker) {
                        const speakerExpert = experts.find(e => e.id === currentSpeaker.id);
                        if (speakerExpert) {
                          return (
                            <AvatarFallback className={speakerExpert.bgColor}>
                              <speakerExpert.icon className={cn("h-4 w-4", speakerExpert.color)} />
                            </AvatarFallback>
                          );
                        }
                        return (
                          <AvatarFallback className="bg-primary/20">
                            <Brain className="h-4 w-4 text-primary" />
                          </AvatarFallback>
                        );
                      }
                      if (discussionMode === "single" && activeExpert) {
                        return (
                          <AvatarFallback className={activeExpert.bgColor}>
                            <activeExpert.icon className={cn("h-4 w-4", activeExpert.color)} />
                          </AvatarFallback>
                        );
                      }
                      return (
                        <AvatarFallback className="bg-primary/20">
                          <Users className="h-4 w-4 text-primary" />
                        </AvatarFallback>
                      );
                    })()}
                  </Avatar>
                  <div className="glass rounded-lg px-4 py-3 border border-glass-border">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce delay-100" />
                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce delay-200" />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {currentSpeaker ? `${currentSpeaker.name}思考中...` : discussionMode === "single" ? "思考中..." : "准备讨论..."}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Mobile Expert Quick Select */}
          <div className="lg:hidden p-3 border-t border-border">
            {/* 移动端模式选择 */}
            <div className="flex items-center gap-2 mb-2">
              <Select value={discussionMode} onValueChange={(v) => handleModeChange(v as DiscussionMode)}>
                <SelectTrigger className="w-32 h-8 bg-secondary/30 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">单专家</SelectItem>
                  <SelectItem value="sequential">轮流发言</SelectItem>
                  <SelectItem value="moderated">主持人</SelectItem>
                  <SelectItem value="free">自由讨论</SelectItem>
                </SelectContent>
              </Select>
              {discussionMode !== "single" && (
                <span className="text-xs text-muted-foreground">
                  已选 {selectedExperts.length}/5
                </span>
              )}
            </div>
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-2 overflow-x-auto">
                {experts.map((expert) => {
                  const isSelected = discussionMode === "single"
                    ? activeExpert?.id === expert.id
                    : selectedExperts.includes(expert.id);

                  return (
                    <Button
                      key={expert.id}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => selectExpert(expert)}
                      className={cn(
                        "shrink-0 gap-2",
                        isSelected && "bg-primary/20 text-primary border-primary/50"
                      )}
                    >
                      <expert.icon className="h-4 w-4" />
                      {expert.name}
                      {discussionMode !== "single" && isSelected && (
                        <Check className="h-3 w-3" />
                      )}
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder={
                    discussionMode === "single"
                      ? activeExpert
                        ? `向${activeExpert.name}提问...`
                        : "选择顾问后开始提问..."
                      : selectedExperts.length >= 2
                      ? "向讨论小组提问..."
                      : "请选择至少2位顾问..."
                  }
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !isTyping && handleSend()}
                  className="bg-secondary/30 border-border pr-12"
                  disabled={isTyping}
                />
              </div>
              {isTyping ? (
                <Button
                  onClick={handleStop}
                  variant="destructive"
                  className="gap-2"
                >
                  <Square className="h-4 w-4" />
                  停止
                </Button>
              ) : (
                <Button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              <span>
                {discussionMode === "single"
                  ? session?.user
                    ? "对话会自动保存，可随时查看历史记录"
                    : "登录后可保存对话历史"
                  : `${
                      discussionMode === "sequential"
                        ? "专家将依次发表观点"
                        : discussionMode === "moderated"
                        ? "主持人将协调专家讨论"
                        : `专家将进行${discussionRounds}轮自由讨论`
                    }`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>历史对话</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无历史对话
              </div>
            ) : (
              conversations.map((conv) => {
                const expert = experts.find((e) => e.id === conv.expertId);
                return (
                  <div
                    key={conv.id}
                    className="w-full p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 text-left transition-colors group relative"
                  >
                    <button
                      onClick={() => loadConversation(conv.id, conv.expertId)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center gap-3">
                        {expert && (
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", expert.bgColor)}>
                            <expert.icon className={cn("h-4 w-4", expert.color)} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {expert?.name || "对话"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {conv.messages[0]?.content || "无消息"}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(conv.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conv.id);
                      }}
                      className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                      title="删除对话"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function MessageBubble({ message, onCopy }: { message: Message; onCopy: (content: string) => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (message.role === "system") {
    return (
      <div className="flex justify-center">
        <div className="px-4 py-2 rounded-full glass border border-glass-border text-sm text-muted-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  if (message.role === "user") {
    return (
      <div className="flex items-start gap-3 justify-end group">
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-secondary/50 self-center"
          title="复制"
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
        </button>
        <div className="max-w-[80%] bg-primary/20 rounded-lg px-4 py-3 border border-primary/30">
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-secondary">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 group">
      <Avatar className="h-8 w-8">
        {message.expert ? (
          <AvatarFallback className={message.expert.bgColor}>
            <message.expert.icon className={cn("h-4 w-4", message.expert.color)} />
          </AvatarFallback>
        ) : message.specialRole ? (
          <AvatarFallback className="bg-primary/20">
            <Brain className="h-4 w-4 text-primary" />
          </AvatarFallback>
        ) : (
          <AvatarFallback className="bg-primary/20">
            <Bot className="h-4 w-4 text-primary" />
          </AvatarFallback>
        )}
      </Avatar>
      <div className="max-w-[85%]">
        {message.expert && (
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-sm font-medium", message.expert.color)}>
              {message.expert.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {message.expert.role}
            </span>
          </div>
        )}
        {message.specialRole && !message.expert && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-primary">{message.specialRole.name}</span>
            <span className="text-xs text-muted-foreground">{message.specialRole.role}</span>
          </div>
        )}
        <div className="glass rounded-lg px-4 py-3 border border-glass-border relative">
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-secondary/50"
            title="复制"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
          </button>
          <div className="text-sm text-foreground pr-8 prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-headings:text-foreground prose-h2:text-base prose-h2:font-semibold prose-h2:border-b prose-h2:border-border prose-h2:pb-1 prose-h3:text-sm prose-h3:font-medium prose-pre:my-2 prose-pre:bg-secondary/50 prose-pre:rounded-lg prose-code:text-primary prose-code:bg-secondary/30 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-table:my-2 prose-th:bg-secondary/50 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-table:border prose-th:border prose-td:border prose-table:border-border">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}

// 导出的页面组件，用 Suspense 包裹
export default function ThinkTankPage() {
  return (
    <Suspense fallback={<ThinkTankLoading />}>
      <ThinkTankContent />
    </Suspense>
  );
}
