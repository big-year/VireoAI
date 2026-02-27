import OpenAI from "openai";
import prisma from "./prisma";

// AI 提供商配置类型
export type AIProviderConfig = {
  id: string;
  name: string;
  provider: string;
  apiKey: string | null;
  baseUrl: string | null;
  models: string[];
  defaultModel: string | null;
  isEnabled: boolean;
  isDefault: boolean;
};

// 默认 AI 提供商配置
export const defaultProviders = [
  {
    name: "OpenAI (ChatGPT)",
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    models: JSON.stringify([
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4-turbo",
      "gpt-3.5-turbo",
    ]),
    defaultModel: "gpt-4o-mini",
    priority: 1,
  },
  {
    name: "Anthropic (Claude)",
    provider: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    models: JSON.stringify([
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229",
    ]),
    defaultModel: "claude-3-5-sonnet-20241022",
    priority: 2,
  },
  {
    name: "DeepSeek",
    provider: "deepseek",
    baseUrl: "https://api.deepseek.com/v1",
    models: JSON.stringify(["deepseek-chat", "deepseek-coder"]),
    defaultModel: "deepseek-chat",
    priority: 3,
  },
  {
    name: "智谱 AI (GLM)",
    provider: "zhipu",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    models: JSON.stringify(["glm-4-plus", "glm-4", "glm-4-flash"]),
    defaultModel: "glm-4-flash",
    priority: 4,
  },
  {
    name: "阿里云百炼 (Qwen)",
    provider: "qwen",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    models: JSON.stringify([
      "qwen-turbo",
      "qwen-plus",
      "qwen-max",
    ]),
    defaultModel: "qwen-turbo",
    priority: 5,
  },
  {
    name: "月之暗面 (Kimi)",
    provider: "moonshot",
    baseUrl: "https://api.moonshot.cn/v1",
    models: JSON.stringify([
      "moonshot-v1-8k",
      "moonshot-v1-32k",
      "moonshot-v1-128k",
    ]),
    defaultModel: "moonshot-v1-8k",
    priority: 6,
  },
];

// 初始化默认 AI 提供商
export async function initializeDefaultProviders() {
  for (const provider of defaultProviders) {
    const existing = await prisma.aIProvider.findUnique({
      where: { provider: provider.provider },
    });

    if (!existing) {
      await prisma.aIProvider.create({
        data: provider,
      });
    }
  }
}

// 获取所有 AI 提供商
export async function getAllProviders(): Promise<AIProviderConfig[]> {
  const providers = await prisma.aIProvider.findMany({
    orderBy: { priority: "asc" },
  });

  return providers.map((p) => ({
    ...p,
    models: JSON.parse(p.models),
  }));
}

// 获取启用的 AI 提供商
export async function getEnabledProviders(): Promise<AIProviderConfig[]> {
  const providers = await prisma.aIProvider.findMany({
    where: { isEnabled: true },
    orderBy: { priority: "asc" },
  });

  return providers.map((p) => ({
    ...p,
    models: JSON.parse(p.models),
  }));
}

// 获取默认 AI 提供商
export async function getDefaultProvider(): Promise<AIProviderConfig | null> {
  const provider = await prisma.aIProvider.findFirst({
    where: { isDefault: true, isEnabled: true },
  });

  if (!provider) {
    // 如果没有默认的，返回第一个启用的
    const firstEnabled = await prisma.aIProvider.findFirst({
      where: { isEnabled: true },
      orderBy: { priority: "asc" },
    });
    if (!firstEnabled) return null;
    return {
      ...firstEnabled,
      models: JSON.parse(firstEnabled.models),
    };
  }

  return {
    ...provider,
    models: JSON.parse(provider.models),
  };
}

// 创建 AI 客户端
export async function createAIClient(providerId?: string): Promise<{
  client: OpenAI;
  model: string;
  provider: AIProviderConfig;
} | null> {
  let provider: AIProviderConfig | null;

  if (providerId) {
    const p = await prisma.aIProvider.findUnique({
      where: { id: providerId },
    });
    if (!p || !p.isEnabled || !p.apiKey) return null;
    provider = { ...p, models: JSON.parse(p.models) };
  } else {
    provider = await getDefaultProvider();
  }

  if (!provider || !provider.apiKey) return null;

  // 所有提供商都使用 OpenAI 兼容的 API
  const client = new OpenAI({
    apiKey: provider.apiKey,
    baseURL: provider.baseUrl || undefined,
  });

  return {
    client,
    model: provider.defaultModel || provider.models[0],
    provider,
  };
}

// 调用 AI 生成
export async function generateWithAI(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  options?: {
    providerId?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<{ content: string; provider: string; model: string } | null> {
  const aiClient = await createAIClient(options?.providerId);

  if (!aiClient) {
    // 回退到环境变量中的 OpenAI
    if (process.env.OPENAI_API_KEY) {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await client.chat.completions.create({
        model: options?.model || "gpt-4o-mini",
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2000,
      });
      return {
        content: completion.choices[0]?.message?.content || "",
        provider: "openai",
        model: options?.model || "gpt-4o-mini",
      };
    }
    return null;
  }

  const { client, model, provider } = aiClient;

  const completion = await client.chat.completions.create({
    model: options?.model || model,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 2000,
  });

  return {
    content: completion.choices[0]?.message?.content || "",
    provider: provider.provider,
    model: options?.model || model,
  };
}

// 流式调用 AI 生成
export async function streamWithAI(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  options?: {
    providerId?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<ReadableStream<Uint8Array> | null> {
  const aiClient = await createAIClient(options?.providerId);

  let client: OpenAI;
  let model: string;

  if (!aiClient) {
    // 回退到环境变量中的 OpenAI
    if (process.env.OPENAI_API_KEY) {
      client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      model = options?.model || "gpt-4o-mini";
    } else {
      return null;
    }
  } else {
    client = aiClient.client;
    model = options?.model || aiClient.model;
  }

  const stream = await client.chat.completions.create({
    model,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 2000,
    stream: true,
  });

  // 将 OpenAI 流转换为 Web ReadableStream
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            controller.enqueue(encoder.encode(content));
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}
