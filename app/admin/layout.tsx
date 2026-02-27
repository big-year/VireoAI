"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Users,
  Lightbulb,
  Bot,
  Settings,
  Sparkles,
  LogOut,
  ArrowLeft,
  Loader2,
  X,
  Bell,
  Megaphone,
} from "lucide-react";
import { signOut } from "next-auth/react";

const navItems = [
  {
    title: "仪表盘",
    icon: LayoutDashboard,
    href: "/admin/dashboard",
  },
  {
    title: "用户管理",
    icon: Users,
    href: "/admin/users",
  },
  {
    title: "创意管理",
    icon: Lightbulb,
    href: "/admin/ideas",
  },
  {
    title: "公告管理",
    icon: Megaphone,
    href: "/admin/announcements",
  },
  {
    title: "通知管理",
    icon: Bell,
    href: "/admin/notifications",
  },
  {
    title: "AI 提供商",
    icon: Bot,
    href: "/admin/providers",
  },
  {
    title: "系统设置",
    icon: Settings,
    href: "/admin/settings",
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      checkAdminRole();
    }
  }, [status, router]);

  const checkAdminRole = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.status === 403) {
        setIsAdmin(false);
      } else {
        setIsAdmin(true);
      }
    } catch {
      setIsAdmin(false);
    }
  };

  if (status === "loading" || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
        </div>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
        </div>
        <X className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold">无权限访问</h1>
        <p className="text-muted-foreground">您没有管理员权限</p>
        <Button asChild>
          <Link href="/">返回首页</Link>
        </Button>
      </div>
    );
  }

  return (
    <SidebarProvider>
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <Sidebar className="border-r border-glass-border">
        <SidebarHeader className="p-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg group-hover:text-primary transition-colors">
                Vireo AI
              </h1>
              <p className="text-xs text-muted-foreground">管理后台</p>
            </div>
          </Link>
        </SidebarHeader>

        <Separator className="mx-4 w-auto bg-glass-border" />

        <SidebarContent className="p-2">
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.title}
                >
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="p-4">
          <Separator className="mb-4 bg-glass-border" />
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-9 w-9">
              <AvatarImage src={session?.user?.image || ""} />
              <AvatarFallback className="bg-primary/20 text-primary">
                {session?.user?.name?.[0] || session?.user?.email?.[0] || "A"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {session?.user?.name || "管理员"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {session?.user?.email}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              asChild
            >
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回前台
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="relative z-10">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-glass-border bg-background/80 backdrop-blur-sm px-6 lg:px-8">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold">
              {navItems.find((item) => item.href === pathname)?.title ||
                "管理后台"}
            </h2>
          </div>
        </header>
        <main className="flex-1 p-6 lg:p-8 xl:p-10">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
