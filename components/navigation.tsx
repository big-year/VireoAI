"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Globe2,
  FlaskConical,
  MessageSquare,
  Users,
  Menu,
  X,
  LogOut,
  User,
  Bell,
  Check,
  Trash2,
  Sun,
  Moon,
  Monitor,
  Lightbulb,
  UsersRound,
  Megaphone,
} from "lucide-react";
import { AnnouncementButton } from "@/components/announcement-popup";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

const navItems = [
  {
    href: "/",
    label: "首页",
    icon: Sparkles,
    description: "AI驱动创意生成",
  },
  {
    href: "/generate",
    label: "创意工坊",
    icon: Lightbulb,
    description: "生成和分析创意",
  },
  {
    href: "/nebula",
    label: "灵感星云",
    icon: Globe2,
    description: "探索社区灵感",
  },
  {
    href: "/groups",
    label: "协作群组",
    icon: UsersRound,
    description: "团队协作交流",
  },
  {
    href: "/lab",
    label: "项目实验室",
    icon: FlaskConical,
    description: "孵化你的想法",
  },
  {
    href: "/think-tank",
    label: "智囊团",
    icon: MessageSquare,
    description: "AI专家对话",
  },
  {
    href: "/matching",
    label: "合作发现",
    icon: Users,
    description: "寻找合伙人",
  },
];

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
  fromUser: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
}

export function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session, status } = useSession();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadGroupMessages, setUnreadGroupMessages] = useState(0);

  // 防止 hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchNotifications();
      fetchUnreadMessages();
      fetchUnreadGroupMessages();
      // 每30秒刷新一次
      const interval = setInterval(() => {
        fetchNotifications();
        fetchUnreadMessages();
        fetchUnreadGroupMessages();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [session]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications?limit=10");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error("获取通知失败:", error);
    }
  };

  const fetchUnreadMessages = async () => {
    try {
      const res = await fetch("/api/messages");
      if (res.ok) {
        const data = await res.json();
        setUnreadMessages(data.unreadTotal || 0);
      }
    } catch (error) {
      console.error("获取未读消息失败:", error);
    }
  };

  const fetchUnreadGroupMessages = async () => {
    try {
      const res = await fetch("/api/groups/unread");
      if (res.ok) {
        const data = await res.json();
        setUnreadGroupMessages(data.total || 0);
      }
    } catch (error) {
      console.error("获取群组未读消息失败:", error);
    }
  };

  const markAsRead = async (id?: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { id } : { markAll: true }),
      });
      if (id) {
        setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(Math.max(0, unreadCount - 1));
      } else {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("标记已读失败:", error);
    }
  };

  const clearNotifications = async () => {
    try {
      await fetch("/api/notifications?clearAll=true", { method: "DELETE" });
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error("清空通知失败:", error);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString("zh-CN");
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-glass-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative">
                <Sparkles className="h-8 w-8 text-primary animate-glow-pulse" />
                <div className="absolute inset-0 blur-lg bg-primary/50 animate-glow-pulse" />
              </div>
              <span className="text-xl font-bold text-foreground">
                Vireo<span className="text-primary text-glow"> AI</span>
              </span>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const showBadge = item.href === "/groups" && unreadGroupMessages > 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 group",
                      isActive
                        ? "text-primary-foreground bg-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {item.label}
                      {showBadge && (
                        <span className="h-5 min-w-5 px-1 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                          {unreadGroupMessages > 99 ? "99+" : unreadGroupMessages}
                        </span>
                      )}
                    </span>
                    {isActive && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-primary rounded-full glow-border" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* User Actions */}
            <div className="hidden lg:flex items-center gap-3">
              {status === "loading" ? (
                <div className="w-8 h-8 rounded-full bg-secondary animate-pulse" />
              ) : session?.user ? (
                <>
                  {/* Announcement Button */}
                  <AnnouncementButton />

                  {/* Messages Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    onClick={() => window.location.href = "/messages"}
                  >
                    <MessageSquare className="h-5 w-5" />
                    {unreadMessages > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                        {unreadMessages > 9 ? "9+" : unreadMessages}
                      </span>
                    )}
                  </Button>

                  {/* Notification Bell */}
                  <Popover open={notificationOpen} onOpenChange={setNotificationOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="relative">
                        <Bell className="h-5 w-5" />
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="end">
                      <div className="flex items-center justify-between p-3 border-b border-border">
                        <h4 className="font-semibold">通知</h4>
                        <div className="flex items-center gap-1">
                          {unreadCount > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => markAsRead()}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              全部已读
                            </Button>
                          )}
                          {notifications.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-muted-foreground"
                              onClick={clearNotifications}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-muted-foreground">
                            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">暂无通知</p>
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className={cn(
                                "p-3 border-b border-border last:border-0 hover:bg-secondary/50 cursor-pointer transition-colors",
                                !notification.read && "bg-primary/5"
                              )}
                              onClick={() => {
                                if (!notification.read) markAsRead(notification.id);
                                if (notification.link) {
                                  setNotificationOpen(false);
                                  window.location.href = notification.link;
                                }
                              }}
                            >
                              <div className="flex items-start gap-3">
                                {notification.fromUser ? (
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={notification.fromUser.image || ""} />
                                    <AvatarFallback className="bg-primary/20 text-xs">
                                      {notification.fromUser.name?.[0] || "U"}
                                    </AvatarFallback>
                                  </Avatar>
                                ) : (
                                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                                    <Bell className="h-4 w-4 text-primary" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{notification.title}</p>
                                  {notification.content && (
                                    <p className="text-xs text-muted-foreground line-clamp-2">{notification.content}</p>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-1">{formatTime(notification.createdAt)}</p>
                                </div>
                                {!notification.read && (
                                  <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* User Menu */}
                  <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={session.user.image || ""} alt={session.user.name || ""} />
                        <AvatarFallback className="bg-primary/20">
                          {session.user.name?.[0] || session.user.email?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        {session.user.name && (
                          <p className="font-medium">{session.user.name}</p>
                        )}
                        {session.user.email && (
                          <p className="w-[200px] truncate text-sm text-muted-foreground">
                            {session.user.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        个人中心
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer text-destructive"
                      onClick={() => signOut()}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      退出登录
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                    <Link href="/login">登录</Link>
                  </Button>
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground relative overflow-hidden group"
                    asChild
                  >
                    <Link href="/register">
                      <span className="relative z-10">开始创造</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </Button>
                </>
              )}

              {/* Theme Toggle */}
              {mounted && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      {theme === "light" ? (
                        <Sun className="h-5 w-5" />
                      ) : theme === "dark" ? (
                        <Moon className="h-5 w-5" />
                      ) : (
                        <Monitor className="h-5 w-5" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setTheme("light")}>
                      <Sun className="mr-2 h-4 w-4" />
                      浅色
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("dark")}>
                      <Moon className="mr-2 h-4 w-4" />
                      深色
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("system")}>
                      <Monitor className="mr-2 h-4 w-4" />
                      跟随系统
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <nav className="absolute top-16 left-0 right-0 glass border-b border-glass-border p-4">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const showBadge = item.href === "/groups" && unreadGroupMessages > 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                      isActive
                        ? "bg-primary/20 text-primary"
                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <div className="flex-1">
                      <div className="font-medium flex items-center gap-2">
                        {item.label}
                        {showBadge && (
                          <span className="h-5 min-w-5 px-1 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                            {unreadGroupMessages > 99 ? "99+" : unreadGroupMessages}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.description}
                      </div>
                    </div>
                  </Link>
                );
              })}
              <div className="border-t border-border mt-2 pt-4 flex flex-col gap-2">
                {session?.user ? (
                  <>
                    {/* Mobile Announcements */}
                    <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary/50 hover:text-foreground">
                      <Megaphone className="h-5 w-5" />
                      <div className="flex-1">
                        <div className="font-medium">系统公告</div>
                        <div className="text-xs text-muted-foreground">
                          查看最新公告
                        </div>
                      </div>
                      <AnnouncementButton />
                    </div>
                    {/* Mobile Notifications */}
                    <div
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary/50 hover:text-foreground cursor-pointer"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setNotificationOpen(true);
                      }}
                    >
                      <div className="relative">
                        <Bell className="h-5 w-5" />
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="font-medium">通知</div>
                        <div className="text-xs text-muted-foreground">
                          {unreadCount > 0 ? `${unreadCount}条未读` : "暂无新通知"}
                        </div>
                      </div>
                    </div>
                    {/* Mobile Messages */}
                    <Link
                      href="/messages"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                    >
                      <div className="relative">
                        <MessageSquare className="h-5 w-5" />
                        {unreadMessages > 0 && (
                          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                            {unreadMessages > 9 ? "9+" : unreadMessages}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="font-medium">消息</div>
                        <div className="text-xs text-muted-foreground">
                          {unreadMessages > 0 ? `${unreadMessages}条未读` : "暂无新消息"}
                        </div>
                      </div>
                    </Link>
                    <Link
                      href="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                    >
                      <User className="h-5 w-5" />
                      <div>
                        <div className="font-medium">个人中心</div>
                        <div className="text-xs text-muted-foreground">
                          {session.user.email}
                        </div>
                      </div>
                    </Link>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-destructive"
                      onClick={() => signOut()}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      退出登录
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" className="w-full justify-start" asChild>
                      <Link href="/login">登录</Link>
                    </Button>
                    <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" asChild>
                      <Link href="/register">开始创造</Link>
                    </Button>
                  </>
                )}

                {/* Mobile Theme Toggle */}
                {mounted && (
                  <div className="border-t border-border mt-2 pt-4">
                    <div className="px-4 py-2 text-sm text-muted-foreground mb-2">主题</div>
                    <div className="flex gap-2 px-4">
                      <Button
                        variant={theme === "light" ? "default" : "outline"}
                        size="sm"
                        className="flex-1"
                        onClick={() => setTheme("light")}
                      >
                        <Sun className="h-4 w-4 mr-1" />
                        浅色
                      </Button>
                      <Button
                        variant={theme === "dark" ? "default" : "outline"}
                        size="sm"
                        className="flex-1"
                        onClick={() => setTheme("dark")}
                      >
                        <Moon className="h-4 w-4 mr-1" />
                        深色
                      </Button>
                      <Button
                        variant={theme === "system" ? "default" : "outline"}
                        size="sm"
                        className="flex-1"
                        onClick={() => setTheme("system")}
                      >
                        <Monitor className="h-4 w-4 mr-1" />
                        系统
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </nav>
        </div>
      )}

      {/* Spacer for fixed nav */}
      <div className="h-16" />
    </>
  );
}
