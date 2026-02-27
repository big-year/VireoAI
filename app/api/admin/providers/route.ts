import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { initializeDefaultProviders } from "@/lib/ai-providers";

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

// 获取所有 AI 提供商
export async function GET() {
  try {
    const adminCheck = await checkAdmin();
    if ("error" in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    // 初始化默认提供商（如果不存在）
    await initializeDefaultProviders();

    const providers = await prisma.aIProvider.findMany({
      orderBy: { priority: "asc" },
    });

    // 隐藏 API Key 的完整值
    const safeProviders = providers.map((p) => ({
      ...p,
      apiKey: p.apiKey ? "••••••••" + p.apiKey.slice(-4) : null,
      models: JSON.parse(p.models),
    }));

    return NextResponse.json({ providers: safeProviders });
  } catch (error) {
    console.error("获取 AI 提供商错误:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// 更新 AI 提供商
export async function PUT(request: NextRequest) {
  try {
    const adminCheck = await checkAdmin();
    if ("error" in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const { id, apiKey, baseUrl, defaultModel, isEnabled, isDefault, models } =
      await request.json();

    if (!id) {
      return NextResponse.json({ error: "缺少提供商 ID" }, { status: 400 });
    }

    // 如果设置为默认，先取消其他默认
    if (isDefault) {
      await prisma.aIProvider.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const updateData: Record<string, unknown> = {};
    if (apiKey !== undefined && apiKey !== "••••••••") {
      updateData.apiKey = apiKey;
    }
    if (baseUrl !== undefined) updateData.baseUrl = baseUrl;
    if (defaultModel !== undefined) updateData.defaultModel = defaultModel;
    if (isEnabled !== undefined) updateData.isEnabled = isEnabled;
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (models !== undefined) updateData.models = JSON.stringify(models);

    const provider = await prisma.aIProvider.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      provider: {
        ...provider,
        apiKey: provider.apiKey ? "••••••••" + provider.apiKey.slice(-4) : null,
        models: JSON.parse(provider.models),
      },
    });
  } catch (error) {
    console.error("更新 AI 提供商错误:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

// 添加自定义 AI 提供商
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await checkAdmin();
    if ("error" in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const { name, provider, apiKey, baseUrl, models, defaultModel } =
      await request.json();

    if (!name || !provider) {
      return NextResponse.json(
        { error: "名称和提供商标识不能为空" },
        { status: 400 }
      );
    }

    // 检查是否已存在
    const existing = await prisma.aIProvider.findUnique({
      where: { provider },
    });

    if (existing) {
      return NextResponse.json(
        { error: "该提供商标识已存在" },
        { status: 400 }
      );
    }

    const newProvider = await prisma.aIProvider.create({
      data: {
        name,
        provider,
        apiKey,
        baseUrl,
        models: JSON.stringify(models || []),
        defaultModel,
        priority: 100,
      },
    });

    return NextResponse.json({
      provider: {
        ...newProvider,
        apiKey: newProvider.apiKey
          ? "••••••••" + newProvider.apiKey.slice(-4)
          : null,
        models: JSON.parse(newProvider.models),
      },
    });
  } catch (error) {
    console.error("添加 AI 提供商错误:", error);
    return NextResponse.json({ error: "添加失败" }, { status: 500 });
  }
}

// 删除自定义 AI 提供商
export async function DELETE(request: NextRequest) {
  try {
    const adminCheck = await checkAdmin();
    if ("error" in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "缺少提供商 ID" }, { status: 400 });
    }

    await prisma.aIProvider.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除 AI 提供商错误:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
