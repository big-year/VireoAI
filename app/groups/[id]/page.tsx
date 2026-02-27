"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Users,
  Send,
  Loader2,
  ArrowLeft,
  Info,
  Crown,
  Lightbulb,
  UserMinus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Member {
  id: string;
  name: string;
  image: string | null;
  bio: string | null;
  skills: string[];
  role: string;
  joinedAt: string;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    image: string | null;
  };
  isOwn: boolean;
}

interface Group {
  id: string;
  name: string;
  createdAt: string;
  idea: {
    id: string;
    title: string;
    description: string;
    tags: string[];
    author: {
      id: string;
      name: string;
      image: string | null;
    };
  };
  members: Member[];
  messages: Message[];
}

export default function GroupChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>("member");
  const [removingMember, setRemovingMember] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && groupId) {
      fetchGroup();
    }
  }, [status, groupId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 轮询新消息
  useEffect(() => {
    if (!groupId || status !== "authenticated") return;

    const interval = setInterval(() => {
      fetchMessages();
    }, 3000);

    return () => clearInterval(interval);
  }, [groupId, status]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchGroup = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/groups/${groupId}`);
      if (!res.ok) {
        if (res.status === 403) {
          toast.error("你不是该群组成员");
          router.push("/groups");
          return;
        }
        throw new Error("获取失败");
      }
      const data = await res.json();
      setGroup(data.group);
      setMessages(data.group.messages);
      setCurrentUserRole(data.currentUserRole);
    } catch (error) {
      console.error("获取群组失败:", error);
      toast.error("获取群组失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.group.messages);
      }
    } catch (error) {
      console.error("获取消息失败:", error);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage }),
      });

      if (!res.ok) throw new Error("发送失败");

      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
      setNewMessage("");
      inputRef.current?.focus();
    } catch (error) {
      console.error("发送消息失败:", error);
      toast.error("发送失败");
    } finally {
      setSending(false);
    }
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (!confirm(`确定要将 ${userName} 移出群组吗？`)) return;

    setRemovingMember(userId);
    try {
      const res = await fetch(`/api/groups/${groupId}/members?userId=${userId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "操作失败");
      }

      toast.success("已移出成员");
      // 更新本地成员列表
      if (group) {
        setGroup({
          ...group,
          members: group.members.filter((m) => m.id !== userId),
        });
      }
    } catch (error: any) {
      console.error("移出成员失败:", error);
      toast.error(error.message || "操作失败");
    } finally {
      setRemovingMember(null);
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
      return "昨天 " + date.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (days < 7) {
      const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
      return weekdays[date.getDay()] + " " + date.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString("zh-CN", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
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

  if (!group) {
    return (
      <main className="min-h-screen">
        <Navigation />
        <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4">
          <p className="text-muted-foreground">群组不存在</p>
          <Button onClick={() => router.push("/groups")}>返回群组列表</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      <Navigation />

      {/* Background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="sticky top-16 z-10 glass border-b border-glass-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/groups")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="font-semibold">{group.name}</h1>
                <p className="text-xs text-muted-foreground">
                  {group.members.length} 位成员
                </p>
              </div>
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Info className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>群组信息</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  {/* 创意信息 */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-primary" />
                      关联创意
                    </h3>
                    <div className="p-3 rounded-lg bg-secondary/30">
                      <h4 className="font-medium">{group.idea.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {group.idea.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {group.idea.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 成员列表 */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      成员 ({group.members.length})
                    </h3>
                    <div className="space-y-2">
                      {group.members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/30 group/member"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.image || ""} />
                            <AvatarFallback className="bg-primary/20 text-primary">
                              {member.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">
                                {member.name}
                              </span>
                              {member.role === "owner" && (
                                <Crown className="h-3 w-3 text-yellow-500" />
                              )}
                            </div>
                            {member.bio && (
                              <p className="text-xs text-muted-foreground truncate">
                                {member.bio}
                              </p>
                            )}
                          </div>
                          {/* 踢出按钮 - 只有群主可见，且不能踢出自己 */}
                          {currentUserRole === "owner" && member.role !== "owner" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover/member:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoveMember(member.id, member.name)}
                              disabled={removingMember === member.id}
                            >
                              {removingMember === member.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <UserMinus className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">还没有消息</p>
                <p className="text-sm text-muted-foreground mt-1">
                  发送第一条消息开始协作吧！
                </p>
              </div>
            ) : (
              messages.map((message, index) => {
                const showAvatar =
                  index === 0 ||
                  messages[index - 1].sender.id !== message.sender.id;
                const showTime =
                  index === 0 ||
                  new Date(message.createdAt).getTime() -
                    new Date(messages[index - 1].createdAt).getTime() >
                    5 * 60 * 1000;

                return (
                  <div key={message.id}>
                    {showTime && (
                      <div className="text-center my-4">
                        <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded">
                          {formatTime(message.createdAt)}
                        </span>
                      </div>
                    )}
                    <div
                      className={cn(
                        "flex gap-2",
                        message.isOwn ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      {showAvatar && !message.isOwn ? (
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={message.sender.image || ""} />
                          <AvatarFallback className="text-xs bg-primary/20 text-primary">
                            {message.sender.name[0]}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-8 shrink-0" />
                      )}
                      <div
                        className={cn(
                          "max-w-[70%]",
                          message.isOwn ? "items-end" : "items-start"
                        )}
                      >
                        {showAvatar && !message.isOwn && (
                          <p className="text-xs text-muted-foreground mb-1 ml-1">
                            {message.sender.name}
                          </p>
                        )}
                        <div
                          className={cn(
                            "px-3 py-2 rounded-2xl",
                            message.isOwn
                              ? "bg-primary text-primary-foreground rounded-tr-sm"
                              : "bg-secondary/50 rounded-tl-sm"
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="sticky bottom-0 glass border-t border-glass-border p-4">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="输入消息..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={sending}
            />
            <Button onClick={handleSend} disabled={!newMessage.trim() || sending}>
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
