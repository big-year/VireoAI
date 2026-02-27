import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// 检查管理员权限
async function checkAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "未登录", status: 401 };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== "admin") {
    return { error: "无权限", status: 403 };
  }

  return { user: session.user };
}

// 获取所有设置
export async function GET() {
  try {
    const adminCheck = await checkAdmin();
    if ("error" in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const settings = await prisma.systemSetting.findMany({
      orderBy: [{ group: "asc" }, { key: "asc" }],
    });

    // 按组分类
    const grouped: Record<string, Record<string, unknown>> = {};
    settings.forEach((setting) => {
      if (!grouped[setting.group]) {
        grouped[setting.group] = {};
      }
      let value: unknown = setting.value;
      if (setting.type === "number") {
        value = parseFloat(setting.value);
      } else if (setting.type === "boolean") {
        value = setting.value === "true";
      } else if (setting.type === "json") {
        try {
          value = JSON.parse(setting.value);
        } catch {
          value = setting.value;
        }
      }
      // 从 key 中提取实际的属性名（去掉 group. 前缀）
      const keyParts = setting.key.split(".");
      const actualKey = keyParts.length > 1 ? keyParts.slice(1).join(".") : setting.key;
      grouped[setting.group][actualKey] = value;
    });

    return NextResponse.json({ settings: grouped, raw: settings });
  } catch (error) {
    console.error("获取设置错误:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// 更新设置
export async function PUT(request: NextRequest) {
  try {
    const adminCheck = await checkAdmin();
    if ("error" in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const { settings } = await request.json();

    // 批量更新设置
    const updates = Object.entries(settings).map(
      ([key, data]: [string, unknown]) => {
        const { value, type, group, label } = data as {
          value: unknown;
          type?: string;
          group?: string;
          label?: string;
        };
        const stringValue =
          typeof value === "object" ? JSON.stringify(value) : String(value);

        return prisma.systemSetting.upsert({
          where: { key },
          update: {
            value: stringValue,
            ...(type && { type }),
            ...(group && { group }),
            ...(label && { label }),
          },
          create: {
            key,
            value: stringValue,
            type: type || "string",
            group: group || "general",
            label,
          },
        });
      }
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("更新设置错误:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
