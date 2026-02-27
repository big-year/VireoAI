"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Send,
  Loader2,
  ArrowLeft,
  Users,
  Check,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Conversation {
  matchId: string;
  otherUser: {
    id: string;
    name: string;
    image: string | null;
    title: string;
    initials: string;
  };
  lastMessage: {
    content: string;
    createdAt: string;
    isFromMe: boolean;
  } | null;
  unreadCount: number;
  updatedAt: string;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  read: boolean;
  sender: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

function MessagesPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMatchId = searchParams.get("match");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // 检测移动端视图
  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // 获取对话列表
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/messages");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations);
        return data.conversations;
      }
    } catch (error) {
      console.error("获取对话列表失败:", error);
    }
    return [];
  }, []);

  // 获取消息
  const fetchMessages = useCallback(async (matchId: string, silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const res = await fetch(`/api/messages/${matchId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        // 更新对话列表中的未读数
        setConversations(prev =>
          prev.map(c =>
            c.matchId === matchId ? { ...c, unreadCount: 0 } : c
          )
        );
      }
    } catch (error) {
      if (!silent) toast.error("加载消息失败");
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, []);

  // 初始化
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchConversations().then((convs) => {
        setLoading(false);
        // 如果 URL 中有 match 参数，自动打开对应对话
        if (initialMatchId && convs.length > 0) {
          const conv = convs.find((c: Conversation) => c.matchId === initialMatchId);
          if (conv) {
            selectConversation(conv);
          }
        }
      });
    }
  }, [status, initialMatchId]);

  // 消息轮询
  useEffect(() => {
    if (selectedConversation) {
      // 开始轮询
      pollingRef.current = setInterval(() => {
        fetchMessages(selectedConversation.matchId, true);
      }, 3000); // 每3秒轮询一次

      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
      };
    }
  }, [selectedConversation, fetchMessages]);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectConversation = async (conv: Conversation) => {
    setSelectedConversation(conv);
    setShowChat(true);
    await fetchMessages(conv.matchId);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/messages/${selectedConversation.matchId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, data.message]);
        setNewMessage("");
        // 更新对话列表中的最后消息
        setConversations(prev =>
          prev.map(c =>
            c.matchId === selectedConversation.matchId
              ? {
                  ...c,
                  lastMessage: {
                    content: newMessage,
                    createdAt: new Date().toISOString(),
                    isFromMe: true,
                  },
                  updatedAt: new Date().toISOString(),
                }
              : c
          )
        );
      } else {
        toast.error("发送失败");
      }
    } catch {
      toast.error("发送失败");
    } finally {
      setSending(false);
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

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
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
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-glow-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-glow-pulse delay-700" />
      </div>

      <Navigation />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        <div className="glass rounded-2xl border border-glass-border overflow-hidden h-[calc(100vh-8rem)]">
          <div className="flex h-full">
            {/* 对话列表 */}
            <div
              className={cn(
                "w-full md:w-80 border-r border-glass-border flex flex-col",
                isMobileView && showChat && "hidden"
              )}
            >
              <div className="p-4 border-b border-glass-border">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  消息
                </h2>
              </div>

              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <Users className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                    <p className="text-muted-foreground mb-4">还没有对话</p>
                    <Button onClick={() => router.push("/matching")}>
                      去发现合伙人
                    </Button>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.matchId}
                      onClick={() => selectConversation(conv)}
                      className={cn(
                        "flex items-center gap-3 p-4 cursor-pointer transition-colors border-b border-glass-border/50",
                        selectedConversation?.matchId === conv.matchId
                          ? "bg-primary/10"
                          : "hover:bg-secondary/50"
                      )}
                    >
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={conv.otherUser.image || ""} />
                          <AvatarFallback className="bg-primary/20 text-primary">
                            {conv.otherUser.initials}
                          </AvatarFallback>
                        </Avatar>
                        {conv.unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                            {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-foreground truncate">
                            {conv.otherUser.name}
                          </h4>
                          {conv.lastMessage && (
                            <span className="text-xs text-muted-foreground">
                              {formatTime(conv.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.lastMessage ? (
                            <>
                              {conv.lastMessage.isFromMe && "我: "}
                              {conv.lastMessage.content}
                            </>
                          ) : (
                            <span className="italic">开始对话</span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 聊天区域 */}
            <div
              className={cn(
                "flex-1 flex flex-col",
                isMobileView && !showChat && "hidden"
              )}
            >
              {selectedConversation ? (
                <>
                  {/* 聊天头部 */}
                  <div className="p-4 border-b border-glass-border flex items-center gap-3">
                    {isMobileView && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowChat(false)}
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                    )}
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedConversation.otherUser.image || ""} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {selectedConversation.otherUser.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium text-foreground">
                        {selectedConversation.otherUser.name}
                      </h3>
                      {selectedConversation.otherUser.title && (
                        <p className="text-xs text-muted-foreground">
                          {selectedConversation.otherUser.title}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 消息列表 */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {loadingMessages ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        开始你们的对话吧
                      </div>
                    ) : (
                      messages.map((msg, index) => {
                        const isMe = msg.senderId === session?.user?.id;
                        const showTime =
                          index === 0 ||
                          new Date(msg.createdAt).getTime() -
                            new Date(messages[index - 1].createdAt).getTime() >
                            300000; // 5分钟间隔显示时间

                        return (
                          <div key={msg.id}>
                            {showTime && (
                              <div className="text-center text-xs text-muted-foreground my-4">
                                {formatTime(msg.createdAt)}
                              </div>
                            )}
                            <div
                              className={cn(
                                "flex",
                                isMe ? "justify-end" : "justify-start"
                              )}
                            >
                              <div
                                className={cn(
                                  "max-w-[70%] rounded-2xl px-4 py-2",
                                  isMe
                                    ? "bg-primary text-primary-foreground rounded-br-md"
                                    : "bg-secondary/50 rounded-bl-md"
                                )}
                              >
                                <p className="text-sm whitespace-pre-wrap break-words">
                                  {msg.content}
                                </p>
                                <div
                                  className={cn(
                                    "flex items-center justify-end gap-1 mt-1",
                                    isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                                  )}
                                >
                                  <span className="text-xs">
                                    {formatMessageTime(msg.createdAt)}
                                  </span>
                                  {isMe && (
                                    msg.read ? (
                                      <CheckCheck className="h-3 w-3" />
                                    ) : (
                                      <Check className="h-3 w-3" />
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* 输入框 */}
                  <div className="p-4 border-t border-glass-border">
                    <div className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="输入消息..."
                        className="bg-secondary/30"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                      />
                      <Button
                        onClick={sendMessage}
                        disabled={sending || !newMessage.trim()}
                        className="bg-primary hover:bg-primary/90"
                      >
                        {sending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p>选择一个对话开始聊天</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// 包装组件以支持 Suspense
export default function MessagesPageWrapper() {
  return (
    <Suspense fallback={
      <main className="min-h-screen relative">
        <Navigation />
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </main>
    }>
      <MessagesPageContent />
    </Suspense>
  );
}
