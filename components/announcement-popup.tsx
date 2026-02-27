"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Megaphone, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Announcement {
  id: string;
  title: string;
  content: string;
  image: string | null;
  type: string;
  target: string;
  triggerType: string;
  createdAt: string;
}

export function AnnouncementPopup() {
  const { data: session, status } = useSession();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const checkedRef = useRef<{ login: boolean; immediate: boolean }>({ login: false, immediate: false });
  const prevStatusRef = useRef<string | null>(null);

  // 获取公告
  const fetchAnnouncements = useCallback(async (trigger: "login" | "immediate") => {
    try {
      const res = await fetch(`/api/announcements?trigger=${trigger}`);
      if (res.ok) {
        const data = await res.json();

        // 过滤掉已在 localStorage 中标记为已读的公告（针对未登录用户）
        let filteredAnnouncements = data.announcements;
        if (status !== "authenticated") {
          const readIds = JSON.parse(localStorage.getItem("readAnnouncements") || "[]");
          filteredAnnouncements = data.announcements.filter(
            (a: Announcement) => !readIds.includes(a.id)
          );
        }

        if (filteredAnnouncements.length > 0) {
          setAnnouncements(filteredAnnouncements);
          setSelectedIndex(0);
          setOpen(true);
        }
      }
    } catch (error) {
      console.error("获取公告失败:", error);
    }
  }, [status]);

  // 登录时弹窗：检测用户从未登录变为已登录
  useEffect(() => {
    // 检测状态变化：从 unauthenticated 变为 authenticated
    if (prevStatusRef.current === "unauthenticated" && status === "authenticated") {
      // 用户刚刚登录，延迟获取公告
      const timer = setTimeout(() => {
        fetchAnnouncements("login");
      }, 2000);
      return () => clearTimeout(timer);
    }

    // 页面刷新时，已登录用户也检查一次登录类型公告
    if (status === "authenticated" && !checkedRef.current.login) {
      checkedRef.current.login = true;
      const timer = setTimeout(() => {
        fetchAnnouncements("login");
      }, 2000);
      return () => clearTimeout(timer);
    }

    prevStatusRef.current = status;
  }, [status, fetchAnnouncements]);

  // 立即弹窗：页面加载后获取（针对所有用户）
  useEffect(() => {
    if (status !== "loading" && !checkedRef.current.immediate) {
      checkedRef.current.immediate = true;
      const timer = setTimeout(() => {
        fetchAnnouncements("immediate");
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [status, fetchAnnouncements]);

  // 定时轮询立即弹窗类型的公告（每60秒）
  useEffect(() => {
    if (status === "loading") return;

    const interval = setInterval(() => {
      if (!open) {
        fetchAnnouncements("immediate");
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [status, open, fetchAnnouncements]);

  const markAsRead = async (announcementId: string) => {
    try {
      if (status === "authenticated") {
        await fetch("/api/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ announcementId }),
        });
      } else {
        const readIds = JSON.parse(localStorage.getItem("readAnnouncements") || "[]");
        if (!readIds.includes(announcementId)) {
          readIds.push(announcementId);
          localStorage.setItem("readAnnouncements", JSON.stringify(readIds));
        }
      }
    } catch (error) {
      console.error("标记已读失败:", error);
    }
  };

  const handleClose = () => {
    // 标记所有公告为已读
    announcements.forEach((a) => markAsRead(a.id));
    setOpen(false);
  };

  const handleMarkCurrentAsRead = () => {
    if (announcements[selectedIndex]) {
      markAsRead(announcements[selectedIndex].id);
    }
  };

  const currentAnnouncement = announcements[selectedIndex];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
    });
  };

  if (announcements.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-4xl p-0 gap-0 overflow-hidden max-h-[85vh]">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-primary/10 to-accent/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Megaphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">系统公告</h2>
              <p className="text-sm text-muted-foreground">
                {announcements.length} 条新公告
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex h-[500px]">
          {/* 左侧公告列表 */}
          <div className="w-64 border-r bg-secondary/20 flex-shrink-0">
            <ScrollArea className="h-full">
              <div className="p-2">
                {announcements.map((announcement, index) => (
                  <button
                    key={announcement.id}
                    onClick={() => {
                      setSelectedIndex(index);
                      handleMarkCurrentAsRead();
                    }}
                    className={cn(
                      "w-full text-left p-3 rounded-lg mb-1 transition-all",
                      selectedIndex === index
                        ? "bg-primary/20 border border-primary/30"
                        : "hover:bg-secondary/50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "font-medium truncate text-sm",
                          selectedIndex === index && "text-primary"
                        )}>
                          {announcement.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(announcement.createdAt)}
                        </p>
                      </div>
                      {selectedIndex === index && (
                        <ChevronRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* 右侧公告详情 */}
          <div className="flex-1 flex flex-col min-w-0">
            {currentAnnouncement && (
              <>
                <ScrollArea className="flex-1">
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-4">
                      {currentAnnouncement.title}
                    </h3>

                    {currentAnnouncement.image && (
                      <div className="mb-6 rounded-xl overflow-hidden border bg-secondary/20 flex items-center justify-center">
                        <img
                          src={currentAnnouncement.image}
                          alt={currentAnnouncement.title}
                          className="max-w-full max-h-[300px] object-contain"
                        />
                      </div>
                    )}

                    <div
                      className="prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: currentAnnouncement.content }}
                    />
                  </div>
                </ScrollArea>

                {/* 底部操作栏 */}
                <div className="flex items-center justify-between px-6 py-4 border-t bg-secondary/10">
                  <p className="text-sm text-muted-foreground">
                    {selectedIndex + 1} / {announcements.length}
                  </p>
                  <div className="flex items-center gap-2">
                    {selectedIndex < announcements.length - 1 ? (
                      <Button
                        onClick={() => {
                          handleMarkCurrentAsRead();
                          setSelectedIndex(selectedIndex + 1);
                        }}
                      >
                        下一条
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    ) : (
                      <Button onClick={handleClose}>
                        我知道了
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 公告按钮组件，用于手动打开公告
export function AnnouncementButton() {
  const { status } = useSession();
  const [hasUnread, setHasUnread] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const fetchAllAnnouncements = useCallback(async () => {
    try {
      // 获取所有类型的公告（包括已读的，用于显示全部公告列表）
      const [loginRes, immediateRes, unreadLoginRes, unreadImmediateRes] = await Promise.all([
        fetch("/api/announcements?trigger=login&includeRead=true"),
        fetch("/api/announcements?trigger=immediate&includeRead=true"),
        fetch("/api/announcements?trigger=login"),
        fetch("/api/announcements?trigger=immediate"),
      ]);

      const allAnnouncements: Announcement[] = [];
      const unreadIds: Set<string> = new Set();

      // 收集所有公告
      if (loginRes.ok) {
        const data = await loginRes.json();
        allAnnouncements.push(...data.announcements);
      }

      if (immediateRes.ok) {
        const data = await immediateRes.json();
        data.announcements.forEach((a: Announcement) => {
          if (!allAnnouncements.find((existing) => existing.id === a.id)) {
            allAnnouncements.push(a);
          }
        });
      }

      // 收集未读公告ID
      if (unreadLoginRes.ok) {
        const data = await unreadLoginRes.json();
        data.announcements.forEach((a: Announcement) => unreadIds.add(a.id));
      }

      if (unreadImmediateRes.ok) {
        const data = await unreadImmediateRes.json();
        data.announcements.forEach((a: Announcement) => unreadIds.add(a.id));
      }

      // 未登录用户用 localStorage 过滤
      if (status !== "authenticated") {
        const readIds = JSON.parse(localStorage.getItem("readAnnouncements") || "[]");
        readIds.forEach((id: string) => unreadIds.delete(id));
      }

      setHasUnread(unreadIds.size > 0);
      setAnnouncements(allAnnouncements);
    } catch (error) {
      console.error("获取公告失败:", error);
    }
  }, [status]);

  useEffect(() => {
    if (status !== "loading") {
      fetchAllAnnouncements();
    }
  }, [status, fetchAllAnnouncements]);

  const markAsRead = async (announcementId: string) => {
    try {
      if (status === "authenticated") {
        await fetch("/api/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ announcementId }),
        });
      } else {
        const readIds = JSON.parse(localStorage.getItem("readAnnouncements") || "[]");
        if (!readIds.includes(announcementId)) {
          readIds.push(announcementId);
          localStorage.setItem("readAnnouncements", JSON.stringify(readIds));
        }
      }
    } catch (error) {
      console.error("标记已读失败:", error);
    }
  };

  const handleClose = () => {
    setOpen(false);
    fetchAllAnnouncements(); // 刷新未读状态
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
    });
  };

  const currentAnnouncement = announcements[selectedIndex];

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => {
          setSelectedIndex(0);
          setOpen(true);
        }}
      >
        <Megaphone className="h-5 w-5" />
        {hasUnread && (
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive" />
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-4xl p-0 gap-0 overflow-hidden max-h-[85vh]">
          {/* 头部 */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-primary/10 to-accent/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Megaphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">系统公告</h2>
                <p className="text-sm text-muted-foreground">
                  查看所有公告
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {announcements.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无公告</p>
              </div>
            </div>
          ) : (
            <div className="flex h-[500px]">
              {/* 左侧公告列表 */}
              <div className="w-64 border-r bg-secondary/20 flex-shrink-0">
                <ScrollArea className="h-full">
                  <div className="p-2">
                    {announcements.map((announcement, index) => (
                      <button
                        key={announcement.id}
                        onClick={() => {
                          setSelectedIndex(index);
                          markAsRead(announcement.id);
                        }}
                        className={cn(
                          "w-full text-left p-3 rounded-lg mb-1 transition-all",
                          selectedIndex === index
                            ? "bg-primary/20 border border-primary/30"
                            : "hover:bg-secondary/50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "font-medium truncate text-sm",
                              selectedIndex === index && "text-primary"
                            )}>
                              {announcement.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(announcement.createdAt)}
                            </p>
                          </div>
                          {selectedIndex === index && (
                            <ChevronRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* 右侧公告详情 */}
              <div className="flex-1 flex flex-col min-w-0">
                {currentAnnouncement && (
                  <ScrollArea className="flex-1">
                    <div className="p-6">
                      <h3 className="text-xl font-bold mb-4">
                        {currentAnnouncement.title}
                      </h3>

                      {currentAnnouncement.image && (
                        <div className="mb-6 rounded-xl overflow-hidden border bg-secondary/20 flex items-center justify-center">
                          <img
                            src={currentAnnouncement.image}
                            alt={currentAnnouncement.title}
                            className="max-w-full max-h-[300px] object-contain"
                          />
                        </div>
                      )}

                      <div
                        className="prose prose-sm dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: currentAnnouncement.content }}
                      />
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
