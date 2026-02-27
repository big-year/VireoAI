"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";

export function ProfileCompletionCheck() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const checkedRef = useRef(false);

  // 不需要检查的页面
  const excludedPaths = [
    "/login",
    "/register",
    "/admin",
    "/onboarding",
    "/setup",
    "/forgot-password",
    "/verify-email",
  ];

  useEffect(() => {
    // 排除特定页面
    if (excludedPaths.some((path) => pathname.startsWith(path))) {
      return;
    }

    // 只检查一次
    if (checkedRef.current) {
      return;
    }

    if (status === "authenticated" && session?.user) {
      checkedRef.current = true;
      checkProfile();
    }
  }, [status, session, pathname]);

  const checkProfile = async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();

        // 如果资料不完整，跳转到 onboarding 页面
        if (!data.profile.isProfileComplete) {
          router.push("/onboarding");
        }
      }
    } catch (error) {
      console.error("检查资料失败:", error);
    }
  };

  // 这个组件不渲染任何内容
  return null;
}
