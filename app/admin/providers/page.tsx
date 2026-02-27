"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Bot,
  Key,
  Globe,
  Check,
  X,
  Plus,
  Loader2,
  Star,
  Trash2,
  Zap,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";

type AIProvider = {
  id: string;
  name: string;
  provider: string;
  apiKey: string | null;
  baseUrl: string | null;
  models: string[];
  defaultModel: string | null;
  isEnabled: boolean;
  isDefault: boolean;
  priority: number;
};

type TestResult = {
  success: boolean;
  message?: string;
  error?: string;
  latency?: number;
};

export default function ProvidersPage() {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [editingApiKey, setEditingApiKey] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newProvider, setNewProvider] = useState({
    name: "",
    provider: "",
    apiKey: "",
    baseUrl: "",
    models: "",
    defaultModel: "",
  });

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const res = await fetch("/api/admin/providers");
      const data = await res.json();

      if (res.ok) {
        setProviders(data.providers || []);
      } else {
        toast.error(data.error || "获取失败");
      }
    } catch {
      toast.error("获取 AI 提供商列表失败");
    } finally {
      setLoading(false);
    }
  };

  const updateProvider = async (
    id: string,
    updates: Partial<AIProvider> & { apiKey?: string }
  ) => {
    setSaving(id);
    try {
      const res = await fetch("/api/admin/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });

      const data = await res.json();

      if (res.ok) {
        // 如果设置为默认，更新所有提供商的 isDefault 状态
        if (updates.isDefault) {
          setProviders((prev) =>
            prev.map((p) => ({
              ...p,
              isDefault: p.id === id,
            }))
          );
          toast.success("已设为默认提供商");
        } else {
          setProviders((prev) =>
            prev.map((p) => (p.id === id ? { ...p, ...data.provider } : p))
          );
          toast.success("更新成功");
        }
      } else {
        toast.error(data.error || "更新失败");
      }
    } catch {
      toast.error("更新失败");
    } finally {
      setSaving(null);
      setEditingApiKey(null);
      setNewApiKey("");
    }
  };

  const handleToggleEnabled = (provider: AIProvider) => {
    if (saving) return; // 防止重复点击
    updateProvider(provider.id, { isEnabled: !provider.isEnabled });
  };

  const handleSetDefault = (provider: AIProvider) => {
    if (saving) return; // 防止重复点击
    if (provider.isDefault) {
      toast.info("该提供商已经是默认");
      return;
    }
    if (!provider.isEnabled) {
      toast.error("请先启用该提供商");
      return;
    }
    updateProvider(provider.id, { isDefault: true });
  };

  const addProvider = async () => {
    if (!newProvider.name || !newProvider.provider) {
      toast.error("名称和提供商标识不能为空");
      return;
    }

    setSaving("new");
    try {
      const res = await fetch("/api/admin/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newProvider,
          models: newProvider.models
            .split(",")
            .map((m) => m.trim())
            .filter(Boolean),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setProviders((prev) => [...prev, data.provider]);
        setShowAddDialog(false);
        setNewProvider({
          name: "",
          provider: "",
          apiKey: "",
          baseUrl: "",
          models: "",
          defaultModel: "",
        });
        toast.success("添加成功");
      } else {
        toast.error(data.error || "添加失败");
      }
    } catch {
      toast.error("添加失败");
    } finally {
      setSaving(null);
    }
  };

  const deleteProvider = async (id: string) => {
    if (!confirm("确定要删除这个 AI 提供商吗？")) return;

    try {
      const res = await fetch(`/api/admin/providers?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setProviders((prev) => prev.filter((p) => p.id !== id));
        toast.success("删除成功");
      } else {
        toast.error("删除失败");
      }
    } catch {
      toast.error("删除失败");
    }
  };

  const testConnection = async (provider: AIProvider) => {
    if (!provider.apiKey) {
      toast.error("请先设置 API Key");
      return;
    }

    setTesting(provider.id);
    setTestResults((prev) => {
      const newResults = { ...prev };
      delete newResults[provider.id];
      return newResults;
    });

    try {
      const res = await fetch("/api/admin/providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId: provider.id }),
      });

      const data = await res.json();
      setTestResults((prev) => ({ ...prev, [provider.id]: data }));

      if (data.success) {
        toast.success(`连接成功 (${data.latency || 0}ms)`);
      } else {
        toast.error(data.error || "连接失败");
      }
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [provider.id]: { success: false, error: "测试请求失败" },
      }));
      toast.error("测试请求失败");
    } finally {
      setTesting(null);
    }
  };

  const handleSaveApiKey = async (providerId: string) => {
    if (!newApiKey.trim()) {
      toast.error("API Key 不能为空");
      return;
    }
    await updateProvider(providerId, { apiKey: newApiKey });
  };

  const handleModelChange = async (providerId: string, model: string) => {
    await updateProvider(providerId, { defaultModel: model });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="glass rounded-xl border border-glass-border p-6">
            <div className="flex items-center gap-4 mb-4">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">AI 提供商配置</h2>
          <p className="text-sm text-muted-foreground">
            配置和管理 AI 服务提供商的 API 密钥和设置
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              添加提供商
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加自定义 AI 提供商</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>显示名称 *</Label>
                <Input
                  placeholder="例如：自定义 OpenAI"
                  value={newProvider.name}
                  onChange={(e) =>
                    setNewProvider({ ...newProvider, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>提供商标识 *</Label>
                <Input
                  placeholder="例如：custom-openai"
                  value={newProvider.provider}
                  onChange={(e) =>
                    setNewProvider({ ...newProvider, provider: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={newProvider.apiKey}
                  onChange={(e) =>
                    setNewProvider({ ...newProvider, apiKey: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>API 地址</Label>
                <Input
                  placeholder="https://api.example.com/v1"
                  value={newProvider.baseUrl}
                  onChange={(e) =>
                    setNewProvider({ ...newProvider, baseUrl: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>可用模型（逗号分隔）</Label>
                <Input
                  placeholder="gpt-4, gpt-3.5-turbo"
                  value={newProvider.models}
                  onChange={(e) =>
                    setNewProvider({ ...newProvider, models: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>默认模型</Label>
                <Input
                  placeholder="gpt-4"
                  value={newProvider.defaultModel}
                  onChange={(e) =>
                    setNewProvider({ ...newProvider, defaultModel: e.target.value })
                  }
                />
              </div>
              <Button
                className="w-full"
                onClick={addProvider}
                disabled={saving === "new"}
              >
                {saving === "new" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                添加提供商
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 提供商列表 */}
      <div className="space-y-4">
        {providers.length === 0 ? (
          <div className="text-center py-12 glass rounded-xl border border-glass-border">
            <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">暂无 AI 提供商配置</p>
            <p className="text-sm text-muted-foreground">点击上方按钮添加提供商</p>
          </div>
        ) : (
          providers.map((provider) => (
            <div
              key={provider.id}
              className="glass rounded-xl border border-glass-border p-6"
            >
              {/* 头部信息 */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Bot className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg">{provider.name}</h3>
                      {provider.isDefault && (
                        <Badge className="bg-primary/20 text-primary">
                          <Star className="h-3 w-3 mr-1" />
                          默认
                        </Badge>
                      )}
                      <Badge
                        className={
                          provider.isEnabled
                            ? "bg-green-500/20 text-green-500"
                            : "bg-secondary text-muted-foreground"
                        }
                      >
                        {provider.isEnabled ? "已启用" : "未启用"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {provider.provider}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* 删除按钮（仅自定义提供商） */}
                  {provider.priority >= 100 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteProvider(provider.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* 测试结果 */}
              {testResults[provider.id] && (
                <div
                  className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                    testResults[provider.id].success
                      ? "bg-green-500/10 text-green-500"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {testResults[provider.id].success ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>连接成功</span>
                      {testResults[provider.id].latency && (
                        <span className="text-sm opacity-75">
                          ({testResults[provider.id].latency}ms)
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" />
                      <span>{testResults[provider.id].error || "连接失败"}</span>
                    </>
                  )}
                </div>
              )}

              {/* 配置区域 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* API Key */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Key className="h-4 w-4" />
                    API Key
                  </Label>
                  {editingApiKey === provider.id ? (
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        placeholder="输入新的 API Key"
                        value={newApiKey}
                        onChange={(e) => setNewApiKey(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        size="icon"
                        onClick={() => handleSaveApiKey(provider.id)}
                        disabled={saving === provider.id}
                      >
                        {saving === provider.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingApiKey(null);
                          setNewApiKey("");
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showApiKey[provider.id] ? "text" : "password"}
                          value={provider.apiKey || "未设置"}
                          readOnly
                          className="bg-secondary/50 pr-10"
                        />
                        {provider.apiKey && (
                          <button
                            type="button"
                            onClick={() =>
                              setShowApiKey((prev) => ({
                                ...prev,
                                [provider.id]: !prev[provider.id],
                              }))
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showApiKey[provider.id] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingApiKey(provider.id)}
                      >
                        修改
                      </Button>
                    </div>
                  )}
                </div>

                {/* Base URL */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4" />
                    API 地址
                  </Label>
                  <Input
                    value={provider.baseUrl || ""}
                    placeholder="使用默认地址"
                    readOnly
                    className="bg-secondary/50"
                  />
                </div>

                {/* Default Model */}
                <div className="space-y-2">
                  <Label className="text-sm">默认模型</Label>
                  {provider.models.length > 0 ? (
                    <Select
                      value={provider.defaultModel || "select-model"}
                      onValueChange={(value) => {
                        if (value !== "select-model") {
                          handleModelChange(provider.id, value);
                        }
                      }}
                    >
                      <SelectTrigger className="bg-secondary/50">
                        <SelectValue placeholder="选择默认模型" />
                      </SelectTrigger>
                      <SelectContent>
                        {!provider.defaultModel && (
                          <SelectItem value="select-model" disabled>
                            选择默认模型
                          </SelectItem>
                        )}
                        {provider.models.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value="无可用模型"
                      readOnly
                      className="bg-secondary/50"
                    />
                  )}
                </div>

                {/* 操作按钮 */}
                <div className="space-y-2">
                  <Label className="text-sm">操作</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => testConnection(provider)}
                      disabled={testing === provider.id || !provider.apiKey}
                    >
                      {testing === provider.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Zap className="h-4 w-4 mr-2" />
                      )}
                      测试连接
                    </Button>
                  </div>
                </div>
              </div>

              {/* 底部操作栏 */}
              <div className="flex items-center justify-between pt-4 border-t border-glass-border relative z-10">
                {/* 可用模型 */}
                <div className="flex-1">
                  <Label className="text-sm mb-2 block text-muted-foreground">
                    可用模型
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {provider.models.length > 0 ? (
                      provider.models.map((model) => (
                        <Badge
                          key={model}
                          variant="secondary"
                          className={
                            model === provider.defaultModel
                              ? "bg-primary/20 text-primary"
                              : ""
                          }
                        >
                          {model}
                          {model === provider.defaultModel && " (默认)"}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        无可用模型
                      </span>
                    )}
                  </div>
                </div>

                {/* 启用/默认开关 */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`enable-${provider.id}`} className="text-sm cursor-pointer">
                      启用
                    </Label>
                    <Switch
                      id={`enable-${provider.id}`}
                      checked={provider.isEnabled}
                      onCheckedChange={(checked) => {
                        console.log("Switch toggled:", provider.id, checked);
                        handleToggleEnabled(provider);
                      }}
                      disabled={!!saving}
                    />
                  </div>
                  <Button
                    type="button"
                    variant={provider.isDefault ? "default" : "outline"}
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log("Set default clicked:", provider.id);
                      handleSetDefault(provider);
                    }}
                    disabled={provider.isDefault || !!saving}
                  >
                    {provider.isDefault ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        当前默认
                      </>
                    ) : (
                      <>
                        <Star className="h-4 w-4 mr-2" />
                        设为默认
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
