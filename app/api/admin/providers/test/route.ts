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

// 测试 AI 提供商连接
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await checkAdmin();
    if ("error" in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const { providerId } = await request.json();

    if (!providerId) {
      return NextResponse.json(
        { error: "缺少提供商 ID" },
        { status: 400 }
      );
    }

    const provider = await prisma.aIProvider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "提供商不存在" },
        { status: 404 }
      );
    }

    if (!provider.apiKey) {
      return NextResponse.json(
        { error: "未配置 API Key" },
        { status: 400 }
      );
    }

    // 根据不同提供商测试连接
    let testUrl = "";
    let headers: Record<string, string> = {};
    let body: string | undefined;

    const baseUrl = provider.baseUrl || getDefaultBaseUrl(provider.provider);

    switch (provider.provider) {
      case "openai":
        testUrl = `${baseUrl}/models`;
        headers = {
          Authorization: `Bearer ${provider.apiKey}`,
        };
        break;

      case "anthropic":
        testUrl = `${baseUrl}/messages`;
        headers = {
          "x-api-key": provider.apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        };
        body = JSON.stringify({
          model: provider.defaultModel || "claude-3-haiku-20240307",
          max_tokens: 1,
          messages: [{ role: "user", content: "Hi" }],
        });
        break;

      case "deepseek":
        testUrl = `${baseUrl}/models`;
        headers = {
          Authorization: `Bearer ${provider.apiKey}`,
        };
        break;

      case "zhipu":
        testUrl = `${baseUrl}/chat/completions`;
        headers = {
          Authorization: `Bearer ${provider.apiKey}`,
          "Content-Type": "application/json",
        };
        body = JSON.stringify({
          model: provider.defaultModel || "glm-4-flash",
          messages: [{ role: "user", content: "Hi" }],
          max_tokens: 1,
        });
        break;

      default:
        // 通用 OpenAI 兼容接口测试
        testUrl = `${baseUrl}/models`;
        headers = {
          Authorization: `Bearer ${provider.apiKey}`,
        };
    }

    const startTime = Date.now();
    const response = await fetch(testUrl, {
      method: body ? "POST" : "GET",
      headers,
      body,
    });
    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        success: false,
        error: `API 返回错误: ${response.status}`,
        details: errorText,
        latency,
      });
    }

    return NextResponse.json({
      success: true,
      message: "连接成功",
      latency,
    });
  } catch (error) {
    console.error("测试 AI 提供商连接错误:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "连接失败",
    });
  }
}

function getDefaultBaseUrl(provider: string): string {
  switch (provider) {
    case "openai":
      return "https://api.openai.com/v1";
    case "anthropic":
      return "https://api.anthropic.com/v1";
    case "deepseek":
      return "https://api.deepseek.com/v1";
    case "zhipu":
      return "https://open.bigmodel.cn/api/paas/v4";
    default:
      return "";
  }
}
