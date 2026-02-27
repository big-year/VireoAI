"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, X, Plus, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 编辑表单
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      checkProfile();
    }
  }, [status, router]);

  const checkProfile = async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();

        // 如果资料已完整，跳转到首页
        if (data.profile.isProfileComplete) {
          router.push("/");
          return;
        }

        // 预填充已有数据
        setName(data.profile.name || "");
        setBio(data.profile.bio || "");
        setTitle(data.profile.title || "");
        setLocation(data.profile.location || "");
        setSkills(data.profile.skills || []);
        setInterests(data.profile.interests || []);
      }
    } catch (error) {
      console.error("检查资料失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const addInterest = () => {
    if (newInterest.trim() && !interests.includes(newInterest.trim())) {
      setInterests([...interests, newInterest.trim()]);
      setNewInterest("");
    }
  };

  const removeInterest = (interest: string) => {
    setInterests(interests.filter((i) => i !== interest));
  };

  const handleSave = async () => {
    // 验证必填字段
    if (!name.trim()) {
      toast.error("请填写昵称");
      return;
    }
    if (!bio.trim()) {
      toast.error("请填写个人简介");
      return;
    }
    if (skills.length === 0) {
      toast.error("请至少添加一个技能标签");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          bio,
          title,
          location,
          skills,
          interests,
        }),
      });

      if (res.ok) {
        toast.success("资料保存成功！");
        router.push("/");
      } else {
        toast.error("保存失败，请重试");
      }
    } catch (error) {
      toast.error("保存失败，请重试");
    } finally {
      setSaving(false);
    }
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

  return (
    <main className="min-h-screen relative">
      {/* 背景效果 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-glow-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-glow-pulse delay-700" />
      </div>

      <Navigation />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12">
        {/* 标题区域 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            欢迎加入 Vireo AI
          </h1>
          <p className="text-muted-foreground">
            完善你的个人资料，让我们更好地为你匹配合伙人和提供服务
          </p>
        </div>

        {/* 表单区域 */}
        <div className="glass rounded-2xl border border-glass-border p-6 space-y-6">
          {/* 昵称 - 必填 */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              昵称 <span className="text-destructive">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="你希望别人怎么称呼你"
              className="bg-secondary/30"
            />
          </div>

          {/* 头衔 */}
          <div>
            <label className="text-sm font-medium mb-2 block">头衔/职位</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="如：全栈工程师、产品经理、创业者"
              className="bg-secondary/30"
            />
          </div>

          {/* 所在城市 */}
          <div>
            <label className="text-sm font-medium mb-2 block">所在城市</label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="如：北京、上海、深圳"
              className="bg-secondary/30"
            />
          </div>

          {/* 个人简介 - 必填 */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              个人简介 <span className="text-destructive">*</span>
            </label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="简单介绍一下你自己，你的背景、经历、正在做什么..."
              className="bg-secondary/30 min-h-[100px]"
            />
          </div>

          {/* 技能标签 - 必填 */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              技能标签 <span className="text-destructive">*</span>
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {skills.map((skill) => (
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
                placeholder="添加技能，如：React、产品设计、市场营销"
                className="bg-secondary/30"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
              />
              <Button type="button" variant="outline" onClick={addSkill} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">按回车或点击+添加</p>
          </div>

          {/* 感兴趣领域 */}
          <div>
            <label className="text-sm font-medium mb-2 block">感兴趣领域</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {interests.map((interest) => (
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
                placeholder="添加感兴趣的领域，如：AI、电商、教育"
                className="bg-secondary/30"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addInterest())}
              />
              <Button type="button" variant="outline" onClick={addInterest} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="pt-4 border-t border-glass-border">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-primary hover:bg-primary/90 h-12 text-base"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  保存中...
                </>
              ) : (
                <>
                  开始使用
                  <ArrowRight className="h-5 w-5 ml-2" />
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-3">
              带 <span className="text-destructive">*</span> 的为必填项
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
