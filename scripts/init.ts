import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

// Prisma 7 需要使用 adapter
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // 创建管理员用户
  const adminEmail = process.env.ADMIN_EMAIL || "admin@vireoai.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: "管理员",
        password: hashedPassword,
        role: "admin",
      },
    });
    console.log(`✅ 管理员账户已创建: ${adminEmail}`);
  } else {
    // 确保已存在的用户是管理员
    if (existingAdmin.role !== "admin") {
      await prisma.user.update({
        where: { email: adminEmail },
        data: { role: "admin" },
      });
      console.log(`✅ 已将 ${adminEmail} 设置为管理员`);
    } else {
      console.log(`ℹ️ 管理员账户已存在: ${adminEmail}`);
    }
  }

  // 初始化默认 AI 提供商
  const defaultProviders = [
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
      models: JSON.stringify(["qwen-turbo", "qwen-plus", "qwen-max"]),
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

  for (const provider of defaultProviders) {
    const existing = await prisma.aIProvider.findUnique({
      where: { provider: provider.provider },
    });

    if (!existing) {
      await prisma.aIProvider.create({
        data: provider,
      });
      console.log(`✅ AI 提供商已创建: ${provider.name}`);
    }
  }

  console.log("\n🎉 初始化完成！");
  console.log(`\n管理员登录信息:`);
  console.log(`  邮箱: ${adminEmail}`);
  console.log(`  密码: ${adminPassword}`);
  console.log(`\n请登录后访问 /admin 配置 AI 提供商的 API Key`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
