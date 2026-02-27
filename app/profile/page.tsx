"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  User,
  Users,
  Settings,
  Lightbulb,
  FolderKanban,
  Heart,
  MapPin,
  Briefcase,
  Edit,
  Save,
  X,
  Plus,
  Loader2,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  Camera,
  ChevronRight,
  Send,
  MessageCircle,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Profile {
  id: string;
  name: string;
  email: string;
  image: string | null;
  bio: string;
  skills: string[];
  interests: string[];
  lookingFor: string[];
  location: string;
  title: string;
  experience: string;
  achievements: string[];
  verified: boolean;
  initials: string;
  createdAt: string;
  isProfileComplete: boolean;
  stats: {
    ideas: number;
    projects: number;
    likes: number;
    matches: number;
  };
}

interface Idea {
  id: string;
  title: string;
  description: string;
  tags: string[];
  score: number | null;
  isPublic: boolean;
  likes: number;
  createdAt: string;
  canvas?: any;
  analysis?: any;
}

interface Project {
  id: string;
  name: string;
  description: string;
  stage: string;
  progress: number;
  createdAt: string;
}

interface Match {
  matchId: string;
  matchedAt: string;
  user: {
    id: string;
    name: string;
    image: string | null;
    title: string;
    initials: string;
  };
}

interface Collaboration {
  id: string;
  status: string;
  message: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    bio: string | null;
    skills: string[];
  };
  idea: {
    id: string;
    title: string;
  };
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Profile>>({});
  const [newSkill, setNewSkill] = useState("");
  const [newInterest, setNewInterest] = useState("");
  const [newLookingFor, setNewLookingFor] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchProfile();
      fetchIdeas();
      fetchProjects();
      fetchMatches();
      fetchCollaborations();
    }
  }, [status]);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (!res.ok) throw new Error("获取失败");
      const data = await res.json();
      setProfile(data.profile);
      setEditForm(data.profile);
    } catch (error) {
      console.error("获取资料失败:", error);
      toast.error("获取资料失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchIdeas = async () => {
    try {
      const res = await fetch("/api/user/ideas?limit=5");
      if (!res.ok) throw new Error("获取失败");
      const data = await res.json();
      setIdeas(data.ideas);
    } catch (error) {
      console.error("获取创意失败:", error);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/user/projects?limit=5");
      if (!res.ok) throw new Error("获取失败");
      const data = await res.json();
      setProjects(data.projects);
    } catch (error) {
      console.error("获取项目失败:", error);
    }
  };

  const fetchMatches = async () => {
    try {
      const res = await fetch("/api/user/matches");
      if (!res.ok) throw new Error("获取失败");
      const data = await res.json();
      setMatches(data.matches);
    } catch (error) {
      console.error("获取匹配失败:", error);
    }
  };

  const fetchCollaborations = async () => {
    try {
      const res = await fetch("/api/user/collaborations");
      if (!res.ok) throw new Error("获取失败");
      const data = await res.json();
      setCollaborations(data.collaborations);
    } catch (error) {
      console.error("获取协作申请失败:", error);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error("保存失败");
      const data = await res.json();
      setProfile({ ...profile, ...data.profile });
      setEditing(false);
      toast.success("保存成功");
    } catch (error) {
      console.error("保存失败:", error);
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !editForm.skills?.includes(newSkill.trim())) {
      setEditForm({
        ...editForm,
        skills: [...(editForm.skills || []), newSkill.trim()],
      });
      setNewSkill("");
    }
  };

  const removeSkill = (skill: string) => {
    setEditForm({
      ...editForm,
      skills: editForm.skills?.filter((s) => s !== skill) || [],
    });
  };

  const addInterest = () => {
    if (newInterest.trim() && !editForm.interests?.includes(newInterest.trim())) {
      setEditForm({
        ...editForm,
        interests: [...(editForm.interests || []), newInterest.trim()],
      });
      setNewInterest("");
    }
  };

  const removeInterest = (interest: string) => {
    setEditForm({
      ...editForm,
      interests: editForm.interests?.filter((i) => i !== interest) || [],
    });
  };

  const addLookingFor = () => {
    if (newLookingFor.trim() && !editForm.lookingFor?.includes(newLookingFor.trim())) {
      setEditForm({
        ...editForm,
        lookingFor: [...(editForm.lookingFor || []), newLookingFor.trim()],
      });
      setNewLookingFor("");
    }
  };

  const removeLookingFor = (item: string) => {
    setEditForm({
      ...editForm,
      lookingFor: editForm.lookingFor?.filter((l) => l !== item) || [],
    });
  };

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen relative">
        <Navigation />
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen relative">
        <Navigation />
        <div className="flex items-center justify-center h-[80vh]">
          <p className="text-muted-foreground">加载失败</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-glow-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-glow-pulse delay-700" />
      </div>

      <Navigation />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="glass rounded-2xl border border-glass-border p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="relative group">
              <Avatar className="h-24 w-24 border-2 border-primary/30">
                <AvatarImage src={profile.image || ""} />
                <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                  {profile.initials}
                </AvatarFallback>
              </Avatar>
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="h-6 w-6 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    // TODO: 实现头像上传
                    toast.info("头像上传功能开发中");
                  }}
                />
              </label>
            </div>

            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-foreground">
                      {profile.name || "未设置昵称"}
                    </h1>
                    {profile.verified && (
                      <CheckCircle2 className="h-5 w-5 text-primary fill-primary/20" />
                    )}
                  </div>
                  <p className="text-muted-foreground">{profile.title || "创业者"}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    {profile.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {profile.location}
                      </span>
                    )}
                    {profile.experience && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        {profile.experience}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(!editing)}
                  className="bg-transparent"
                >
                  {editing ? (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      取消
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      编辑
                    </>
                  )}
                </Button>
              </div>

              {profile.bio && !editing && (
                <p className="mt-4 text-foreground">{profile.bio}</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-glass-border">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{profile.stats.ideas}</div>
              <div className="text-sm text-muted-foreground">创意</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{profile.stats.projects}</div>
              <div className="text-sm text-muted-foreground">项目</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{profile.stats.likes}</div>
              <div className="text-sm text-muted-foreground">喜欢</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{profile.stats.matches}</div>
              <div className="text-sm text-muted-foreground">匹配</div>
            </div>
          </div>
        </div>

        {/* Edit Form or Tabs */}
        {editing ? (
          <EditProfileForm
            editForm={editForm}
            setEditForm={setEditForm}
            newSkill={newSkill}
            setNewSkill={setNewSkill}
            addSkill={addSkill}
            removeSkill={removeSkill}
            newInterest={newInterest}
            setNewInterest={setNewInterest}
            addInterest={addInterest}
            removeInterest={removeInterest}
            newLookingFor={newLookingFor}
            setNewLookingFor={setNewLookingFor}
            addLookingFor={addLookingFor}
            removeLookingFor={removeLookingFor}
            onSave={handleSave}
            saving={saving}
            onCancel={() => {
              setEditing(false);
              setEditForm(profile);
            }}
          />
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="glass border border-glass-border">
              <TabsTrigger value="overview">概览</TabsTrigger>
              <TabsTrigger value="ideas">我的创意</TabsTrigger>
              <TabsTrigger value="collaborations" className="relative">
                协作申请
                {collaborations.filter(c => c.status === "pending").length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-[10px] text-primary-foreground rounded-full flex items-center justify-center">
                    {collaborations.filter(c => c.status === "pending").length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="projects">我的项目</TabsTrigger>
              <TabsTrigger value="matches">我的匹配</TabsTrigger>
              <TabsTrigger value="settings">设置</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <OverviewTab profile={profile} />
            </TabsContent>

            <TabsContent value="ideas">
              <IdeasTab
                ideas={ideas}
                onDelete={(id) => {
                  setIdeas(ideas.filter((i) => i.id !== id));
                  if (profile) {
                    setProfile({
                      ...profile,
                      stats: { ...profile.stats, ideas: profile.stats.ideas - 1 },
                    });
                  }
                }}
                onRefresh={fetchIdeas}
              />
            </TabsContent>

            <TabsContent value="collaborations">
              <CollaborationsTab
                collaborations={collaborations}
                onUpdate={fetchCollaborations}
              />
            </TabsContent>

            <TabsContent value="projects">
              <ProjectsTab
                projects={projects}
                onDelete={(id) => {
                  setProjects(projects.filter((p) => p.id !== id));
                  if (profile) {
                    setProfile({
                      ...profile,
                      stats: { ...profile.stats, projects: profile.stats.projects - 1 },
                    });
                  }
                }}
              />
            </TabsContent>

            <TabsContent value="matches">
              <MatchesTab matches={matches} />
            </TabsContent>

            <TabsContent value="settings">
              <SettingsTab
                profile={profile}
                onPasswordChange={() => setShowPasswordDialog(true)}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Password Dialog */}
      <PasswordDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
      />
    </main>
  );
}

// 编辑资料表单组件
function EditProfileForm({
  editForm,
  setEditForm,
  newSkill,
  setNewSkill,
  addSkill,
  removeSkill,
  newInterest,
  setNewInterest,
  addInterest,
  removeInterest,
  newLookingFor,
  setNewLookingFor,
  addLookingFor,
  removeLookingFor,
  onSave,
  saving,
  onCancel,
}: {
  editForm: Partial<Profile>;
  setEditForm: (form: Partial<Profile>) => void;
  newSkill: string;
  setNewSkill: (s: string) => void;
  addSkill: () => void;
  removeSkill: (s: string) => void;
  newInterest: string;
  setNewInterest: (s: string) => void;
  addInterest: () => void;
  removeInterest: (s: string) => void;
  newLookingFor: string;
  setNewLookingFor: (s: string) => void;
  addLookingFor: () => void;
  removeLookingFor: (s: string) => void;
  onSave: () => void;
  saving: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="glass rounded-2xl border border-glass-border p-6 space-y-6">
      <h2 className="text-lg font-semibold text-foreground">编辑资料</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">昵称</label>
          <Input
            value={editForm.name || ""}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            placeholder="你的昵称"
            className="bg-secondary/30"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">头衔</label>
          <Input
            value={editForm.title || ""}
            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            placeholder="如：全栈工程师、产品经理"
            className="bg-secondary/30"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">所在城市</label>
          <Input
            value={editForm.location || ""}
            onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
            placeholder="如：北京、上海"
            className="bg-secondary/30"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">经验年限</label>
          <Input
            value={editForm.experience || ""}
            onChange={(e) => setEditForm({ ...editForm, experience: e.target.value })}
            placeholder="如：5年、10年+"
            className="bg-secondary/30"
          />
        </div>
      </div>

      <div>
        <label className="text-sm text-muted-foreground mb-2 block">个人简介</label>
        <Textarea
          value={editForm.bio || ""}
          onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
          placeholder="介绍一下你自己..."
          className="bg-secondary/30 min-h-[100px]"
        />
      </div>

      {/* Skills */}
      <div>
        <label className="text-sm text-muted-foreground mb-2 block">技能标签</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {editForm.skills?.map((skill) => (
            <Badge key={skill} variant="secondary" className="bg-primary/20 text-primary">
              {skill}
              <button onClick={() => removeSkill(skill)} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            placeholder="添加技能"
            className="bg-secondary/30"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
          />
          <Button type="button" variant="outline" onClick={addSkill}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Interests */}
      <div>
        <label className="text-sm text-muted-foreground mb-2 block">感兴趣领域</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {editForm.interests?.map((interest) => (
            <Badge key={interest} variant="secondary" className="bg-accent/20 text-accent">
              {interest}
              <button onClick={() => removeInterest(interest)} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newInterest}
            onChange={(e) => setNewInterest(e.target.value)}
            placeholder="添加兴趣领域"
            className="bg-secondary/30"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addInterest())}
          />
          <Button type="button" variant="outline" onClick={addInterest}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Looking For */}
      <div>
        <label className="text-sm text-muted-foreground mb-2 block">正在寻找</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {editForm.lookingFor?.map((item) => (
            <Badge key={item} variant="secondary" className="bg-neon-cyan/20 text-neon-cyan">
              {item}
              <button onClick={() => removeLookingFor(item)} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newLookingFor}
            onChange={(e) => setNewLookingFor(e.target.value)}
            placeholder="如：技术合伙人、天使投资"
            className="bg-secondary/30"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLookingFor())}
          />
          <Button type="button" variant="outline" onClick={addLookingFor}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-glass-border">
        <Button variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button onClick={onSave} disabled={saving} className="bg-primary hover:bg-primary/90">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          保存
        </Button>
      </div>
    </div>
  );
}

// 概览标签页
function OverviewTab({ profile }: { profile: Profile }) {
  return (
    <div className="space-y-6">
      {/* Skills */}
      {profile.skills.length > 0 && (
        <div className="glass rounded-xl border border-glass-border p-6">
          <h3 className="font-semibold text-foreground mb-3">技能</h3>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((skill) => (
              <Badge key={skill} className="bg-primary/20 text-primary border-primary/30">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Interests */}
      {profile.interests.length > 0 && (
        <div className="glass rounded-xl border border-glass-border p-6">
          <h3 className="font-semibold text-foreground mb-3">感兴趣领域</h3>
          <div className="flex flex-wrap gap-2">
            {profile.interests.map((interest) => (
              <Badge key={interest} variant="outline" className="bg-secondary/30">
                {interest}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Looking For */}
      {profile.lookingFor.length > 0 && (
        <div className="glass rounded-xl border border-glass-border p-6">
          <h3 className="font-semibold text-foreground mb-3">正在寻找</h3>
          <div className="flex flex-wrap gap-2">
            {profile.lookingFor.map((item) => (
              <Badge key={item} className="bg-accent/20 text-accent border-accent/30">
                {item}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      {profile.achievements.length > 0 && (
        <div className="glass rounded-xl border border-glass-border p-6">
          <h3 className="font-semibold text-foreground mb-3">成就</h3>
          <div className="flex flex-wrap gap-2">
            {profile.achievements.map((achievement) => (
              <span
                key={achievement}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-neon-cyan/10 text-neon-cyan text-sm"
              >
                <CheckCircle2 className="h-4 w-4" />
                {achievement}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 创意标签页
function IdeasTab({ ideas, onDelete, onRefresh }: { ideas: Idea[]; onDelete: (id: string) => void; onRefresh: () => void }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个创意吗？")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/ideas?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        onDelete(id);
        toast.success("创意已删除");
      } else {
        toast.error("删除失败");
      }
    } catch {
      toast.error("删除失败");
    } finally {
      setDeleting(null);
    }
  };

  const handleTogglePublish = async (idea: Idea) => {
    setPublishing(idea.id);
    try {
      if (idea.isPublic) {
        // 取消发布
        const res = await fetch(`/api/nebula?ideaId=${idea.id}`, { method: "DELETE" });
        if (res.ok) {
          toast.success("已取消发布");
          onRefresh();
        } else {
          toast.error("取消发布失败");
        }
      } else {
        // 发布到星云
        const res = await fetch("/api/nebula", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ideaId: idea.id }),
        });
        if (res.ok) {
          toast.success("已发布到灵感星云");
          onRefresh();
        } else {
          toast.error("发布失败");
        }
      }
    } catch {
      toast.error(idea.isPublic ? "取消发布失败" : "发布失败");
    } finally {
      setPublishing(null);
    }
  };

  const viewDetail = (idea: Idea) => {
    setSelectedIdea(idea);
    setDetailOpen(true);
  };

  const canvasLabels: Record<string, string> = {
    valueProposition: "价值主张",
    customerSegments: "客户细分",
    channels: "渠道通路",
    customerRelationships: "客户关系",
    revenueStreams: "收入来源",
    keyResources: "核心资源",
    keyActivities: "关键业务",
    keyPartners: "重要伙伴",
    costStructure: "成本结构",
  };

  return (
    <div className="space-y-4">
      {ideas.length === 0 ? (
        <div className="glass rounded-xl border border-glass-border p-8 text-center">
          <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">还没有创意</p>
          <Button className="mt-4" onClick={() => router.push("/")}>
            去生成创意
          </Button>
        </div>
      ) : (
        <>
          {ideas.map((idea) => (
            <div key={idea.id} className="glass rounded-xl border border-glass-border p-4 group">
              <div className="flex items-start justify-between">
                <div className="flex-1 cursor-pointer" onClick={() => viewDetail(idea)}>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-foreground">{idea.title}</h4>
                    {idea.isPublic ? (
                      <Badge variant="outline" className="text-xs">公开</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">私有</Badge>
                    )}
                    {idea.canvas && (
                      <Badge variant="secondary" className="text-xs bg-primary/20 text-primary">有画布</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{idea.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {idea.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs bg-secondary/50">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  {idea.score && (
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{idea.score}</div>
                      <div className="text-xs text-muted-foreground">评分</div>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                    onClick={() => viewDetail(idea)}
                    title="查看详情"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity",
                      idea.isPublic
                        ? "text-primary hover:text-muted-foreground"
                        : "text-muted-foreground hover:text-primary"
                    )}
                    onClick={() => handleTogglePublish(idea)}
                    disabled={publishing === idea.id}
                    title={idea.isPublic ? "取消发布" : "发布到星云"}
                  >
                    {publishing === idea.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : idea.isPublic ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Globe className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(idea.id)}
                    disabled={deleting === idea.id}
                  >
                    {deleting === idea.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push("/generate")}
          >
            查看全部创意
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </>
      )}

      {/* 创意详情对话框 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="glass border-glass-border max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedIdea && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedIdea.title}
                  {selectedIdea.score && (
                    <Badge className="bg-primary/20 text-primary">{selectedIdea.score}分</Badge>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">描述</h4>
                  <p className="text-foreground">{selectedIdea.description}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedIdea.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>

                {selectedIdea.canvas && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">商业画布</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(selectedIdea.canvas).map(([key, value]) => (
                        <div key={key} className="p-3 rounded-lg bg-secondary/30 border border-border">
                          <div className="text-xs text-muted-foreground mb-1">{canvasLabels[key] || key}</div>
                          <div className="text-sm">{value as string}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedIdea.analysis && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">市场分析</h4>
                    <div className="space-y-3">
                      {selectedIdea.analysis.marketSize && (
                        <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                          <div className="text-xs text-muted-foreground mb-1">市场规模</div>
                          <div className="text-sm">{selectedIdea.analysis.marketSize}</div>
                        </div>
                      )}
                      {selectedIdea.analysis.targetAudience && (
                        <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                          <div className="text-xs text-muted-foreground mb-1">目标受众</div>
                          <div className="text-sm">{selectedIdea.analysis.targetAudience}</div>
                        </div>
                      )}
                      {selectedIdea.analysis.competitors && selectedIdea.analysis.competitors.length > 0 && (
                        <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                          <div className="text-xs text-muted-foreground mb-1">竞争对手</div>
                          <div className="flex flex-wrap gap-1">
                            {selectedIdea.analysis.competitors.map((c: string, i: number) => (
                              <Badge key={i} variant="outline">{c}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedIdea.analysis.opportunities && selectedIdea.analysis.opportunities.length > 0 && (
                        <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                          <div className="text-xs text-muted-foreground mb-1">机会</div>
                          <ul className="text-sm list-disc list-inside">
                            {selectedIdea.analysis.opportunities.map((o: string, i: number) => (
                              <li key={i}>{o}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {selectedIdea.analysis.recommendations && selectedIdea.analysis.recommendations.length > 0 && (
                        <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                          <div className="text-xs text-muted-foreground mb-1">建议</div>
                          <ul className="text-sm list-disc list-inside">
                            {selectedIdea.analysis.recommendations.map((r: string, i: number) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!selectedIdea.canvas && !selectedIdea.analysis && (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>该创意暂无商业画布和市场分析</p>
                    <p className="text-sm mt-1">可以在生成页面进行深入分析</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 协作申请标签页
function CollaborationsTab({
  collaborations,
  onUpdate,
}: {
  collaborations: Collaboration[];
  onUpdate: () => void;
}) {
  const [processing, setProcessing] = useState<string | null>(null);

  const handleAction = async (collaborationId: string, action: "accept" | "reject") => {
    setProcessing(collaborationId);
    try {
      const res = await fetch("/api/user/collaborations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collaborationId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        onUpdate();
      } else {
        toast.error(data.error || "操作失败");
      }
    } catch {
      toast.error("操作失败");
    } finally {
      setProcessing(null);
    }
  };

  const pendingCollaborations = collaborations.filter((c) => c.status === "pending");
  const processedCollaborations = collaborations.filter((c) => c.status !== "pending");

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* 待处理的申请 */}
      <div>
        <h3 className="text-lg font-medium mb-4">待处理 ({pendingCollaborations.length})</h3>
        {pendingCollaborations.length === 0 ? (
          <div className="glass rounded-xl border border-glass-border p-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">暂无待处理的协作申请</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingCollaborations.map((collab) => (
              <div
                key={collab.id}
                className="glass rounded-xl border border-glass-border p-4"
              >
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={collab.user.image || ""} />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {collab.user.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{collab.user.name}</h4>
                        <p className="text-sm text-muted-foreground">{collab.user.email}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(collab.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm mt-2">
                      申请加入创意：<span className="text-primary font-medium">{collab.idea.title}</span>
                    </p>
                    {collab.user.bio && (
                      <p className="text-sm text-muted-foreground mt-1">{collab.user.bio}</p>
                    )}
                    {collab.user.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {collab.user.skills.slice(0, 5).map((skill) => (
                          <Badge key={skill} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {collab.message && (
                      <div className="mt-2 p-2 rounded-lg bg-secondary/30 text-sm">
                        <span className="text-muted-foreground">留言：</span>
                        {collab.message}
                      </div>
                    )}
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={() => handleAction(collab.id, "accept")}
                        disabled={processing === collab.id}
                      >
                        {processing === collab.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                        )}
                        接受
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(collab.id, "reject")}
                        disabled={processing === collab.id}
                      >
                        <X className="h-4 w-4 mr-1" />
                        拒绝
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 已处理的申请 */}
      {processedCollaborations.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-4">已处理 ({processedCollaborations.length})</h3>
          <div className="space-y-3">
            {processedCollaborations.map((collab) => (
              <div
                key={collab.id}
                className="glass rounded-xl border border-glass-border p-3 opacity-70"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={collab.user.image || ""} />
                    <AvatarFallback className="text-xs">
                      {collab.user.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{collab.user.name}</span>
                      <span className="text-xs text-muted-foreground">申请加入</span>
                      <span className="text-sm text-primary">{collab.idea.title}</span>
                    </div>
                  </div>
                  <Badge
                    variant={collab.status === "accepted" ? "default" : "secondary"}
                    className={cn(
                      "text-xs",
                      collab.status === "accepted"
                        ? "bg-green-500/20 text-green-500"
                        : "bg-red-500/20 text-red-500"
                    )}
                  >
                    {collab.status === "accepted" ? "已接受" : "已拒绝"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 项目标签页
function ProjectsTab({ projects, onDelete }: { projects: Project[]; onDelete: (id: string) => void }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const stageLabels: Record<string, string> = {
    concept: "概念阶段",
    validation: "验证阶段",
    development: "开发阶段",
    growth: "增长阶段",
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个项目吗？")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/projects?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        onDelete(id);
        toast.success("项目已删除");
      } else {
        toast.error("删除失败");
      }
    } catch {
      toast.error("删除失败");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      {projects.length === 0 ? (
        <div className="glass rounded-xl border border-glass-border p-8 text-center">
          <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">还没有项目</p>
          <Button className="mt-4" onClick={() => router.push("/lab")}>
            去创建项目
          </Button>
        </div>
      ) : (
        <>
          {projects.map((project) => (
            <div key={project.id} className="glass rounded-xl border border-glass-border p-4 group">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-foreground">{project.name}</h4>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{stageLabels[project.stage] || project.stage}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(project.id)}
                    disabled={deleting === project.id}
                  >
                    {deleting === project.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              {project.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{project.description}</p>
              )}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-secondary/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground">{project.progress}%</span>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push("/lab")}
          >
            查看全部项目
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </>
      )}
    </div>
  );
}

// 匹配标签页
function MatchesTab({ matches }: { matches: Match[] }) {
  const router = useRouter();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const { data: session } = useSession();

  // 获取消息
  const fetchMessages = async (matchId: string, silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const res = await fetch(`/api/messages/${matchId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {
      if (!silent) toast.error("加载消息失败");
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  // 消息轮询
  useEffect(() => {
    if (chatOpen && selectedMatch) {
      // 开始轮询
      pollingRef.current = setInterval(() => {
        fetchMessages(selectedMatch.matchId, true);
      }, 3000); // 每3秒轮询一次

      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
      };
    }
  }, [chatOpen, selectedMatch]);

  // 滚动到底部
  useEffect(() => {
    if (chatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, chatOpen]);

  const openChat = async (match: Match) => {
    setSelectedMatch(match);
    setChatOpen(true);
    await fetchMessages(match.matchId);
  };

  const closeChat = () => {
    setChatOpen(false);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedMatch || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/messages/${selectedMatch.matchId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages([...messages, data.message]);
        setNewMessage("");
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      } else {
        toast.error("发送失败");
      }
    } catch {
      toast.error("发送失败");
    } finally {
      setSending(false);
    }
  };

  // 跳转到消息页面
  const goToMessages = () => {
    router.push("/messages");
  };

  return (
    <div className="space-y-4">
      {matches.length === 0 ? (
        <div className="glass rounded-xl border border-glass-border p-8 text-center">
          <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">还没有匹配</p>
          <Button className="mt-4" onClick={() => router.push("/matching")}>
            去发现合伙人
          </Button>
        </div>
      ) : (
        <>
          {matches.map((match) => (
            <div key={match.matchId} className="glass rounded-xl border border-glass-border p-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={match.user.image || ""} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {match.user.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">{match.user.name}</h4>
                  <p className="text-sm text-muted-foreground">{match.user.title}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => openChat(match)}>
                  <MessageCircle className="h-4 w-4 mr-1" />
                  发消息
                </Button>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            className="w-full"
            onClick={goToMessages}
          >
            查看全部消息
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </>
      )}

      {/* Chat Dialog */}
      <Dialog open={chatOpen} onOpenChange={closeChat}>
        <DialogContent className="glass border-glass-border max-w-md h-[500px] flex flex-col p-0">
          <DialogHeader className="p-4 border-b border-glass-border">
            <DialogTitle className="flex items-center gap-3">
              {selectedMatch && (
                <>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={selectedMatch.user.image || ""} />
                    <AvatarFallback className="bg-primary/20 text-primary text-sm">
                      {selectedMatch.user.initials}
                    </AvatarFallback>
                  </Avatar>
                  <span>{selectedMatch.user.name}</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                开始你们的对话吧
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    msg.senderId === session?.user?.id ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                      msg.senderId === session?.user?.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/50"
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-glass-border">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="输入消息..."
                className="bg-secondary/30"
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              />
              <Button
                size="icon"
                onClick={sendMessage}
                disabled={sending || !newMessage.trim()}
                className="bg-primary hover:bg-primary/90"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 设置标签页
function SettingsTab({
  profile,
  onPasswordChange,
}: {
  profile: Profile;
  onPasswordChange: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="glass rounded-xl border border-glass-border p-6">
        <h3 className="font-semibold text-foreground mb-4">账户信息</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-glass-border">
            <div>
              <p className="text-sm text-muted-foreground">邮箱</p>
              <p className="text-foreground">{profile.email}</p>
            </div>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-glass-border">
            <div>
              <p className="text-sm text-muted-foreground">注册时间</p>
              <p className="text-foreground">
                {new Date(profile.createdAt).toLocaleDateString("zh-CN")}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm text-muted-foreground">认证状态</p>
              <p className="text-foreground">
                {profile.verified ? (
                  <span className="flex items-center gap-1 text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                    已认证
                  </span>
                ) : (
                  "未认证"
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass rounded-xl border border-glass-border p-6">
        <h3 className="font-semibold text-foreground mb-4">安全设置</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-foreground">修改密码</p>
            <p className="text-sm text-muted-foreground">定期更换密码以保护账户安全</p>
          </div>
          <Button variant="outline" onClick={onPasswordChange}>
            <Lock className="h-4 w-4 mr-2" />
            修改
          </Button>
        </div>
      </div>
    </div>
  );
}

// 修改密码对话框
function PasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("请填写所有字段");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("两次输入的新密码不一致");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("新密码至少需要6个字符");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/user/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "修改失败");
      toast.success("密码修改成功");
      onOpenChange(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "修改失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-glass-border">
        <DialogHeader>
          <DialogTitle>修改密码</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">当前密码</label>
            <div className="relative">
              <Input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="输入当前密码"
                className="bg-secondary/30 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">新密码</label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="输入新密码（至少6位）"
                className="bg-secondary/30 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">确认新密码</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入新密码"
              className="bg-secondary/30"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-primary hover:bg-primary/90">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            确认修改
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
