"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  Image as ImageIcon,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface Announcement {
  id: string;
  title: string;
  content: string;
  image: string | null;
  type: string;
  target: string;
  triggerType: string;
  priority: number;
  isActive: boolean;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
  readCount: number;
}

const defaultAnnouncement = {
  title: "",
  content: "",
  image: "",
  type: "popup",
  target: "all",
  triggerType: "login",
  priority: 0,
  isActive: true,
  startAt: "",
  endAt: "",
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(defaultAnnouncement);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch("/api/admin/announcements");
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements);
      }
    } catch (error) {
      console.error("获取公告失败:", error);
      toast.error("获取公告失败");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingId(null);
    setFormData(defaultAnnouncement);
    setDialogOpen(true);
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      image: announcement.image || "",
      type: announcement.type,
      target: announcement.target,
      triggerType: announcement.triggerType,
      priority: announcement.priority,
      isActive: announcement.isActive,
      startAt: announcement.startAt ? announcement.startAt.slice(0, 16) : "",
      endAt: announcement.endAt ? announcement.endAt.slice(0, 16) : "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error("请输入公告标题");
      return;
    }
    if (!formData.content.trim()) {
      toast.error("请输入公告内容");
      return;
    }

    setSaving(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const body = editingId ? { ...formData, id: editingId } : formData;

      const res = await fetch("/api/admin/announcements", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(editingId ? "公告已更新" : "公告已创建");
        setDialogOpen(false);
        fetchAnnouncements();
      } else {
        toast.error("保存失败");
      }
    } catch (error) {
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这条公告吗？")) return;

    try {
      const res = await fetch(`/api/admin/announcements?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("公告已删除");
        fetchAnnouncements();
      } else {
        toast.error("删除失败");
      }
    } catch (error) {
      toast.error("删除失败");
    }
  };

  const handleToggleActive = async (announcement: Announcement) => {
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: announcement.id,
          ...announcement,
          isActive: !announcement.isActive,
        }),
      });

      if (res.ok) {
        toast.success(announcement.isActive ? "公告已停用" : "公告已启用");
        fetchAnnouncements();
      }
    } catch (error) {
      toast.error("操作失败");
    }
  };

  const getTargetLabel = (target: string) => {
    switch (target) {
      case "all":
        return "所有用户";
      case "loggedIn":
        return "已登录用户";
      case "guest":
        return "未登录用户";
      default:
        return target;
    }
  };

  const getTriggerLabel = (trigger: string) => {
    switch (trigger) {
      case "login":
        return "登录时弹窗";
      case "immediate":
        return "立即弹窗";
      case "manual":
        return "手动触发";
      default:
        return trigger;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("zh-CN");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">公告管理</h2>
          <p className="text-muted-foreground mt-1">
            创建和管理系统公告，支持弹窗展示
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          新建公告
        </Button>
      </div>

      <Card className="glass border-glass-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            公告列表
          </CardTitle>
          <CardDescription>
            共 {announcements.length} 条公告
          </CardDescription>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无公告</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>标题</TableHead>
                  <TableHead>目标用户</TableHead>
                  <TableHead>触发方式</TableHead>
                  <TableHead>优先级</TableHead>
                  <TableHead>已读数</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((announcement) => (
                  <TableRow key={announcement.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {announcement.image && (
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium">{announcement.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getTargetLabel(announcement.target)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getTriggerLabel(announcement.triggerType)}
                      </Badge>
                    </TableCell>
                    <TableCell>{announcement.priority}</TableCell>
                    <TableCell>{announcement.readCount}</TableCell>
                    <TableCell>
                      <Switch
                        checked={announcement.isActive}
                        onCheckedChange={() => handleToggleActive(announcement)}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(announcement.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setFormData({
                              title: announcement.title,
                              content: announcement.content,
                              image: announcement.image || "",
                              type: announcement.type,
                              target: announcement.target,
                              triggerType: announcement.triggerType,
                              priority: announcement.priority,
                              isActive: announcement.isActive,
                              startAt: announcement.startAt || "",
                              endAt: announcement.endAt || "",
                            });
                            setPreviewOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(announcement)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDelete(announcement.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 编辑/创建对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "编辑公告" : "新建公告"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>公告标题 *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="输入公告标题"
              />
            </div>

            <div className="space-y-2">
              <Label>公告内容 *</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="输入公告内容，支持 HTML 格式"
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                支持 HTML 格式，如 &lt;b&gt;加粗&lt;/b&gt;、&lt;a href=&quot;...&quot;&gt;链接&lt;/a&gt;
              </p>
            </div>

            <div className="space-y-2">
              <Label>公告图片</Label>
              <div className="space-y-3">
                {formData.image && (
                  <div className="relative inline-block">
                    <img
                      src={formData.image}
                      alt="预览"
                      className="max-h-40 rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={() => setFormData({ ...formData, image: "" })}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      setUploading(true);
                      try {
                        const formDataUpload = new FormData();
                        formDataUpload.append("file", file);

                        const res = await fetch("/api/admin/upload", {
                          method: "POST",
                          body: formDataUpload,
                        });

                        if (res.ok) {
                          const data = await res.json();
                          setFormData({ ...formData, image: data.url });
                          toast.success("图片上传成功");
                        } else {
                          const data = await res.json();
                          toast.error(data.error || "上传失败");
                        }
                      } catch (error) {
                        toast.error("上传失败");
                      } finally {
                        setUploading(false);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    上传图片
                  </Button>
                  <span className="text-sm text-muted-foreground">或</span>
                  <Input
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="输入图片链接"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  支持 JPG、PNG、GIF、WebP 格式，最大 5MB
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>目标用户</Label>
                <Select
                  value={formData.target}
                  onValueChange={(value) => setFormData({ ...formData, target: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有用户</SelectItem>
                    <SelectItem value="loggedIn">已登录用户</SelectItem>
                    <SelectItem value="guest">未登录用户</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>触发方式</Label>
                <Select
                  value={formData.triggerType}
                  onValueChange={(value) => setFormData({ ...formData, triggerType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="login">登录时弹窗</SelectItem>
                    <SelectItem value="immediate">立即弹窗</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  登录时弹窗：用户登录后显示；立即弹窗：在线用户立即看到
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>优先级</Label>
                <Input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  placeholder="数字越大越优先"
                />
              </div>

              <div className="space-y-2 flex items-end">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label>启用公告</Label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>开始时间</Label>
                <Input
                  type="datetime-local"
                  value={formData.startAt}
                  onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">留空表示立即生效</p>
              </div>

              <div className="space-y-2">
                <Label>结束时间</Label>
                <Input
                  type="datetime-local"
                  value={formData.endAt}
                  onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">留空表示永不过期</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 预览对话框 */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{formData.title}</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {formData.image && (
              <div className="mb-4 rounded-lg overflow-hidden border bg-secondary/20 flex items-center justify-center">
                <img
                  src={formData.image}
                  alt={formData.title}
                  className="max-w-full max-h-[300px] object-contain"
                />
              </div>
            )}

            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: formData.content }}
            />
          </div>

          <DialogFooter>
            <Button onClick={() => setPreviewOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
