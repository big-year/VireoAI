"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  Loader2,
  MessageCircle,
  Lightbulb,
  Crown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Group {
  id: string;
  name: string;
  role: string;
  joinedAt: string;
  idea: {
    id: string;
    title: string;
    description: string;
    author: {
      id: string;
      name: string;
      image: string | null;
    };
  };
  members: {
    id: string;
    name: string;
    image: string | null;
    role: string;
  }[];
  lastMessage: {
    content: string;
    sender: string;
    createdAt: string;
  } | null;
}

export default function GroupsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchGroups();
      fetchUnreadCounts();
    }
  }, [status]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/groups");
      if (!res.ok) throw new Error("获取失败");
      const data = await res.json();
      setGroups(data.groups);
    } catch (error) {
      console.error("获取群组失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCounts = async () => {
    try {
      const res = await fetch("/api/groups/unread");
      if (res.ok) {
        const data = await res.json();
        setUnreadCounts(data.groups || {});
      }
    } catch (error) {
      console.error("获取未读数失败:", error);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (days === 1) {
      return "昨天";
    } else if (days < 7) {
      const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
      return weekdays[date.getDay()];
    } else {
      return date.toLocaleDateString("zh-CN", {
        month: "short",
        day: "numeric",
      });
    }
  };

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Navigation />

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            协作<span className="text-primary">群组</span>
          </h1>
          <p className="text-muted-foreground">
            与志同道合的创业者一起探讨和完善创意
          </p>
        </div>

        {groups.length === 0 ? (
          <div className="glass rounded-xl border border-glass-border p-12 text-center">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">还没有加入任何群组</h3>
            <p className="text-muted-foreground mb-6">
              去灵感星云发现感兴趣的创意，申请加入协作吧！
            </p>
            <Button onClick={() => router.push("/nebula")}>
              <Lightbulb className="h-4 w-4 mr-2" />
              探索灵感星云
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => {
              const unreadCount = unreadCounts[group.id] || 0;
              return (
                <div
                  key={group.id}
                  className="glass rounded-xl border border-glass-border p-4 hover:border-primary/30 transition-colors cursor-pointer group"
                  onClick={() => router.push(`/groups/${group.id}`)}
                >
                  <div className="flex items-start gap-4">
                    {/* 群组头像 - 显示成员头像 */}
                    <div className="relative w-14 h-14 shrink-0">
                      {group.members.slice(0, 4).map((member, index) => (
                        <Avatar
                          key={member.id}
                          className={cn(
                            "h-8 w-8 absolute border-2 border-background",
                            index === 0 && "top-0 left-0",
                            index === 1 && "top-0 right-0",
                            index === 2 && "bottom-0 left-0",
                            index === 3 && "bottom-0 right-0"
                          )}
                        >
                          <AvatarImage src={member.image || ""} />
                          <AvatarFallback className="text-xs bg-primary/20 text-primary">
                            {member.name[0]}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">{group.name}</h3>
                          {group.role === "owner" && (
                            <Crown className="h-3 w-3 text-yellow-500 shrink-0" />
                          )}
                        </div>
                        {group.lastMessage && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatTime(group.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground truncate mb-2">
                        {group.idea.title}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{group.members.length} 人</span>
                          {group.lastMessage && (
                            <>
                              <span className="mx-1">·</span>
                              <MessageCircle className="h-3 w-3" />
                              <span className="truncate max-w-[150px]">
                                {group.lastMessage.sender}: {group.lastMessage.content}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {unreadCount > 0 && (
                            <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </Badge>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
