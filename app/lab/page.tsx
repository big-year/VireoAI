"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  FlaskConical,
  Plus,
  MoreVertical,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
  Beaker,
  BarChart3,
  Lightbulb,
  Rocket,
  Archive,
  Trash2,
  Zap,
  Brain,
  Shield,
  Loader2,
  Calendar,
  Flag,
  FileText,
  Milestone,
  Pin,
  Edit3,
  Save,
  X,
  Heart,
  Package,
  Megaphone,
  Handshake,
  DollarSign,
  Users,
  MessageSquare,
  Globe,
  Mic,
  Code,
  UserCircle,
  PiggyBank,
  Copy,
  Download,
  ChevronRight,
  ChevronDown,
  FileDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// 新增可视化组件
import { BusinessCanvas } from "@/components/business-canvas";
import { SwotChart } from "@/components/swot-chart";
import { AnalysisRadar, getDefaultRadarData } from "@/components/analysis-radar";
import { ScoreGauge, MultiScore } from "@/components/score-gauge";
import { TrendsChart } from "@/components/trends-chart";
import { MultiTrendsChart } from "@/components/multi-trends-chart";
// 导出工具
import { exportToMarkdown, downloadMarkdown, exportToPDFFromData } from "@/lib/export-utils";

type ProjectTask = {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  priority: string;
  dueDate: string | null;
  category: string | null;
};

type ProjectMilestone = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  completed: boolean;
  completedAt: string | null;
  tasks: ProjectTask[];
};

type ProjectNote = {
  id: string;
  title: string | null;
  content: string;
  category: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

type Project = {
  id: string;
  name: string;
  description: string | null;
  stage: string;
  progress: number;
  feasibility: number | null;
  potential: number | null;
  teamScore: number | null;
  riskLevel: string | null;
  insights: { type: string; text: string }[];
  tasks: ProjectTask[];
  milestones: ProjectMilestone[];
  notes: ProjectNote[];
  updatedAt: string;
  idea: {
    id: string;
    title: string;
    tags: string[];
    description: string;
    canvas: BusinessCanvas | null;
    analysis: MarketAnalysis | null;
  } | null;
};

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

const stageColors: Record<string, string> = {
  concept: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  validation: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  development: "bg-green-500/20 text-green-400 border-green-500/30",
  growth: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  archived: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const stageLabels: Record<string, string> = {
  concept: "概念阶段",
  validation: "验证阶段",
  development: "开发阶段",
  growth: "增长阶段",
  archived: "已归档",
};

const priorityColors: Record<string, string> = {
  low: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  medium: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  urgent: "bg-red-500/20 text-red-400 border-red-500/30",
};

const priorityLabels: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
  urgent: "紧急",
};

const noteCategoryLabels: Record<string, string> = {
  general: "通用",
  meeting: "会议",
  decision: "决策",
  idea: "想法",
  research: "研究",
};

export default function LabPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", description: "" });
  const [creating, setCreating] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [showTaskForm, setShowTaskForm] = useState(false);

  // 里程碑状态
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [newMilestone, setNewMilestone] = useState({ title: "", description: "", dueDate: "" });
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [loadingMilestones, setLoadingMilestones] = useState(false);

  // 笔记状态
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [newNote, setNewNote] = useState({ title: "", content: "", category: "general" });
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [editingNote, setEditingNote] = useState<ProjectNote | null>(null);

  // 当前显示的标签页
  const [activeTab, setActiveTab] = useState<"tasks" | "milestones" | "notes" | "canvas" | "analysis" | "trends" | "tools" | "consultations">("tasks");

  // 工具箱状态
  const [activeTool, setActiveTool] = useState<"bp" | "pitch" | "mvp" | "personas" | "financial" | null>(null);
  const [toolData, setToolData] = useState<any>(null);
  const [toolLoading, setToolLoading] = useState(false);
  const [toolError, setToolError] = useState<string | null>(null);

  // 咨询记录状态
  type Consultation = {
    id: string;
    expertId: string;
    mode: string | null;
    title: string | null;
    createdAt: string;
    updatedAt: string;
    messages: { content: string }[];
  };
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loadingConsultations, setLoadingConsultations] = useState(false);

  // 项目编辑状态
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editProjectForm, setEditProjectForm] = useState({ name: "", description: "" });
  const [savingProject, setSavingProject] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchProjects();
    }
  }, [status, router]);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (res.ok) {
        setProjects(data.projects);
        if (data.projects.length > 0 && !selectedProject) {
          setSelectedProject(data.projects[0]);
        }
      }
    } catch (error) {
      console.error("获取项目失败:", error);
    } finally {
      setLoading(false);
    }
  };

  // 调用工具 API - 加载已保存的数据
  const loadToolData = async (tool: "bp" | "pitch" | "mvp" | "personas" | "financial") => {
    if (!selectedProject) return;

    setActiveTool(tool);
    setToolLoading(true);
    setToolError(null);
    setToolData(null);

    try {
      // 先尝试获取已保存的数据
      const res = await fetch(`/api/projects/${selectedProject.id}/${tool}`);
      const data = await res.json();

      if (res.ok && data.exists) {
        setToolData(data);
        setToolLoading(false);
        return;
      }

      // 没有已保存的数据，显示空状态让用户点击生成
      setToolLoading(false);
    } catch (error) {
      console.error(`加载${tool}失败:`, error);
      setToolLoading(false);
    }
  };

  // 调用工具 API - 生成新数据
  const generateTool = async (tool: "bp" | "pitch" | "mvp" | "personas" | "financial") => {
    if (!selectedProject) return;

    setToolLoading(true);
    setToolError(null);

    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/${tool}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setToolData(data);
      } else {
        setToolError(data.error || "生成失败");
      }
    } catch (error) {
      console.error(`生成${tool}失败:`, error);
      setToolError("网络错误，请稍后重试");
    } finally {
      setToolLoading(false);
    }
  };

  // 复制到剪贴板
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // 可以添加 toast 提示
    } catch (error) {
      console.error("复制失败:", error);
    }
  };

  const createProject = async () => {
    if (!newProject.name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProject),
      });
      const data = await res.json();
      if (res.ok) {
        setProjects((prev) => [data.project, ...prev]);
        setSelectedProject(data.project);
        setShowNewDialog(false);
        setNewProject({ name: "", description: "" });
      }
    } catch (error) {
      console.error("创建项目失败:", error);
    } finally {
      setCreating(false);
    }
  };

  const updateProjectStage = async (stage: string) => {
    if (!selectedProject) return;
    try {
      const res = await fetch("/api/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedProject.id, stage }),
      });
      const data = await res.json();
      if (res.ok) {
        setProjects((prev) =>
          prev.map((p) => (p.id === data.project.id ? data.project : p))
        );
        setSelectedProject(data.project);
      }
    } catch (error) {
      console.error("更新项目失败:", error);
    }
  };

  const deleteProject = async () => {
    if (!selectedProject || !confirm("确定要删除这个项目吗？")) return;
    try {
      const res = await fetch(`/api/projects?id=${selectedProject.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== selectedProject.id));
        setSelectedProject(projects[0] || null);
      }
    } catch (error) {
      console.error("删除项目失败:", error);
    }
  };

  // 编辑项目
  const startEditProject = () => {
    if (!selectedProject) return;
    setEditProjectForm({
      name: selectedProject.name,
      description: selectedProject.description || "",
    });
    setIsEditingProject(true);
  };

  const saveProjectEdit = async () => {
    if (!selectedProject || !editProjectForm.name.trim()) return;
    setSavingProject(true);
    try {
      const res = await fetch("/api/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedProject.id,
          name: editProjectForm.name,
          description: editProjectForm.description,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setProjects((prev) =>
          prev.map((p) => (p.id === data.project.id ? data.project : p))
        );
        setSelectedProject(data.project);
        setIsEditingProject(false);
      }
    } catch (error) {
      console.error("保存项目失败:", error);
    } finally {
      setSavingProject(false);
    }
  };

  const handleStressTest = async () => {
    if (!selectedProject) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/analyze`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setProjects((prev) =>
          prev.map((p) => (p.id === data.project.id ? data.project : p))
        );
        setSelectedProject(data.project);
      }
    } catch (error) {
      console.error("分析失败:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addTask = async () => {
    if (!selectedProject || !newTaskTitle.trim()) return;
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle,
          priority: newTaskPriority,
          dueDate: newTaskDueDate || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedProject((prev) =>
          prev ? { ...prev, tasks: [...prev.tasks, data.task] } : null
        );
        setNewTaskTitle("");
        setNewTaskPriority("medium");
        setNewTaskDueDate("");
        setShowTaskForm(false);
      }
    } catch (error) {
      console.error("添加任务失败:", error);
    }
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    if (!selectedProject) return;
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/tasks`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, completed }),
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedProject((prev) =>
          prev
            ? {
                ...prev,
                progress: data.progress,
                tasks: prev.tasks.map((t) =>
                  t.id === taskId ? { ...t, completed } : t
                ),
              }
            : null
        );
      }
    } catch (error) {
      console.error("更新任务失败:", error);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!selectedProject) return;
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/tasks?taskId=${taskId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedProject((prev) =>
          prev
            ? {
                ...prev,
                progress: data.progress,
                tasks: prev.tasks.filter((t) => t.id !== taskId),
              }
            : null
        );
      }
    } catch (error) {
      console.error("删除任务失败:", error);
    }
  };

  // 里程碑相关函数
  const fetchMilestones = async () => {
    if (!selectedProject) return;
    setLoadingMilestones(true);
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/milestones`);
      const data = await res.json();
      if (res.ok) {
        setMilestones(data.milestones);
      }
    } catch (error) {
      console.error("获取里程碑失败:", error);
    } finally {
      setLoadingMilestones(false);
    }
  };

  const createMilestone = async () => {
    if (!selectedProject || !newMilestone.title.trim()) return;
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMilestone),
      });
      const data = await res.json();
      if (res.ok) {
        setMilestones((prev) => [...prev, data.milestone]);
        setNewMilestone({ title: "", description: "", dueDate: "" });
        setShowMilestoneForm(false);
      }
    } catch (error) {
      console.error("创建里程碑失败:", error);
    }
  };

  const toggleMilestone = async (milestoneId: string, completed: boolean) => {
    if (!selectedProject) return;
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/milestones`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestoneId, completed }),
      });
      const data = await res.json();
      if (res.ok) {
        setMilestones((prev) =>
          prev.map((m) => (m.id === milestoneId ? data.milestone : m))
        );
      }
    } catch (error) {
      console.error("更新里程碑失败:", error);
    }
  };

  const deleteMilestone = async (milestoneId: string) => {
    if (!selectedProject) return;
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/milestones?milestoneId=${milestoneId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMilestones((prev) => prev.filter((m) => m.id !== milestoneId));
      }
    } catch (error) {
      console.error("删除里程碑失败:", error);
    }
  };

  // 笔记相关函数
  const fetchNotes = async () => {
    if (!selectedProject) return;
    setLoadingNotes(true);
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/notes`);
      const data = await res.json();
      if (res.ok) {
        setNotes(data.notes);
      }
    } catch (error) {
      console.error("获取笔记失败:", error);
    } finally {
      setLoadingNotes(false);
    }
  };

  const createNote = async () => {
    if (!selectedProject || !newNote.content.trim()) return;
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newNote),
      });
      const data = await res.json();
      if (res.ok) {
        setNotes((prev) => [data.note, ...prev]);
        setNewNote({ title: "", content: "", category: "general" });
        setShowNoteForm(false);
      }
    } catch (error) {
      console.error("创建笔记失败:", error);
    }
  };

  const updateNote = async (noteId: string, updates: Partial<ProjectNote>) => {
    if (!selectedProject) return;
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/notes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId, ...updates }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotes((prev) =>
          prev.map((n) => (n.id === noteId ? data.note : n))
        );
        setEditingNote(null);
      }
    } catch (error) {
      console.error("更新笔记失败:", error);
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!selectedProject) return;
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/notes?noteId=${noteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
      }
    } catch (error) {
      console.error("删除笔记失败:", error);
    }
  };

  const toggleNotePin = async (noteId: string, pinned: boolean) => {
    await updateNote(noteId, { pinned });
  };

  // 咨询记录相关函数
  const fetchConsultations = async () => {
    if (!selectedProject) return;
    setLoadingConsultations(true);
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/conversations`);
      const data = await res.json();
      if (res.ok) {
        setConsultations(data.conversations);
      }
    } catch (error) {
      console.error("获取咨询记录失败:", error);
    } finally {
      setLoadingConsultations(false);
    }
  };

  // 跳转到智囊团咨询
  const goToThinkTank = () => {
    if (!selectedProject) return;
    router.push(`/think-tank?projectId=${selectedProject.id}`);
  };

  // 获取专家名称
  const getExpertNames = (expertId: string) => {
    const expertMap: Record<string, string> = {
      strategist: "李明（战略顾问）",
      tech: "张工（技术顾问）",
      investor: "王总（投资顾问）",
      marketing: "陈姐（营销专家）",
      legal: "刘律（法务顾问）",
    };
    const ids = expertId.split(",");
    if (ids.length === 1) {
      return expertMap[expertId] || expertId;
    }
    return ids.map(id => expertMap[id]?.split("（")[0] || id).join("、");
  };

  // 获取讨论模式名称
  const getModeLabel = (mode: string | null) => {
    const modeMap: Record<string, string> = {
      sequential: "轮流发言",
      moderated: "主持人模式",
      free: "自由讨论",
    };
    return mode ? modeMap[mode] || "单独咨询" : "单独咨询";
  };

  // 当选中项目变化时，加载里程碑、笔记和咨询记录
  useEffect(() => {
    if (selectedProject) {
      fetchMilestones();
      fetchNotes();
      fetchConsultations();
    }
  }, [selectedProject?.id]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "刚刚";
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString();
  };

  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return { text: `已过期 ${Math.abs(days)} 天`, isOverdue: true };
    if (days === 0) return { text: "今天截止", isOverdue: false };
    if (days === 1) return { text: "明天截止", isOverdue: false };
    if (days <= 7) return { text: `${days} 天后截止`, isOverdue: false };
    return { text: date.toLocaleDateString(), isOverdue: false };
  };

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen relative">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        </div>
        <Navigation />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-glow-pulse" />
        <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-glow-pulse delay-700" />
      </div>

      <Navigation />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              项目<span className="text-primary text-glow">实验室</span>
            </h1>
            <p className="text-muted-foreground">
              管理你的创业项目，AI 帮你进行压力测试和可行性分析
            </p>
          </div>
          <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                新建项目
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>创建新项目</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Input
                    placeholder="项目名称"
                    value={newProject.name}
                    onChange={(e) =>
                      setNewProject({ ...newProject, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Textarea
                    placeholder="项目描述（可选）"
                    value={newProject.description}
                    onChange={(e) =>
                      setNewProject({
                        ...newProject,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={createProject}
                  disabled={creating || !newProject.name.trim()}
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "创建"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {projects.length === 0 ? (
          <div className="glass rounded-xl border border-glass-border p-12 text-center">
            <FlaskConical className="h-16 w-16 text-primary/50 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">还没有项目</h2>
            <p className="text-muted-foreground mb-6">
              创建你的第一个创业项目，开始 AI 辅助分析
            </p>
            <Button onClick={() => setShowNewDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              创建项目
            </Button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Projects List */}
            <div className="lg:col-span-1 space-y-4">
              <div className="glass rounded-xl border border-glass-border p-4">
                <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <FlaskConical className="h-5 w-5 text-primary" />
                  我的项目
                  <Badge variant="secondary" className="ml-auto">
                    {projects.length}
                  </Badge>
                </h2>
                <div className="space-y-3">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => setSelectedProject(project)}
                      className={cn(
                        "p-4 rounded-lg cursor-pointer transition-all border",
                        selectedProject?.id === project.id
                          ? "bg-primary/10 border-primary/50"
                          : "bg-secondary/30 border-transparent hover:bg-secondary/50"
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Rocket
                            className={cn(
                              "h-4 w-4",
                              project.stage === "archived"
                                ? "text-gray-400"
                                : "text-green-400"
                            )}
                          />
                          <span className="font-medium text-foreground text-sm">
                            {project.name}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            stageColors[project.stage] || stageColors.concept
                          )}
                        >
                          {stageLabels[project.stage] || project.stage}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>完成度</span>
                          <span>{project.progress}%</span>
                        </div>
                        <Progress value={project.progress} className="h-1.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Project Detail */}
            {selectedProject && (
              <div className="lg:col-span-2 space-y-6">
                {/* Project Header */}
                <div className="glass rounded-xl border border-glass-border p-6">
                  <div className="flex items-start justify-between mb-4">
                    {isEditingProject ? (
                      <div className="flex-1 space-y-3">
                        <Input
                          value={editProjectForm.name}
                          onChange={(e) => setEditProjectForm({ ...editProjectForm, name: e.target.value })}
                          placeholder="项目名称"
                          className="text-xl font-bold"
                        />
                        <Textarea
                          value={editProjectForm.description}
                          onChange={(e) => setEditProjectForm({ ...editProjectForm, description: e.target.value })}
                          placeholder="项目描述"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button onClick={saveProjectEdit} disabled={savingProject} size="sm">
                            {savingProject ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                            保存
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setIsEditingProject(false)}>
                            <X className="h-4 w-4 mr-1" />
                            取消
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h2 className="text-2xl font-bold text-foreground">
                            {selectedProject.name}
                          </h2>
                          <Badge
                            variant="outline"
                            className={cn(
                              stageColors[selectedProject.stage] ||
                                stageColors.concept
                            )}
                          >
                            {stageLabels[selectedProject.stage] ||
                              selectedProject.stage}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">
                          {selectedProject.description || "暂无描述"}
                        </p>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToThinkTank}
                      className="gap-2 bg-primary/10 border-primary/30 hover:bg-primary/20"
                    >
                      <MessageSquare className="h-4 w-4" />
                      咨询专家
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={startEditProject}>
                          <Edit3 className="h-4 w-4 mr-2" />
                          编辑项目
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => updateProjectStage("validation")}
                        >
                          <Target className="h-4 w-4 mr-2" />
                          进入验证阶段
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => updateProjectStage("development")}
                        >
                          <Rocket className="h-4 w-4 mr-2" />
                          进入开发阶段
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => updateProjectStage("archived")}
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          归档
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={deleteProject}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Progress Overview */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-3 rounded-lg bg-secondary/30">
                      <Target className="h-5 w-5 text-primary mx-auto mb-1" />
                      <div className="text-2xl font-bold text-foreground">
                        {selectedProject.feasibility || "-"}
                      </div>
                      <div className="text-xs text-muted-foreground">可行性</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-secondary/30">
                      <TrendingUp className="h-5 w-5 text-accent mx-auto mb-1" />
                      <div className="text-2xl font-bold text-foreground">
                        {selectedProject.potential || "-"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        市场潜力
                      </div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-secondary/30">
                      <Zap className="h-5 w-5 text-neon-cyan mx-auto mb-1" />
                      <div className="text-2xl font-bold text-foreground">
                        {selectedProject.teamScore || "-"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        团队完整度
                      </div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-secondary/30">
                      <Shield
                        className={cn(
                          "h-5 w-5 mx-auto mb-1",
                          selectedProject.riskLevel === "low"
                            ? "text-green-400"
                            : selectedProject.riskLevel === "medium"
                            ? "text-yellow-400"
                            : selectedProject.riskLevel === "high"
                            ? "text-red-400"
                            : "text-muted-foreground"
                        )}
                      />
                      <div className="text-2xl font-bold text-foreground">
                        {selectedProject.riskLevel === "low"
                          ? "低"
                          : selectedProject.riskLevel === "medium"
                          ? "中"
                          : selectedProject.riskLevel === "high"
                          ? "高"
                          : "-"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        风险等级
                      </div>
                    </div>
                  </div>

                  {/* Task Progress */}
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/20">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">任务进度</span>
                        <span className="text-foreground font-medium">
                          {selectedProject.tasks.filter((t) => t.completed).length}{" "}
                          / {selectedProject.tasks.length}
                        </span>
                      </div>
                      <Progress
                        value={selectedProject.progress}
                        className="h-2"
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <Clock className="h-4 w-4 inline mr-1" />
                      更新于 {formatDate(selectedProject.updatedAt)}
                    </div>
                  </div>
                </div>

                {/* Tasks, Milestones, Notes Tabs */}
                <div className="glass rounded-xl border border-glass-border p-6">
                  {/* Tab Headers */}
                  <div className="flex items-center gap-4 mb-4 border-b border-glass-border pb-4 overflow-x-auto">
                    <button
                      onClick={() => setActiveTab("tasks")}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap",
                        activeTab === "tasks"
                          ? "bg-primary/20 text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      任务
                      <Badge variant="secondary" className="ml-1">
                        {selectedProject.tasks.length}
                      </Badge>
                    </button>
                    <button
                      onClick={() => setActiveTab("milestones")}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap",
                        activeTab === "milestones"
                          ? "bg-primary/20 text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Milestone className="h-4 w-4" />
                      里程碑
                      <Badge variant="secondary" className="ml-1">
                        {milestones.length}
                      </Badge>
                    </button>
                    <button
                      onClick={() => setActiveTab("notes")}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap",
                        activeTab === "notes"
                          ? "bg-primary/20 text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <FileText className="h-4 w-4" />
                      笔记
                      <Badge variant="secondary" className="ml-1">
                        {notes.length}
                      </Badge>
                    </button>
                    {selectedProject.idea?.canvas && (
                      <button
                        onClick={() => setActiveTab("canvas")}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap",
                          activeTab === "canvas"
                            ? "bg-primary/20 text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Target className="h-4 w-4" />
                        商业画布
                      </button>
                    )}
                    {selectedProject.idea?.analysis && (
                      <button
                        onClick={() => setActiveTab("analysis")}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap",
                          activeTab === "analysis"
                            ? "bg-primary/20 text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <TrendingUp className="h-4 w-4" />
                        市场分析
                      </button>
                    )}
                    {selectedProject.idea && (
                      <button
                        onClick={() => setActiveTab("trends")}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap",
                          activeTab === "trends"
                            ? "bg-primary/20 text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Globe className="h-4 w-4" />
                        趋势数据
                      </button>
                    )}
                    {selectedProject.idea && (
                      <button
                        onClick={() => setActiveTab("tools")}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap",
                          activeTab === "tools"
                            ? "bg-primary/20 text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Rocket className="h-4 w-4" />
                        工具箱
                      </button>
                    )}
                    <button
                      onClick={() => setActiveTab("consultations")}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap",
                        activeTab === "consultations"
                          ? "bg-primary/20 text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <MessageSquare className="h-4 w-4" />
                      咨询记录
                      <Badge variant="secondary" className="ml-1">
                        {consultations.length}
                      </Badge>
                    </button>
                  </div>

                  {/* Tasks Tab */}
                  {activeTab === "tasks" && (
                    <>
                      <div className="space-y-2 mb-4">
                        {selectedProject.tasks.map((task) => {
                          const dueInfo = formatDueDate(task.dueDate);
                          return (
                            <div
                              key={task.id}
                              className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20 group"
                            >
                              <Checkbox
                                checked={task.completed}
                                onCheckedChange={(checked) =>
                                  toggleTask(task.id, checked as boolean)
                                }
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      "truncate",
                                      task.completed && "line-through text-muted-foreground"
                                    )}
                                  >
                                    {task.title}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-xs shrink-0",
                                      priorityColors[task.priority] || priorityColors.medium
                                    )}
                                  >
                                    <Flag className="h-3 w-3 mr-1" />
                                    {priorityLabels[task.priority] || task.priority}
                                  </Badge>
                                </div>
                                {dueInfo && (
                                  <div
                                    className={cn(
                                      "text-xs mt-1 flex items-center gap-1",
                                      dueInfo.isOverdue ? "text-red-400" : "text-muted-foreground"
                                    )}
                                  >
                                    <Calendar className="h-3 w-3" />
                                    {dueInfo.text}
                                  </div>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                onClick={() => deleteTask(task.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                        {selectedProject.tasks.length === 0 && (
                          <p className="text-muted-foreground text-sm text-center py-4">
                            暂无任务
                          </p>
                        )}
                      </div>

                      {/* Add Task Form */}
                      {showTaskForm ? (
                        <div className="space-y-3 p-4 rounded-lg bg-secondary/30">
                          <Input
                            placeholder="任务标题"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <select
                              value={newTaskPriority}
                              onChange={(e) => setNewTaskPriority(e.target.value)}
                              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <option value="low">低优先级</option>
                              <option value="medium">中优先级</option>
                              <option value="high">高优先级</option>
                              <option value="urgent">紧急</option>
                            </select>
                            <Input
                              type="date"
                              value={newTaskDueDate}
                              onChange={(e) => setNewTaskDueDate(e.target.value)}
                              className="flex-1"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={addTask}
                              disabled={!newTaskTitle.trim()}
                              className="flex-1"
                            >
                              添加任务
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setShowTaskForm(false);
                                setNewTaskTitle("");
                                setNewTaskPriority("medium");
                                setNewTaskDueDate("");
                              }}
                            >
                              取消
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setShowTaskForm(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          添加任务
                        </Button>
                      )}
                    </>
                  )}

                  {/* Milestones Tab */}
                  {activeTab === "milestones" && (
                    <>
                      {loadingMilestones ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : (
                        <div className="space-y-3 mb-4">
                          {milestones.map((milestone) => {
                            const dueInfo = formatDueDate(milestone.dueDate);
                            return (
                              <div
                                key={milestone.id}
                                className={cn(
                                  "p-4 rounded-lg border transition-colors group",
                                  milestone.completed
                                    ? "bg-green-500/10 border-green-500/30"
                                    : "bg-secondary/20 border-transparent"
                                )}
                              >
                                <div className="flex items-start gap-3">
                                  <Checkbox
                                    checked={milestone.completed}
                                    onCheckedChange={(checked) =>
                                      toggleMilestone(milestone.id, checked as boolean)
                                    }
                                    className="mt-1"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span
                                        className={cn(
                                          "font-medium",
                                          milestone.completed && "line-through text-muted-foreground"
                                        )}
                                      >
                                        {milestone.title}
                                      </span>
                                      {milestone.completed && (
                                        <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                                          已完成
                                        </Badge>
                                      )}
                                    </div>
                                    {milestone.description && (
                                      <p className="text-sm text-muted-foreground mb-2">
                                        {milestone.description}
                                      </p>
                                    )}
                                    {dueInfo && (
                                      <div
                                        className={cn(
                                          "text-xs flex items-center gap-1",
                                          dueInfo.isOverdue ? "text-red-400" : "text-muted-foreground"
                                        )}
                                      >
                                        <Calendar className="h-3 w-3" />
                                        {dueInfo.text}
                                      </div>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                    onClick={() => deleteMilestone(milestone.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                          {milestones.length === 0 && (
                            <p className="text-muted-foreground text-sm text-center py-4">
                              暂无里程碑
                            </p>
                          )}
                        </div>
                      )}

                      {/* Add Milestone Form */}
                      {showMilestoneForm ? (
                        <div className="space-y-3 p-4 rounded-lg bg-secondary/30">
                          <Input
                            placeholder="里程碑标题"
                            value={newMilestone.title}
                            onChange={(e) =>
                              setNewMilestone({ ...newMilestone, title: e.target.value })
                            }
                            autoFocus
                          />
                          <Textarea
                            placeholder="描述（可选）"
                            value={newMilestone.description}
                            onChange={(e) =>
                              setNewMilestone({ ...newMilestone, description: e.target.value })
                            }
                            rows={2}
                          />
                          <Input
                            type="date"
                            value={newMilestone.dueDate}
                            onChange={(e) =>
                              setNewMilestone({ ...newMilestone, dueDate: e.target.value })
                            }
                            placeholder="截止日期"
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={createMilestone}
                              disabled={!newMilestone.title.trim()}
                              className="flex-1"
                            >
                              添加里程碑
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setShowMilestoneForm(false);
                                setNewMilestone({ title: "", description: "", dueDate: "" });
                              }}
                            >
                              取消
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setShowMilestoneForm(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          添加里程碑
                        </Button>
                      )}
                    </>
                  )}

                  {/* Notes Tab */}
                  {activeTab === "notes" && (
                    <>
                      {loadingNotes ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : (
                        <div className="space-y-3 mb-4">
                          {notes.map((note) => (
                            <div
                              key={note.id}
                              className={cn(
                                "p-4 rounded-lg border transition-colors group",
                                note.pinned
                                  ? "bg-yellow-500/10 border-yellow-500/30"
                                  : "bg-secondary/20 border-transparent"
                              )}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {note.pinned && (
                                    <Pin className="h-4 w-4 text-yellow-400" />
                                  )}
                                  <span className="font-medium">
                                    {note.title || "无标题"}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {noteCategoryLabels[note.category] || note.category}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-yellow-400"
                                    onClick={() => toggleNotePin(note.id, !note.pinned)}
                                  >
                                    <Pin className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    onClick={() => deleteNote(note.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {note.content}
                              </p>
                              <div className="text-xs text-muted-foreground mt-2">
                                {formatDate(note.updatedAt)}
                              </div>
                            </div>
                          ))}
                          {notes.length === 0 && (
                            <p className="text-muted-foreground text-sm text-center py-4">
                              暂无笔记
                            </p>
                          )}
                        </div>
                      )}

                      {/* Add Note Form */}
                      {showNoteForm ? (
                        <div className="space-y-3 p-4 rounded-lg bg-secondary/30">
                          <Input
                            placeholder="笔记标题（可选）"
                            value={newNote.title}
                            onChange={(e) =>
                              setNewNote({ ...newNote, title: e.target.value })
                            }
                          />
                          <Textarea
                            placeholder="笔记内容"
                            value={newNote.content}
                            onChange={(e) =>
                              setNewNote({ ...newNote, content: e.target.value })
                            }
                            rows={4}
                            autoFocus
                          />
                          <select
                            value={newNote.category}
                            onChange={(e) =>
                              setNewNote({ ...newNote, category: e.target.value })
                            }
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <option value="general">通用</option>
                            <option value="meeting">会议</option>
                            <option value="decision">决策</option>
                            <option value="idea">想法</option>
                            <option value="research">研究</option>
                          </select>
                          <div className="flex gap-2">
                            <Button
                              onClick={createNote}
                              disabled={!newNote.content.trim()}
                              className="flex-1"
                            >
                              添加笔记
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setShowNoteForm(false);
                                setNewNote({ title: "", content: "", category: "general" });
                              }}
                            >
                              取消
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setShowNoteForm(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          添加笔记
                        </Button>
                      )}
                    </>
                  )}

                  {/* Business Canvas Tab - 使用新的可视化组件 */}
                  {activeTab === "canvas" && selectedProject.idea?.canvas && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Lightbulb className="h-5 w-5 text-primary" />
                        <span className="text-sm text-muted-foreground">
                          来自创意：{selectedProject.idea.title}
                        </span>
                      </div>
                      {/* 使用新的商业画布组件 */}
                      <BusinessCanvas data={selectedProject.idea.canvas} />
                    </div>
                  )}

                  {/* Market Analysis Tab - 使用新的可视化组件 */}
                  {activeTab === "analysis" && selectedProject.idea?.analysis && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        <span className="text-sm text-muted-foreground">
                          来自创意：{selectedProject.idea.title}
                        </span>
                      </div>

                      {/* 综合评分和雷达图 */}
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="p-6 rounded-xl bg-secondary/30 border border-border">
                          <h4 className="font-medium mb-4 flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-primary" />
                            多维度分析
                          </h4>
                          <AnalysisRadar data={getDefaultRadarData(selectedProject.idea.analysis)} />
                        </div>
                        <div className="p-6 rounded-xl bg-secondary/30 border border-border">
                          <h4 className="font-medium mb-4 flex items-center gap-2">
                            <Target className="h-4 w-4 text-primary" />
                            关键指标
                          </h4>
                          <MultiScore
                            scores={[
                              { label: "市场规模", value: selectedProject.idea.analysis.marketSize?.includes("千亿") ? 90 : selectedProject.idea.analysis.marketSize?.includes("百亿") ? 75 : 60, description: selectedProject.idea.analysis.marketSize },
                              { label: "增长潜力", value: parseInt(selectedProject.idea.analysis.growthRate?.match(/\d+/)?.[0] || "50"), description: selectedProject.idea.analysis.growthRate },
                              { label: "进入难度", value: selectedProject.idea.analysis.entryBarriers?.includes("低") ? 80 : selectedProject.idea.analysis.entryBarriers?.includes("高") ? 40 : 60, description: selectedProject.idea.analysis.entryBarriers },
                              { label: "竞争强度", value: selectedProject.idea.analysis.competitors?.length <= 3 ? 75 : selectedProject.idea.analysis.competitors?.length <= 6 ? 55 : 35, description: `${selectedProject.idea.analysis.competitors?.length || 0} 个主要竞争对手` },
                            ]}
                          />
                        </div>
                      </div>

                      {/* SWOT 分析 */}
                      <div className="p-6 rounded-xl bg-secondary/30 border border-border">
                        <h4 className="font-medium mb-4 flex items-center gap-2">
                          <Shield className="h-4 w-4 text-primary" />
                          SWOT 分析
                        </h4>
                        <SwotChart
                          data={{
                            strengths: selectedProject.idea.analysis.recommendations?.slice(0, 3) || [],
                            weaknesses: [selectedProject.idea.analysis.entryBarriers || "需要进一步分析"],
                            opportunities: selectedProject.idea.analysis.opportunities || [],
                            threats: selectedProject.idea.analysis.threats || [],
                          }}
                        />
                      </div>

                      {/* 竞争对手 */}
                      {selectedProject.idea.analysis.competitors?.length > 0 && (
                        <div className="p-4 rounded-xl bg-secondary border border-border">
                          <h4 className="font-medium mb-3">主要竞争对手</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedProject.idea.analysis.competitors.map((comp, i) => (
                              <Badge key={i} variant="outline" className="px-3 py-1">
                                {comp}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 行动建议 */}
                      {selectedProject.idea.analysis.recommendations?.length > 0 && (
                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                          <h4 className="font-medium text-primary mb-3 flex items-center gap-2">
                            <Rocket className="h-4 w-4" />
                            行动建议
                          </h4>
                          <ul className="space-y-2">
                            {selectedProject.idea.analysis.recommendations.map((rec, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Trends Data Tab - 多源趋势数据 */}
                  {activeTab === "trends" && selectedProject.idea && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Globe className="h-5 w-5 text-primary" />
                        <span className="text-sm text-muted-foreground">
                          来自创意：{selectedProject.idea.title}
                        </span>
                      </div>

                      {/* Google Trends */}
                      <div className="border border-border rounded-lg p-4">
                        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Google 搜索趋势
                        </h3>
                        <TrendsChart
                          title={selectedProject.idea.title}
                          description={selectedProject.idea.description}
                        />
                      </div>

                      {/* Wikipedia + GitHub */}
                      <div className="border border-border rounded-lg p-4">
                        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          更多数据源
                        </h3>
                        <MultiTrendsChart
                          title={selectedProject.idea.title}
                          description={selectedProject.idea.description}
                        />
                      </div>
                    </div>
                  )}

                  {/* Tools Tab - 工具箱 */}
                  {activeTab === "tools" && selectedProject.idea && (
                    <div className="space-y-6">
                      {/* 工具选择网格 */}
                      {!activeTool && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <ToolCard
                            icon={FileText}
                            title="商业计划书"
                            description="生成完整的 BP 文档"
                            onClick={() => loadToolData("bp")}
                            color="purple"
                          />
                          <ToolCard
                            icon={Mic}
                            title="电梯演讲稿"
                            description="30秒/1分钟/3分钟版本"
                            onClick={() => loadToolData("pitch")}
                            color="blue"
                          />
                          <ToolCard
                            icon={Code}
                            title="MVP 规划"
                            description="最小可行产品功能清单"
                            onClick={() => loadToolData("mvp")}
                            color="green"
                          />
                          <ToolCard
                            icon={UserCircle}
                            title="用户画像"
                            description="生成典型用户 Persona"
                            onClick={() => loadToolData("personas")}
                            color="cyan"
                          />
                          <ToolCard
                            icon={PiggyBank}
                            title="财务预测"
                            description="3年收入成本预测"
                            onClick={() => loadToolData("financial")}
                            color="amber"
                          />
                        </div>
                      )}

                      {/* 工具加载中 */}
                      {activeTool && toolLoading && (
                        <div className="flex flex-col items-center justify-center py-16">
                          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                          <p className="text-muted-foreground">AI 正在生成中，请稍候...</p>
                        </div>
                      )}

                      {/* 工具错误 */}
                      {activeTool && toolError && (
                        <div className="flex flex-col items-center justify-center py-12">
                          <AlertTriangle className="h-10 w-10 text-amber-500 mb-4" />
                          <p className="text-muted-foreground mb-4">{toolError}</p>
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={() => { setActiveTool(null); setToolError(null); }}>
                              返回工具箱
                            </Button>
                            <Button onClick={() => activeTool && generateTool(activeTool)}>
                              重试
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* 空状态 - 没有已保存的数据，显示生成按钮 */}
                      {activeTool && !toolLoading && !toolError && !toolData && (
                        <div className="flex flex-col items-center justify-center py-16">
                          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            {activeTool === "bp" && <FileText className="h-8 w-8 text-primary" />}
                            {activeTool === "pitch" && <Mic className="h-8 w-8 text-primary" />}
                            {activeTool === "mvp" && <Code className="h-8 w-8 text-primary" />}
                            {activeTool === "personas" && <UserCircle className="h-8 w-8 text-primary" />}
                            {activeTool === "financial" && <PiggyBank className="h-8 w-8 text-primary" />}
                          </div>
                          <h3 className="text-lg font-medium mb-2">
                            {activeTool === "bp" && "商业计划书"}
                            {activeTool === "pitch" && "电梯演讲稿"}
                            {activeTool === "mvp" && "MVP 规划"}
                            {activeTool === "personas" && "用户画像"}
                            {activeTool === "financial" && "财务预测"}
                          </h3>
                          <p className="text-muted-foreground text-sm mb-6 text-center max-w-md">
                            {activeTool === "bp" && "AI 将根据项目信息生成完整的商业计划书，包含执行摘要、市场分析、财务预测等章节"}
                            {activeTool === "pitch" && "AI 将生成 30 秒、1 分钟、3 分钟三个版本的电梯演讲稿"}
                            {activeTool === "mvp" && "AI 将规划 MVP 功能清单，按优先级分类并提供开发建议"}
                            {activeTool === "personas" && "AI 将生成 3 个典型用户画像，包含人口统计、行为特征、痛点等"}
                            {activeTool === "financial" && "AI 将生成 3 年财务预测，包含收入、成本、利润及关键指标"}
                          </p>
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setActiveTool(null)}>
                              返回
                            </Button>
                            <Button onClick={() => generateTool(activeTool)}>
                              <Zap className="h-4 w-4 mr-2" />
                              开始生成
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* 工具结果展示 */}
                      {activeTool && toolData && !toolLoading && !toolError && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Button variant="ghost" size="sm" onClick={() => { setActiveTool(null); setToolData(null); }}>
                              <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
                              返回工具箱
                            </Button>
                            <div className="flex items-center gap-2">
                              {/* 导出下拉菜单 */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <FileDown className="h-4 w-4 mr-1" />
                                    导出
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const dataKey = activeTool === 'personas' ? toolData :
                                        activeTool === 'bp' ? toolData.bp :
                                        activeTool === 'pitch' ? toolData.pitch :
                                        activeTool === 'mvp' ? toolData.mvp :
                                        toolData.financial;
                                      const md = exportToMarkdown(dataKey, activeTool, toolData.projectName || selectedProject?.name || '项目');
                                      const toolNames: Record<string, string> = {
                                        bp: '商业计划书',
                                        pitch: '电梯演讲稿',
                                        mvp: 'MVP规划',
                                        personas: '用户画像',
                                        financial: '财务预测'
                                      };
                                      downloadMarkdown(md, `${selectedProject?.name || '项目'}-${toolNames[activeTool]}`);
                                    }}
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    导出 Markdown
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const dataKey = activeTool === 'personas' ? toolData :
                                        activeTool === 'bp' ? toolData.bp :
                                        activeTool === 'pitch' ? toolData.pitch :
                                        activeTool === 'mvp' ? toolData.mvp :
                                        toolData.financial;
                                      exportToPDFFromData(dataKey, activeTool, selectedProject?.name || '项目');
                                    }}
                                  >
                                    <FileDown className="h-4 w-4 mr-2" />
                                    导出 PDF
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <Button variant="outline" size="sm" onClick={() => activeTool && generateTool(activeTool)}>
                                <Zap className="h-4 w-4 mr-1" />
                                重新生成
                              </Button>
                            </div>
                          </div>

                          {/* 商业计划书结果 */}
                          {activeTool === "bp" && toolData.bp && (
                            <BPResult data={toolData.bp} projectName={toolData.projectName} />
                          )}

                          {/* 电梯演讲稿结果 */}
                          {activeTool === "pitch" && toolData.pitch && (
                            <PitchResult data={toolData.pitch} />
                          )}

                          {/* MVP 规划结果 */}
                          {activeTool === "mvp" && toolData.mvp && (
                            <MVPResult data={toolData.mvp} />
                          )}

                          {/* 用户画像结果 */}
                          {activeTool === "personas" && toolData.personas && (
                            <PersonasResult data={toolData} />
                          )}

                          {/* 财务预测结果 */}
                          {activeTool === "financial" && toolData.financial && (
                            <FinancialResult data={toolData.financial} />
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Consultations Tab */}
                  {activeTab === "consultations" && (
                    <>
                      {loadingConsultations ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : (
                        <div className="space-y-3 mb-4">
                          {consultations.map((consultation) => (
                            <div
                              key={consultation.id}
                              className="p-4 rounded-lg bg-secondary/20 border border-transparent hover:border-primary/30 transition-colors cursor-pointer"
                              onClick={() => router.push(`/think-tank?conversationId=${consultation.id}&projectId=${selectedProject?.id}`)}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <MessageSquare className="h-4 w-4 text-primary" />
                                  <span className="font-medium">
                                    {getExpertNames(consultation.expertId)}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {getModeLabel(consultation.mode)}
                                  </Badge>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(consultation.updatedAt)}
                                </span>
                              </div>
                              {consultation.messages[0] && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {consultation.messages[0].content}
                                </p>
                              )}
                            </div>
                          ))}
                          {consultations.length === 0 && (
                            <div className="text-center py-8">
                              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                              <p className="text-muted-foreground text-sm mb-4">
                                暂无咨询记录
                              </p>
                              <Button
                                variant="outline"
                                onClick={goToThinkTank}
                                className="gap-2"
                              >
                                <MessageSquare className="h-4 w-4" />
                                去咨询专家
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {consultations.length > 0 && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={goToThinkTank}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          发起新咨询
                        </Button>
                      )}
                    </>
                  )}
                </div>

                {/* Data Visualization */}
                {(selectedProject.feasibility || selectedProject.potential || selectedProject.teamScore) && (
                  <div className="glass rounded-xl border border-glass-border p-6">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      项目数据可视化
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Radar Chart - Project Scores */}
                      <div>
                        <h4 className="text-sm text-muted-foreground mb-3 text-center">项目评分雷达图</h4>
                        <ResponsiveContainer width="100%" height={250}>
                          <RadarChart
                            data={[
                              { subject: "可行性", value: selectedProject.feasibility || 0, fullMark: 100 },
                              { subject: "市场潜力", value: selectedProject.potential || 0, fullMark: 100 },
                              { subject: "团队完整度", value: selectedProject.teamScore || 0, fullMark: 100 },
                              { subject: "任务进度", value: selectedProject.progress, fullMark: 100 },
                              {
                                subject: "风险控制",
                                value: selectedProject.riskLevel === "low" ? 80 : selectedProject.riskLevel === "medium" ? 50 : selectedProject.riskLevel === "high" ? 20 : 0,
                                fullMark: 100,
                              },
                            ]}
                          >
                            <PolarGrid stroke="#6b7280" strokeOpacity={0.5} />
                            <PolarAngleAxis
                              dataKey="subject"
                              tick={{ fill: "#9ca3af", fontSize: 12 }}
                            />
                            <PolarRadiusAxis
                              angle={90}
                              domain={[0, 100]}
                              tick={{ fill: "#9ca3af", fontSize: 10 }}
                              axisLine={{ stroke: "#6b7280" }}
                            />
                            <Radar
                              name="评分"
                              dataKey="value"
                              stroke="#8b5cf6"
                              fill="#8b5cf6"
                              fillOpacity={0.4}
                              strokeWidth={2}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Pie Chart - Task Status */}
                      <div>
                        <h4 className="text-sm text-muted-foreground mb-3 text-center">任务完成状态</h4>
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={[
                                {
                                  name: "已完成",
                                  value: selectedProject.tasks.filter((t) => t.completed).length,
                                  color: "#22c55e",
                                },
                                {
                                  name: "进行中",
                                  value: selectedProject.tasks.filter((t) => !t.completed).length,
                                  color: "#3b82f6",
                                },
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                              label={({ name, percent }) =>
                                `${name} ${(percent * 100).toFixed(0)}%`
                              }
                              labelLine={false}
                            >
                              {[
                                { color: "#22c55e" },
                                { color: "#3b82f6" },
                              ].map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex justify-center gap-4 mt-2">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="text-xs text-muted-foreground">
                              已完成 ({selectedProject.tasks.filter((t) => t.completed).length})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <span className="text-xs text-muted-foreground">
                              进行中 ({selectedProject.tasks.filter((t) => !t.completed).length})
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Priority Distribution */}
                    <div className="mt-6 pt-6 border-t border-glass-border">
                      <h4 className="text-sm text-muted-foreground mb-3">任务优先级分布</h4>
                      <div className="grid grid-cols-4 gap-3">
                        {["urgent", "high", "medium", "low"].map((priority) => {
                          const count = selectedProject.tasks.filter((t) => t.priority === priority).length;
                          const total = selectedProject.tasks.length || 1;
                          const percentage = Math.round((count / total) * 100);
                          return (
                            <div key={priority} className="text-center">
                              <div
                                className={cn(
                                  "text-2xl font-bold mb-1",
                                  priority === "urgent" && "text-red-400",
                                  priority === "high" && "text-orange-400",
                                  priority === "medium" && "text-blue-400",
                                  priority === "low" && "text-gray-400"
                                )}
                              >
                                {count}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {priorityLabels[priority]}
                              </div>
                              <Progress
                                value={percentage}
                                className={cn(
                                  "h-1 mt-2",
                                  priority === "urgent" && "[&>div]:bg-red-400",
                                  priority === "high" && "[&>div]:bg-orange-400",
                                  priority === "medium" && "[&>div]:bg-blue-400",
                                  priority === "low" && "[&>div]:bg-gray-400"
                                )}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Insights */}
                <div className="glass rounded-xl border border-glass-border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary" />
                      AI 洞察分析
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleStressTest}
                      disabled={isAnalyzing}
                      className="gap-2 bg-transparent"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          分析中...
                        </>
                      ) : (
                        <>
                          <Beaker className="h-4 w-4" />
                          AI 压力测试
                        </>
                      )}
                    </Button>
                  </div>

                  {isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="relative w-20 h-20 mb-4">
                        <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
                        <div className="absolute inset-2 rounded-full border-2 border-primary/50 animate-ping delay-100" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Brain className="h-8 w-8 text-primary animate-glow-pulse" />
                        </div>
                      </div>
                      <p className="text-muted-foreground">
                        AI 正在分析项目可行性...
                      </p>
                    </div>
                  ) : selectedProject.insights.length > 0 ? (
                    <div className="space-y-3">
                      {selectedProject.insights.map((insight, index) => (
                        <div
                          key={index}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg",
                            insight.type === "opportunity" && "bg-green-500/10",
                            insight.type === "warning" && "bg-yellow-500/10",
                            insight.type === "suggestion" && "bg-blue-500/10"
                          )}
                        >
                          {insight.type === "opportunity" && (
                            <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
                          )}
                          {insight.type === "warning" && (
                            <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0" />
                          )}
                          {insight.type === "suggestion" && (
                            <Lightbulb className="h-5 w-5 text-blue-400 shrink-0" />
                          )}
                          <span className="text-sm text-foreground">
                            {insight.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>点击"AI 压力测试"获取项目分析</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

// 工具卡片组件
function ToolCard({
  icon: Icon,
  title,
  description,
  onClick,
  color,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    purple: "bg-purple-500/10 border-purple-500/30 hover:border-purple-500/50",
    blue: "bg-blue-500/10 border-blue-500/30 hover:border-blue-500/50",
    green: "bg-green-500/10 border-green-500/30 hover:border-green-500/50",
    cyan: "bg-cyan-500/10 border-cyan-500/30 hover:border-cyan-500/50",
    amber: "bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50",
  };
  const iconColorMap: Record<string, string> = {
    purple: "text-purple-500",
    blue: "text-blue-500",
    green: "text-green-500",
    cyan: "text-cyan-500",
    amber: "text-amber-500",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "p-6 rounded-xl border transition-all text-left hover:scale-[1.02]",
        colorMap[color]
      )}
    >
      <Icon className={cn("h-8 w-8 mb-3", iconColorMap[color])} />
      <h4 className="font-semibold mb-1">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </button>
  );
}

// 商业计划书结果组件
function BPResult({ data, projectName }: { data: any; projectName: string }) {
  const [expandedSection, setExpandedSection] = useState<string | null>("executiveSummary");

  const sections = [
    { key: "executiveSummary", icon: FileText },
    { key: "companyOverview", icon: Users },
    { key: "productService", icon: Package },
    { key: "marketAnalysis", icon: TrendingUp },
    { key: "competitiveAnalysis", icon: Target },
    { key: "businessModel", icon: DollarSign },
    { key: "marketingStrategy", icon: Megaphone },
    { key: "operationPlan", icon: Calendar },
    { key: "financialProjection", icon: BarChart3 },
    { key: "fundingRequest", icon: PiggyBank },
    { key: "riskAnalysis", icon: Shield },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{projectName} - 商业计划书</h3>
      </div>
      {sections.map(({ key, icon: Icon }) => {
        const section = data[key];
        if (!section) return null;
        const isExpanded = expandedSection === key;

        return (
          <div key={key} className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedSection(isExpanded ? null : key)}
              className="w-full flex items-center justify-between p-4 bg-secondary/30 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-primary" />
                <span className="font-medium">{section.title}</span>
              </div>
              <ChevronDown className={cn("h-5 w-5 transition-transform", isExpanded && "rotate-180")} />
            </button>
            {isExpanded && (
              <div className="p-4 bg-background">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{section.content}</p>
                {section.years && (
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {section.years.map((y: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg bg-secondary/30 text-center">
                        <p className="text-xs text-muted-foreground">{y.year}</p>
                        <p className="font-semibold text-primary">{y.revenue}</p>
                      </div>
                    ))}
                  </div>
                )}
                {section.risks && (
                  <div className="mt-4 space-y-2">
                    {section.risks.map((r: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                        <p className="font-medium text-sm">{r.type}</p>
                        <p className="text-xs text-muted-foreground">{r.description}</p>
                        <p className="text-xs text-green-500 mt-1">应对：{r.mitigation}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// 电梯演讲稿结果组件
function PitchResult({ data }: { data: any }) {
  const [selectedVersion, setSelectedVersion] = useState<"30s" | "60s" | "180s">("60s");

  const versions = {
    "30s": data.pitch30s,
    "60s": data.pitch60s,
    "180s": data.pitch180s,
  };

  const currentPitch = versions[selectedVersion];

  const copyContent = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      {/* 版本选择 */}
      <div className="flex gap-2">
        {(["30s", "60s", "180s"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setSelectedVersion(v)}
            className={cn(
              "px-4 py-2 rounded-lg transition-colors",
              selectedVersion === v
                ? "bg-primary text-primary-foreground"
                : "bg-secondary hover:bg-secondary/80"
            )}
          >
            {v === "30s" ? "30秒" : v === "60s" ? "1分钟" : "3分钟"}
          </button>
        ))}
      </div>

      {/* 演讲稿内容 */}
      {currentPitch && (
        <div className="space-y-4">
          <div className="p-6 rounded-xl bg-secondary/30 border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Mic className="h-5 w-5 text-primary" />
                <span className="font-medium">{currentPitch.duration}版本</span>
                <Badge variant="outline">{currentPitch.wordCount}</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => copyContent(currentPitch.content)}>
                <Copy className="h-4 w-4 mr-1" />
                复制
              </Button>
            </div>
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">{currentPitch.content}</p>
          </div>

          {/* 演讲技巧 */}
          {currentPitch.tips && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <h4 className="font-medium text-amber-500 mb-2 flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                演讲技巧
              </h4>
              <ul className="space-y-1">
                {currentPitch.tips.map((tip: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-amber-500">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 关键信息 */}
      {data.keyMessages && (
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
          <h4 className="font-medium text-primary mb-3">关键信息速记</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(data.keyMessages).map(([key, value]) => (
              <div key={key} className="p-3 rounded-lg bg-background">
                <p className="text-xs text-muted-foreground mb-1">
                  {key === "hook" ? "开场金句" : key === "problem" ? "核心痛点" : key === "solution" ? "解决方案" : key === "whyUs" ? "为什么选我们" : "融资诉求"}
                </p>
                <p className="text-sm font-medium">{value as string}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// MVP 规划结果组件
function MVPResult({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      {/* 概览 */}
      {data.summary && (
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-center">
            <p className="text-2xl font-bold text-primary">{data.summary.mvpFeatures}</p>
            <p className="text-xs text-muted-foreground">MVP 功能数</p>
          </div>
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
            <p className="text-2xl font-bold text-green-500">{data.summary.estimatedWeeks}</p>
            <p className="text-xs text-muted-foreground">预计周期</p>
          </div>
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
            <p className="text-2xl font-bold text-blue-500">{data.summary.teamSize}</p>
            <p className="text-xs text-muted-foreground">团队规模</p>
          </div>
          <div className="p-4 rounded-xl bg-secondary border border-border text-center">
            <p className="text-2xl font-bold">{data.summary.totalFeatures}</p>
            <p className="text-xs text-muted-foreground">总功能数</p>
          </div>
        </div>
      )}

      {/* 核心价值 */}
      {data.coreValue && (
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
          <h4 className="font-medium text-primary mb-2">MVP 核心价值假设</h4>
          <p className="text-sm">{data.coreValue}</p>
        </div>
      )}

      {/* 功能列表 */}
      {data.features && (
        <div className="space-y-4">
          {/* Must Have */}
          {data.features.mustHave?.length > 0 && (
            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
              <h4 className="font-medium text-red-500 mb-3 flex items-center gap-2">
                <Flag className="h-4 w-4" />
                必须有 (Must Have)
              </h4>
              <div className="space-y-2">
                {data.features.mustHave.map((f: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg bg-background flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{f.name}</span>
                        <Badge variant="outline" className="text-xs">{f.effort}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{f.description}</p>
                      <p className="text-xs text-primary mt-1">{f.userStory}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Should Have */}
          {data.features.shouldHave?.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <h4 className="font-medium text-amber-500 mb-3">应该有 (Should Have)</h4>
              <div className="space-y-2">
                {data.features.shouldHave.map((f: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg bg-background">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{f.name}</span>
                      <Badge variant="outline" className="text-xs">{f.effort}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{f.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Could Have */}
          {data.features.couldHave?.length > 0 && (
            <div className="p-4 rounded-xl bg-secondary border border-border">
              <h4 className="font-medium mb-3">可以有 (Could Have)</h4>
              <div className="flex flex-wrap gap-2">
                {data.features.couldHave.map((f: any, i: number) => (
                  <Badge key={i} variant="outline">{f.name}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 里程碑 */}
      {data.milestones?.length > 0 && (
        <div className="p-4 rounded-xl bg-secondary/30 border border-border">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Milestone className="h-4 w-4 text-primary" />
            开发里程碑
          </h4>
          <div className="space-y-3">
            {data.milestones.map((m: any, i: number) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium text-sm">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{m.phase}</span>
                    <Badge variant="secondary">{m.duration}</Badge>
                  </div>
                  <ul className="mt-1 text-sm text-muted-foreground">
                    {m.goals?.map((g: string, j: number) => (
                      <li key={j}>• {g}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 技术栈 */}
      {data.techStack && (
        <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
          <h4 className="font-medium text-blue-500 mb-3 flex items-center gap-2">
            <Code className="h-4 w-4" />
            推荐技术栈
          </h4>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">前端</p>
              <div className="flex flex-wrap gap-1">
                {data.techStack.frontend?.map((t: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">后端</p>
              <div className="flex flex-wrap gap-1">
                {data.techStack.backend?.map((t: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">数据库</p>
              <div className="flex flex-wrap gap-1">
                {data.techStack.database?.map((t: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                ))}
              </div>
            </div>
          </div>
          {data.techStack.reason && (
            <p className="text-sm text-muted-foreground">{data.techStack.reason}</p>
          )}
        </div>
      )}
    </div>
  );
}

// 用户画像结果组件
function PersonasResult({ data }: { data: any }) {
  const [selectedPersona, setSelectedPersona] = useState(0);
  const persona = data.personas?.[selectedPersona];

  return (
    <div className="space-y-6">
      {/* 画像选择 */}
      <div className="flex gap-3">
        {data.personas?.map((p: any, i: number) => (
          <button
            key={i}
            onClick={() => setSelectedPersona(i)}
            className={cn(
              "flex items-center gap-3 p-4 rounded-xl border transition-all flex-1",
              selectedPersona === i
                ? "bg-primary/10 border-primary"
                : "bg-secondary/30 border-border hover:border-primary/50"
            )}
          >
            <span className="text-3xl">{p.avatar}</span>
            <div className="text-left">
              <p className="font-medium">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.tagline}</p>
            </div>
          </button>
        ))}
      </div>

      {/* 画像详情 */}
      {persona && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* 基本信息 */}
          <div className="p-4 rounded-xl bg-secondary/30 border border-border">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-primary" />
              人口统计
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">年龄：</span>{persona.demographics?.age}</div>
              <div><span className="text-muted-foreground">性别：</span>{persona.demographics?.gender}</div>
              <div><span className="text-muted-foreground">职业：</span>{persona.demographics?.occupation}</div>
              <div><span className="text-muted-foreground">收入：</span>{persona.demographics?.income}</div>
              <div><span className="text-muted-foreground">城市：</span>{persona.demographics?.location}</div>
              <div><span className="text-muted-foreground">学历：</span>{persona.demographics?.education}</div>
            </div>
          </div>

          {/* 心理特征 */}
          <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
            <h4 className="font-medium text-purple-500 mb-3">心理特征</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">性格：</span>
                {persona.psychographics?.personality?.join("、")}
              </div>
              <div>
                <span className="text-muted-foreground">价值观：</span>
                {persona.psychographics?.values?.join("、")}
              </div>
              <div>
                <span className="text-muted-foreground">兴趣：</span>
                {persona.psychographics?.interests?.join("、")}
              </div>
            </div>
          </div>

          {/* 痛点 */}
          <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
            <h4 className="font-medium text-red-500 mb-3">核心痛点</h4>
            <div className="space-y-2">
              {persona.painPoints?.map((p: any, i: number) => (
                <div key={i} className="text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.pain}</span>
                    <Badge variant="outline" className="text-xs">严重度 {p.severity}/5</Badge>
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">现状：{p.currentSolution}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 目标和动机 */}
          <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
            <h4 className="font-medium text-green-500 mb-3">目标与动机</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">目标：</span>
                {persona.goals?.join("、")}
              </div>
              <div>
                <span className="text-muted-foreground">动机：</span>
                {persona.motivations?.join("、")}
              </div>
              <div>
                <span className="text-muted-foreground">障碍：</span>
                {persona.barriers?.join("、")}
              </div>
            </div>
          </div>

          {/* 典型场景 */}
          <div className="md:col-span-2 p-4 rounded-xl bg-primary/5 border border-primary/20">
            <h4 className="font-medium text-primary mb-2">典型使用场景</h4>
            <p className="text-sm text-muted-foreground">{persona.scenario}</p>
            {persona.quote && (
              <p className="text-sm italic mt-3 text-foreground">"{persona.quote}"</p>
            )}
          </div>
        </div>
      )}

      {/* 洞察 */}
      {data.insights && (
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <h4 className="font-medium text-amber-500 mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            关键洞察
          </h4>
          <div className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">共同痛点：</span>{data.insights.commonPainPoints?.join("、")}</p>
            <p><span className="text-muted-foreground">差异点：</span>{data.insights.keyDifferentiators?.join("、")}</p>
            <p><span className="text-muted-foreground">优先服务：</span>{data.insights.priorityPersona}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// 财务预测结果组件
function FinancialResult({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      {/* 关键指标 */}
      {data.keyMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-center">
            <p className="text-lg font-bold text-primary">{data.keyMetrics.cac}</p>
            <p className="text-xs text-muted-foreground">获客成本</p>
          </div>
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
            <p className="text-lg font-bold text-green-500">{data.keyMetrics.ltv}</p>
            <p className="text-xs text-muted-foreground">用户价值</p>
          </div>
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
            <p className="text-lg font-bold text-blue-500">{data.keyMetrics.ltvCacRatio}</p>
            <p className="text-xs text-muted-foreground">LTV/CAC</p>
          </div>
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
            <p className="text-lg font-bold text-amber-500">{data.keyMetrics.paybackPeriod}</p>
            <p className="text-xs text-muted-foreground">回本周期</p>
          </div>
        </div>
      )}

      {/* 三年预测表格 */}
      {data.profitability?.yearly && (
        <div className="p-4 rounded-xl bg-secondary/30 border border-border">
          <h4 className="font-medium mb-4">三年财务预测</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2">年份</th>
                  <th className="text-right py-2">收入</th>
                  <th className="text-right py-2">成本</th>
                  <th className="text-right py-2">利润</th>
                  <th className="text-right py-2">利润率</th>
                </tr>
              </thead>
              <tbody>
                {data.profitability.yearly.map((y: any, i: number) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-3">{y.year}</td>
                    <td className="py-3 text-right text-green-500">¥{typeof y.revenue === 'number' ? (y.revenue/10000).toFixed(0) + '万' : y.revenue}</td>
                    <td className="py-3 text-right text-red-500">¥{typeof y.cost === 'number' ? (y.cost/10000).toFixed(0) + '万' : y.cost}</td>
                    <td className="py-3 text-right">{typeof y.profit === 'number' ? '¥' + (y.profit/10000).toFixed(0) + '万' : y.profit}</td>
                    <td className="py-3 text-right">{y.margin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 融资建议 */}
      {data.funding && (
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
          <h4 className="font-medium text-primary mb-3">融资建议</h4>
          <p className="text-2xl font-bold text-primary mb-2">{data.funding.recommended}</p>
          <p className="text-sm text-muted-foreground">预计可支撑 {data.funding.runway}</p>
        </div>
      )}

      {/* 总结 */}
      {data.summary && (
        <div className="p-4 rounded-xl bg-secondary border border-border">
          <p className="text-sm text-muted-foreground">{data.summary}</p>
        </div>
      )}
    </div>
  );
}
