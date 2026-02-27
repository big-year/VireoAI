"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  MoreHorizontal,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Star,
  Globe,
  Lock,
  Heart,
} from "lucide-react";

type IdeaData = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  score: number | null;
  isPublic: boolean;
  likes: number;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
};

type IdeaDetail = IdeaData & {
  marketSize: string | null;
  canvas: Record<string, unknown> | null;
  analysis: Record<string, unknown> | null;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<IdeaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [publicFilter, setPublicFilter] = useState("");
  const [selectedIdea, setSelectedIdea] = useState<IdeaDetail | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [ideaToDelete, setIdeaToDelete] = useState<IdeaData | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchIdeas = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.set("search", search);
      if (publicFilter) params.set("isPublic", publicFilter);

      const res = await fetch(`/api/admin/ideas?${params}`);
      const data = await res.json();

      if (res.ok) {
        setIdeas(data.ideas);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("获取创意列表失败:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, publicFilter]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePublicToggle = async (ideaId: string, isPublic: boolean) => {
    setUpdating(ideaId);
    try {
      const res = await fetch(`/api/admin/ideas/${ideaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic }),
      });

      if (res.ok) {
        setIdeas((prev) =>
          prev.map((i) => (i.id === ideaId ? { ...i, isPublic } : i))
        );
      }
    } catch (error) {
      console.error("更新创意状态失败:", error);
    } finally {
      setUpdating(null);
    }
  };

  const handleViewDetail = async (ideaId: string) => {
    try {
      const res = await fetch(`/api/admin/ideas/${ideaId}`);
      const data = await res.json();

      if (res.ok) {
        setSelectedIdea(data.idea);
        setShowDetailDialog(true);
      }
    } catch (error) {
      console.error("获取创意详情失败:", error);
    }
  };

  const handleDelete = async () => {
    if (!ideaToDelete) return;

    try {
      const res = await fetch(`/api/admin/ideas/${ideaToDelete.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setIdeas((prev) => prev.filter((i) => i.id !== ideaToDelete.id));
        setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
      }
    } catch (error) {
      console.error("删除创意失败:", error);
    } finally {
      setShowDeleteDialog(false);
      setIdeaToDelete(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* 搜索和筛选 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索创意标题或描述..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9"
          />
        </div>
        <Select
          value={publicFilter || "all"}
          onValueChange={(v) => {
            setPublicFilter(v === "all" ? "" : v);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="所有状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有状态</SelectItem>
            <SelectItem value="true">公开</SelectItem>
            <SelectItem value="false">私有</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleSearch}>搜索</Button>
      </div>

      {/* 创意表格 */}
      <div className="glass rounded-xl border border-glass-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-glass-border hover:bg-transparent">
              <TableHead className="w-[300px]">创意</TableHead>
              <TableHead>作者</TableHead>
              <TableHead className="text-center">评分</TableHead>
              <TableHead className="text-center">状态</TableHead>
              <TableHead className="text-center">点赞</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="w-[80px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i} className="border-glass-border">
                  <TableCell>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-5 w-12 mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-6 w-12 mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-8 mx-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : ideas.length === 0 ? (
              <TableRow className="border-glass-border">
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground"
                >
                  暂无创意数据
                </TableCell>
              </TableRow>
            ) : (
              ideas.map((idea) => (
                <TableRow key={idea.id} className="border-glass-border">
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium line-clamp-1">{idea.title}</p>
                      <div className="flex flex-wrap gap-1">
                        {idea.tags.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {idea.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{idea.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">
                      {idea.user.name || idea.user.email}
                    </p>
                  </TableCell>
                  <TableCell className="text-center">
                    {idea.score ? (
                      <Badge
                        variant="secondary"
                        className={
                          idea.score >= 80
                            ? "bg-green-500/20 text-green-500"
                            : idea.score >= 60
                            ? "bg-yellow-500/20 text-yellow-500"
                            : ""
                        }
                      >
                        <Star className="h-3 w-3 mr-1" />
                        {idea.score}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Switch
                        checked={idea.isPublic}
                        onCheckedChange={(checked) =>
                          handlePublicToggle(idea.id, checked)
                        }
                        disabled={updating === idea.id}
                      />
                      {idea.isPublic ? (
                        <Globe className="h-4 w-4 text-green-500" />
                      ) : (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                      <Heart className="h-3 w-3" />
                      {idea.likes}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(idea.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleViewDetail(idea.id)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          查看详情
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setIdeaToDelete(idea);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除创意
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            共 {pagination.total} 条记录，第 {pagination.page} /{" "}
            {pagination.totalPages} 页
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
              }
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
              }
              disabled={pagination.page >= pagination.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 创意详情对话框 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>创意详情</DialogTitle>
          </DialogHeader>
          {selectedIdea && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6">
                {/* 基本信息 */}
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    {selectedIdea.title}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span>作者：{selectedIdea.user.name || selectedIdea.user.email}</span>
                    <span>创建于：{formatDate(selectedIdea.createdAt)}</span>
                    {selectedIdea.score && (
                      <Badge className="bg-primary/20 text-primary">
                        <Star className="h-3 w-3 mr-1" />
                        评分 {selectedIdea.score}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">{selectedIdea.description}</p>
                </div>

                {/* 标签 */}
                <div>
                  <h4 className="text-sm font-medium mb-2">标签</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedIdea.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* 市场规模 */}
                {selectedIdea.marketSize && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">市场规模</h4>
                    <p className="text-muted-foreground">{selectedIdea.marketSize}</p>
                  </div>
                )}

                {/* 商业画布 */}
                {selectedIdea.canvas && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">商业画布</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(selectedIdea.canvas).map(([key, value]) => (
                        <div
                          key={key}
                          className="p-3 rounded-lg bg-secondary/30 border border-border"
                        >
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            {key}
                          </p>
                          <p className="text-sm">
                            {typeof value === "string" ? value : JSON.stringify(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 状态信息 */}
                <div className="flex items-center gap-6 pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    {selectedIdea.isPublic ? (
                      <>
                        <Globe className="h-4 w-4 text-green-500" />
                        <span className="text-sm">公开</span>
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">私有</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-500" />
                    <span className="text-sm">{selectedIdea.likes} 点赞</span>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除创意</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除创意 "{ideaToDelete?.title}" 吗？此操作无法撤销。
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
