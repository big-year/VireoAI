"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export function SetupCheck() {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // 如果已经在 setup 页面，不需要检查
    if (pathname === "/setup") {
      setChecked(true);
      return;
    }

    // 检查是否需要初始化
    const checkSetup = async () => {
      try {
        const res = await fetch("/api/setup");
        if (res.ok) {
          const data = await res.json();
          if (data.needsSetup) {
            // 需要初始化，跳转到设置页面
            router.replace("/setup");
            return;
          }
        }
      } catch (error) {
        console.error("检查初始化状态失败:", error);
      }
      setChecked(true);
    };

    checkSetup();
  }, [pathname, router]);

  // 返回 null，这个组件不渲染任何内容
  return null;
}
