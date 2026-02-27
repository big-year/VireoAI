"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  Settings,
  Globe,
  Bot,
  Users,
  Save,
  Loader2,
  CheckCircle,
  RotateCcw,
  Mail,
  Eye,
  EyeOff,
  Send,
  Wrench,
  Brain,
} from "lucide-react";
import { toast } from "sonner";

type SettingsGroup = {
  [key: string]: string | number | boolean;
};

type AllSettings = {
  general?: SettingsGroup;
  ai?: SettingsGroup;
  user?: SettingsGroup;
  email?: SettingsGroup;
  thinkTank?: SettingsGroup;
};

const defaultSettings: AllSettings = {
  general: {
    siteName: "Vireo AI",
    siteDescription: "AI驱动的创意生成与创业者社交平台",
    siteUrl: "",
  },
  ai: {
    defaultGenerateCount: 3,
    maxTokens: 4096,
    temperature: 0.7,
    enableStreaming: true,
  },
  user: {
    allowRegistration: true,
    defaultRole: "user",
    requireEmailVerification: false,
    maxIdeasPerDay: 10,
  },
  email: {
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPassword: "",
    smtpFrom: "",
    smtpFromName: "",
    smtpSecure: false,
  },
  thinkTank: {
    maxExperts: 0, // 0 表示不限制
    maxDiscussionRounds: 0, // 0 表示不限制
    defaultDiscussionRounds: 3,
  },
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<AllSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [showPassword, setShowPassword] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [initingGroups, setInitingGroups] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();

      if (res.ok && data.settings) {
        setSettings({
          general: { ...defaultSettings.general, ...data.settings.general },
          ai: { ...defaultSettings.ai, ...data.settings.ai },
          user: { ...defaultSettings.user, ...data.settings.user },
          email: { ...defaultSettings.email, ...data.settings.email },
          thinkTank: { ...defaultSettings.thinkTank, ...data.settings.thinkTank },
        });
      }
    } catch (error) {
      console.error("获取设置失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    try {
      // 将设置转换为 API 需要的格式
      const settingsToSave: Record<string, { value: unknown; type: string; group: string }> = {};

      Object.entries(settings).forEach(([group, groupSettings]) => {
        if (groupSettings) {
          Object.entries(groupSettings).forEach(([key, value]) => {
            const fullKey = `${group}.${key}`;
            settingsToSave[fullKey] = {
              value,
              type: typeof value === "boolean" ? "boolean" : typeof value === "number" ? "number" : "string",
              group,
            };
          });
        }
      });

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: settingsToSave }),
      });

      if (res.ok) {
        setSaved(true);
        toast.success("设置已保存");
        setTimeout(() => setSaved(false), 3000);
      } else {
        toast.error("保存失败");
      }
    } catch (error) {
      console.error("保存设置失败:", error);
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm("确定要重置所有设置为默认值吗？")) {
      setSettings(defaultSettings);
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    try {
      const res = await fetch("/api/admin/settings/test-email", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("邮件服务连接成功");
      } else {
        toast.error(data.error || "邮件服务连接失败");
      }
    } catch (error) {
      toast.error("测试失败");
    } finally {
      setTestingEmail(false);
    }
  };

  const handleInitGroups = async () => {
    setInitingGroups(true);
    try {
      const res = await fetch("/api/admin/init-groups", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.error || "初始化失败");
      }
    } catch (error) {
      toast.error("初始化失败");
    } finally {
      setInitingGroups(false);
    }
  };

  const updateSetting = (group: keyof AllSettings, key: string, value: unknown) => {
    setSettings((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [key]: value,
      },
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">系统设置</h2>
          <p className="text-muted-foreground mt-1">
            配置站点基础信息、AI 参数和用户设置
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="lg" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            重置
          </Button>
          <Button size="lg" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : saved ? (
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saved ? "已保存" : "保存设置"}
          </Button>
        </div>
      </div>

      {/* 设置标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-3xl grid-cols-6 h-12">
          <TabsTrigger value="general" className="gap-2 text-sm">
            <Globe className="h-4 w-4" />
            基础
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2 text-sm">
            <Bot className="h-4 w-4" />
            AI
          </TabsTrigger>
          <TabsTrigger value="thinkTank" className="gap-2 text-sm">
            <Brain className="h-4 w-4" />
            智囊团
          </TabsTrigger>
          <TabsTrigger value="user" className="gap-2 text-sm">
            <Users className="h-4 w-4" />
            用户
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2 text-sm">
            <Mail className="h-4 w-4" />
            邮件
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-2 text-sm">
            <Wrench className="h-4 w-4" />
            维护
          </TabsTrigger>
        </TabsList>

        {/* 基础设置 */}
        <TabsContent value="general" className="mt-8">
          <Card className="glass border-glass-border">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Globe className="h-5 w-5 text-primary" />
                基础设置
              </CardTitle>
              <CardDescription className="text-base">
                配置站点的基本信息
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-3">
                <Label htmlFor="siteName" className="text-base">站点名称</Label>
                <Input
                  id="siteName"
                  value={settings.general?.siteName as string || ""}
                  onChange={(e) => updateSetting("general", "siteName", e.target.value)}
                  placeholder="Vireo AI"
                  className="h-11"
                />
                <p className="text-sm text-muted-foreground">
                  显示在浏览器标签和页面标题中
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="siteDescription" className="text-base">站点描述</Label>
                <Input
                  id="siteDescription"
                  value={settings.general?.siteDescription as string || ""}
                  onChange={(e) => updateSetting("general", "siteDescription", e.target.value)}
                  placeholder="AI驱动的创意生成平台"
                  className="h-11"
                />
                <p className="text-sm text-muted-foreground">
                  用于 SEO 和社交分享
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="siteUrl" className="text-base">站点 URL</Label>
                <Input
                  id="siteUrl"
                  value={settings.general?.siteUrl as string || ""}
                  onChange={(e) => updateSetting("general", "siteUrl", e.target.value)}
                  placeholder="https://vireoai.example.com"
                  className="h-11"
                />
                <p className="text-sm text-muted-foreground">
                  用于生成分享链接和邮件通知
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI 设置 */}
        <TabsContent value="ai" className="mt-8">
          <Card className="glass border-glass-border">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Bot className="h-5 w-5 text-primary" />
                AI 设置
              </CardTitle>
              <CardDescription className="text-base">
                配置 AI 生成的默认参数
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-3">
                <Label htmlFor="defaultGenerateCount" className="text-base">默认生成数量</Label>
                <div className="flex items-center gap-6">
                  <Slider
                    id="defaultGenerateCount"
                    value={[settings.ai?.defaultGenerateCount as number || 3]}
                    onValueChange={([value]) => updateSetting("ai", "defaultGenerateCount", value)}
                    min={1}
                    max={10}
                    step={1}
                    className="flex-1"
                  />
                  <span className="w-12 text-center font-semibold text-lg">
                    {settings.ai?.defaultGenerateCount || 3}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  每次生成创意的默认数量
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="maxTokens" className="text-base">最大 Token 数</Label>
                <div className="flex items-center gap-6">
                  <Slider
                    id="maxTokens"
                    value={[settings.ai?.maxTokens as number || 4096]}
                    onValueChange={([value]) => updateSetting("ai", "maxTokens", value)}
                    min={1024}
                    max={8192}
                    step={256}
                    className="flex-1"
                  />
                  <span className="w-20 text-center font-semibold text-lg">
                    {settings.ai?.maxTokens || 4096}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  AI 响应的最大 Token 数量
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="temperature" className="text-base">温度参数</Label>
                <div className="flex items-center gap-6">
                  <Slider
                    id="temperature"
                    value={[(settings.ai?.temperature as number || 0.7) * 100]}
                    onValueChange={([value]) => updateSetting("ai", "temperature", value / 100)}
                    min={0}
                    max={100}
                    step={5}
                    className="flex-1"
                  />
                  <span className="w-16 text-center font-semibold text-lg">
                    {(settings.ai?.temperature as number || 0.7).toFixed(2)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  控制生成内容的随机性，值越高越有创意
                </p>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-1">
                  <Label className="text-base">启用流式输出</Label>
                  <p className="text-sm text-muted-foreground">
                    实时显示 AI 生成的内容
                  </p>
                </div>
                <Switch
                  checked={settings.ai?.enableStreaming as boolean || false}
                  onCheckedChange={(checked) => updateSetting("ai", "enableStreaming", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 用户设置 */}
        <TabsContent value="user" className="mt-8">
          <Card className="glass border-glass-border">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Users className="h-5 w-5 text-primary" />
                用户设置
              </CardTitle>
              <CardDescription className="text-base">
                配置用户注册和权限相关设置
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="flex items-center justify-between py-2">
                <div className="space-y-1">
                  <Label className="text-base">允许注册</Label>
                  <p className="text-sm text-muted-foreground">
                    是否允许新用户注册账户
                  </p>
                </div>
                <Switch
                  checked={settings.user?.allowRegistration as boolean || false}
                  onCheckedChange={(checked) => updateSetting("user", "allowRegistration", checked)}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-1">
                  <Label className="text-base">邮箱验证</Label>
                  <p className="text-sm text-muted-foreground">
                    注册后是否需要验证邮箱
                  </p>
                </div>
                <Switch
                  checked={settings.user?.requireEmailVerification as boolean || false}
                  onCheckedChange={(checked) => updateSetting("user", "requireEmailVerification", checked)}
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="maxIdeasPerDay" className="text-base">每日创意限制</Label>
                <div className="flex items-center gap-6">
                  <Slider
                    id="maxIdeasPerDay"
                    value={[settings.user?.maxIdeasPerDay as number || 10]}
                    onValueChange={([value]) => updateSetting("user", "maxIdeasPerDay", value)}
                    min={1}
                    max={50}
                    step={1}
                    className="flex-1"
                  />
                  <span className="w-12 text-center font-semibold text-lg">
                    {settings.user?.maxIdeasPerDay || 10}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  普通用户每天可生成的创意数量上限
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="defaultRole" className="text-base">默认用户角色</Label>
                <Input
                  id="defaultRole"
                  value={settings.user?.defaultRole as string || "user"}
                  onChange={(e) => updateSetting("user", "defaultRole", e.target.value)}
                  placeholder="user"
                  className="h-11"
                />
                <p className="text-sm text-muted-foreground">
                  新注册用户的默认角色
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 智囊团设置 */}
        <TabsContent value="thinkTank" className="mt-8">
          <Card className="glass border-glass-border">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Brain className="h-5 w-5 text-primary" />
                智囊团设置
              </CardTitle>
              <CardDescription className="text-base">
                配置智囊团多专家讨论功能的参数
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-3">
                <Label htmlFor="maxExperts" className="text-base">最大专家数量</Label>
                <div className="flex items-center gap-6">
                  <Slider
                    id="maxExperts"
                    value={[settings.thinkTank?.maxExperts as number || 0]}
                    onValueChange={([value]) => updateSetting("thinkTank", "maxExperts", value)}
                    min={0}
                    max={5}
                    step={1}
                    className="flex-1"
                  />
                  <span className="w-16 text-center font-semibold text-lg">
                    {(settings.thinkTank?.maxExperts as number) === 0 ? "不限" : settings.thinkTank?.maxExperts}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  用户在多专家讨论中可选择的最大专家数量，0 表示不限制（最多5个）
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="maxDiscussionRounds" className="text-base">最大讨论轮数</Label>
                <div className="flex items-center gap-6">
                  <Slider
                    id="maxDiscussionRounds"
                    value={[settings.thinkTank?.maxDiscussionRounds as number || 0]}
                    onValueChange={([value]) => updateSetting("thinkTank", "maxDiscussionRounds", value)}
                    min={0}
                    max={10}
                    step={1}
                    className="flex-1"
                  />
                  <span className="w-16 text-center font-semibold text-lg">
                    {(settings.thinkTank?.maxDiscussionRounds as number) === 0 ? "不限" : settings.thinkTank?.maxDiscussionRounds}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  自由讨论模式下专家讨论的最大轮数，0 表示不限制
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="defaultDiscussionRounds" className="text-base">默认讨论轮数</Label>
                <div className="flex items-center gap-6">
                  <Slider
                    id="defaultDiscussionRounds"
                    value={[settings.thinkTank?.defaultDiscussionRounds as number || 3]}
                    onValueChange={([value]) => updateSetting("thinkTank", "defaultDiscussionRounds", value)}
                    min={1}
                    max={10}
                    step={1}
                    className="flex-1"
                  />
                  <span className="w-12 text-center font-semibold text-lg">
                    {settings.thinkTank?.defaultDiscussionRounds || 3}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  自由讨论模式下的默认讨论轮数
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 邮件设置 */}
        <TabsContent value="email" className="mt-8">
          <Card className="glass border-glass-border">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Mail className="h-5 w-5 text-primary" />
                邮件设置
              </CardTitle>
              <CardDescription className="text-base">
                配置 SMTP 邮件服务，用于发送密码重置、通知等邮件
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="smtpHost" className="text-base">SMTP 服务器</Label>
                  <Input
                    id="smtpHost"
                    value={settings.email?.smtpHost as string || ""}
                    onChange={(e) => updateSetting("email", "smtpHost", e.target.value)}
                    placeholder="smtp.example.com"
                    className="h-11"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="smtpPort" className="text-base">端口</Label>
                  <Input
                    id="smtpPort"
                    type="number"
                    value={settings.email?.smtpPort as number || 587}
                    onChange={(e) => updateSetting("email", "smtpPort", parseInt(e.target.value) || 587)}
                    placeholder="587"
                    className="h-11"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="smtpUser" className="text-base">用户名</Label>
                  <Input
                    id="smtpUser"
                    value={settings.email?.smtpUser as string || ""}
                    onChange={(e) => updateSetting("email", "smtpUser", e.target.value)}
                    placeholder="user@example.com"
                    className="h-11"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="smtpPassword" className="text-base">密码</Label>
                  <div className="relative">
                    <Input
                      id="smtpPassword"
                      type={showPassword ? "text" : "password"}
                      value={settings.email?.smtpPassword as string || ""}
                      onChange={(e) => updateSetting("email", "smtpPassword", e.target.value)}
                      placeholder="••••••••"
                      className="pr-10 h-11"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="smtpFrom" className="text-base">发件人邮箱</Label>
                  <Input
                    id="smtpFrom"
                    value={settings.email?.smtpFrom as string || ""}
                    onChange={(e) => updateSetting("email", "smtpFrom", e.target.value)}
                    placeholder="noreply@example.com"
                    className="h-11"
                  />
                  <p className="text-sm text-muted-foreground">
                    留空则使用用户名作为发件人
                  </p>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="smtpFromName" className="text-base">发件人名称</Label>
                  <Input
                    id="smtpFromName"
                    value={settings.email?.smtpFromName as string || ""}
                    onChange={(e) => updateSetting("email", "smtpFromName", e.target.value)}
                    placeholder="Vireo AI"
                    className="h-11"
                  />
                  <p className="text-sm text-muted-foreground">
                    留空则使用站点名称
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-1">
                  <Label className="text-base">使用 SSL/TLS</Label>
                  <p className="text-sm text-muted-foreground">
                    端口 465 通常需要开启，587 通常不需要
                  </p>
                </div>
                <Switch
                  checked={settings.email?.smtpSecure as boolean || false}
                  onCheckedChange={(checked) => updateSetting("email", "smtpSecure", checked)}
                />
              </div>

              <div className="pt-6 border-t">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleTestEmail}
                  disabled={testingEmail || !settings.email?.smtpHost || !settings.email?.smtpUser}
                >
                  {testingEmail ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  测试连接
                </Button>
                <p className="text-sm text-muted-foreground mt-3">
                  请先保存设置，然后测试连接
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 系统维护 */}
        <TabsContent value="maintenance" className="mt-8">
          <Card className="glass border-glass-border">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Wrench className="h-5 w-5 text-primary" />
                系统维护
              </CardTitle>
              <CardDescription className="text-base">
                系统维护和数据修复工具
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-6 rounded-xl border border-glass-border bg-secondary/20">
                  <div>
                    <h4 className="font-semibold text-lg">初始化协作群组</h4>
                    <p className="text-muted-foreground mt-2">
                      为所有已公开但没有群组的创意创建协作群组
                    </p>
                  </div>
                  <Button
                    onClick={handleInitGroups}
                    disabled={initingGroups}
                    size="lg"
                  >
                    {initingGroups ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Users className="h-4 w-4 mr-2" />
                    )}
                    初始化群组
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
