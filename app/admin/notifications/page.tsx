"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Search,
  MoreHorizontal,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Bell,
  Send,
  Users,
  Mail,
  Heart,
  MessageSquare,
  Handshake,
  AlertCircle,
  CheckCircle,
  Circle,
} from "lucide-react";

type NotificationData = {
  id: string;
  type: string;
  title: string;
  content: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  fromUser: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type Stats = {
  total: number;
  unread: number;
  byType: Record<string, number>;
};

type UserOption = {
  id: string;
  name: string | null;
  email: string;
};

const typeLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  system: { label: "系统", icon: <Bell className="h-3 w-3" />, color: "bg-blue-500" },
  match: { label: "匹配", icon: <Handshake className="h-3 w-3" />, color: "bg-green-500" },
  like: { label: "喜欢", icon: <Heart className="h-3 w-3" />, color: "bg-pink-500" },
  comment: { label: "评论", icon: <MessageSquare className="h-3 w-3" />, color: "bg-yellow-500" },
  collaboration: { label: "协作", icon: <Users className="h-3 w-3" />, color: "bg-purple-500" },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [stats, setStats] = useState<Stats>({ total: 0, unread: 0, byType: {} });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<"single" | "all" | "read">("single");
  const [notificationToDelete, setNotificationToDelete] = useState<NotificationData | null>(null);
  const [sending, setSending] = useState(false);

  // 发送通知表单
  const [sendForm, setSendForm] = useState({
    title: "",
    content: "",
    link: "",
    sendToAll: true,
    userIds: [] as string[],
  });
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.set("search", search);
      if (typeFilter) params.set("type", typeFilter);

      const res = await fetch(`/api/admin/notifications?${params}`);
      const data = await res.json();

      if (res.ok) {
        setNotifications(data.notifications);
        setPagination(data.pagination);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("获取通知列表失败:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, typeFilter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/users?limit=1000");
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
        })));
      }
    } catch (error) {
      console.error("获取用户列表失败:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSendNotification = async () => {
    if (!sendForm.title.trim()) return;

    setSending(true);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sendForm),
      });

      if (res.ok) {
        setShowSendDialog(false);
        setSendForm({
          title: "",
          content: "",
          link: "",
          sendToAll: true,
          userIds: [],
        });
        fetchNotifications();
      }
    } catch (error) {
      console.error("发送通知失败:", error);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    try {
      let url = "/api/admin/notifications";
      if (deleteTarget === "all") {
        url += "?clearAll=true";
      } else if (deleteTarget === "read") {
        url += "?clearRead=true";
      } else if (notificationToDelete) {
        url += `?id=${notificationToDelete.id}`;
      }

      const res = await fetch(url, { method: "DELETE" });

      if (res.ok) {
        fetchNotifications();
      }
    } catch (error) {
      console.error("删除通知失败:", error);
    } finally {
      setShowDeleteDialog(false);
      setNotificationToDelete(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTypeInfo = (type: string) => {
    return typeLabels[type] || { label: type, icon: <Bell className="h-3 w-3" />, color: "bg-gray-500" };
  };

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass border-glass-border">
          <CardHeader className="pb-2">
            <CardDescription>总通知数</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="glass border-glass-border">
          <CardHeader className="pb-2">
            <CardDescription>未读通知</CardDescription>
            <CardTitle className="text-2xl text-orange-500">{stats.unread}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="glass border-glass-border">
          <CardHeader className="pb-2">
            <CardDescription>系统通知</CardDescription>
            <CardTitle className="text-2xl">{stats.byType.system || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="glass border-glass-border">
          <CardHeader className="pb-2">
            <CardDescription>匹配通知</CardDescription>
            <CardTitle className="text-2xl">{stats.byType.match || 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* 操作栏 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索通知标题、内容或用户..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9"
          />
        </div>
        <Select
          value={typeFilter || "all"}
          onValueChange={(v) => {
            setTypeFilter(v === "all" ? "" : v);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="所有类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有类型</SelectItem>
            <SelectItem value="system">系统通知</SelectItem>
            <SelectItem value="match">匹配通知</SelectItem>
            <SelectItem value="like">喜欢通知</SelectItem>
            <SelectItem value="comment">评论通知</SelectItem>
            <SelectItem value="collaboration">协作通知</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleSearch}>搜索</Button>
        <Button
          onClick={() => {
            setShowSendDialog(true);
            fetchUsers();
          }}
        >
          <Send className="h-4 w-4 mr-2" />
          发送通知
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Trash2 className="h-4 w-4 mr-2" />
              清理
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={() => {
                setDeleteTarget("read");
                setShowDeleteDialog(true);
              }}
            >
              清理已读通知
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                setDeleteTarget("all");
                setShowDeleteDialog(true);
              }}
            >
              清理所有通知
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 通知表格 */}
      <div className="glass rounded-xl border border-glass-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-glass-border hover:bg-transparent">
              <TableHead className="w-[60px]">状态</TableHead>
              <TableHead className="w-[100px]">类型</TableHead>
              <TableHead>标题</TableHead>
              <TableHead className="w-[180px]">接收用户</TableHead>
              <TableHead className="w-[180px]">来源用户</TableHead>
              <TableHead className="w-[160px]">时间</TableHead>
              <TableHead className="w-[60px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i} className="border-glass-border">
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : notifications.length === 0 ? (
              <TableRow className="border-glass-border">
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  暂无通知数据
                </TableCell>
              </TableRow>
            ) : (
              notifications.map((notification) => {
                const typeInfo = getTypeInfo(notification.type);
                return (
                  <TableRow key={notification.id} className="border-glass-border">
                    <TableCell>
                      {notification.read ? (
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Circle className="h-4 w-4 text-primary fill-primary" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1">
                        <span className={`w-2 h-2 rounded-full ${typeInfo.color}`} />
                        {typeInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium truncate max-w-[300px]">
                          {notification.title}
                        </p>
                        {notification.content && (
                          <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                            {notification.content}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={notification.user.image || ""} />
                          <AvatarFallback className="text-xs">
                            {notification.user.name?.[0] || notification.user.email[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate max-w-[120px]">
                          {notification.user.name || notification.user.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {notification.fromUser ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={notification.fromUser.image || ""} />
                            <AvatarFallback className="text-xs">
                              {notification.fromUser.name?.[0] || notification.fromUser.email[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm truncate max-w-[120px]">
                            {notification.fromUser.name || notification.fromUser.email}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">系统</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(notification.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setNotificationToDelete(notification);
                          setDeleteTarget("single");
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            共 {pagination.total} 条记录，第 {pagination.page} / {pagination.totalPages} 页
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page >= pagination.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 发送通知对话框 */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>发送系统通知</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>通知标题 *</Label>
              <Input
                placeholder="输入通知标题"
                value={sendForm.title}
                onChange={(e) => setSendForm({ ...sendForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>通知内容</Label>
              <Textarea
                placeholder="输入通知内容（可选）"
                value={sendForm.content}
                onChange={(e) => setSendForm({ ...sendForm, content: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>跳转链接</Label>
              <Input
                placeholder="点击通知后跳转的链接（可选）"
                value={sendForm.link}
                onChange={(e) => setSendForm({ ...sendForm, link: e.target.value })}
              />
            </div>
            <div className="space-y-3">
              <Label>接收用户</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendToAll"
                  checked={sendForm.sendToAll}
                  onCheckedChange={(checked) =>
                    setSendForm({ ...sendForm, sendToAll: checked as boolean, userIds: [] })
                  }
                />
                <label htmlFor="sendToAll" className="text-sm cursor-pointer">
                  发送给所有用户
                </label>
              </div>
              {!sendForm.sendToAll && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">选择接收用户：</p>
                  {loadingUsers ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      加载用户列表...
                    </div>
                  ) : (
                    <div className="max-h-[200px] overflow-y-auto space-y-2 border rounded-lg p-2">
                      {users.map((user) => (
                        <div key={user.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={user.id}
                            checked={sendForm.userIds.includes(user.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSendForm({
                                  ...sendForm,
                                  userIds: [...sendForm.userIds, user.id],
                                });
                              } else {
                                setSendForm({
                                  ...sendForm,
                                  userIds: sendForm.userIds.filter((id) => id !== user.id),
                                });
                              }
                            }}
                          />
                          <label htmlFor={user.id} className="text-sm cursor-pointer">
                            {user.name || user.email}
                            {user.name && (
                              <span className="text-muted-foreground ml-1">({user.email})</span>
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                  {sendForm.userIds.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      已选择 {sendForm.userIds.length} 个用户
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>
              取消
            </Button>
            <Button
              onClick={handleSendNotification}
              disabled={!sendForm.title.trim() || sending || (!sendForm.sendToAll && sendForm.userIds.length === 0)}
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  发送中...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  发送
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget === "all"
                ? "确认清理所有通知"
                : deleteTarget === "read"
                ? "确认清理已读通知"
                : "确认删除通知"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget === "all"
                ? "确定要删除所有通知吗？此操作无法撤销。"
                : deleteTarget === "read"
                ? "确定要删除所有已读通知吗？此操作无法撤销。"
                : `确定要删除通知 "${notificationToDelete?.title}" 吗？`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
