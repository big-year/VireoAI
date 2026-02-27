import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateWithAI } from "@/lib/ai-providers";

// 专家角色定义
const expertPrompts: Record<string, string> = {
  strategist: `你是一位资深的商业战略顾问，拥有20年的咨询经验。你擅长：
- 商业模式设计和优化
- 市场定位和竞争策略
- 增长战略和扩张规划
- 战略风险评估
请用专业但易懂的语言回答问题，给出具体可行的建议。`,

  tech: `你是一位经验丰富的技术顾问/CTO，在多家创业公司担任过技术负责人。你擅长：
- 技术架构设计
- 技术选型和评估
- MVP 开发规划
- 技术团队搭建
请从技术可行性角度分析问题，给出实用的技术建议。`,

  investor: `你是一位资深的风险投资人，投资过多家成功的创业公司。你擅长：
- 项目估值和融资策略
- 商业计划书评估
- 投资人视角的项目分析
- 融资谈判技巧
请从投资人角度审视项目，指出优势和需要改进的地方。`,

  marketing: `你是一位营销专家/CMO，擅长增长黑客和品牌营销。你擅长：
- 用户获取策略
- 品牌定位和传播
- 社交媒体营销
- 增长实验设计
请给出具体的营销策略和执行建议。`,

  legal: `你是一位专注于创业领域的法律顾问。你擅长：
- 公司设立和股权架构
- 知识产权保护
- 合规风险评估
- 融资法律事务
请从法律角度分析问题，指出潜在风险和合规要求。`,
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const { message, expertId, conversationId } = await request.json();

    if (!message || !expertId) {
      return NextResponse.json(
        { error: "消息和专家类型不能为空" },
        { status: 400 }
      );
    }

    const systemPrompt = expertPrompts[expertId];
    if (!systemPrompt) {
      return NextResponse.json(
        { error: "无效的专家类型" },
        { status: 400 }
      );
    }

    // 获取历史消息（如果有对话ID）
    let history: { role: "user" | "assistant"; content: string }[] = [];
    let currentConversationId = conversationId;

    if (session?.user?.id) {
      if (conversationId) {
        const messages = await prisma.message.findMany({
          where: { conversationId },
          orderBy: { createdAt: "asc" },
          take: 10,
        });
        history = messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));
      } else {
        // 创建新对话
        const conversation = await prisma.conversation.create({
          data: {
            expertId,
            userId: session.user.id,
          },
        });
        currentConversationId = conversation.id;
      }
    }

    // 使用 AI 提供商系统生成
    const aiResult = await generateWithAI(
      [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: message },
      ],
      { temperature: 0.7, maxTokens: 1500 }
    );

    if (!aiResult) {
      return NextResponse.json(
        { error: "AI 服务未配置，请联系管理员" },
        { status: 500 }
      );
    }

    const reply = aiResult.content;
    if (!reply) {
      throw new Error("AI 返回内容为空");
    }

    // 保存消息（如果用户已登录）
    if (session?.user?.id && currentConversationId) {
      await prisma.message.createMany({
        data: [
          {
            role: "user",
            content: message,
            conversationId: currentConversationId,
            userId: session.user.id,
          },
          {
            role: "assistant",
            content: reply,
            conversationId: currentConversationId,
          },
        ],
      });
    }

    return NextResponse.json({
      reply,
      conversationId: currentConversationId,
      _meta: {
        provider: aiResult.provider,
        model: aiResult.model,
      },
    });
  } catch (error) {
    console.error("智囊团对话错误:", error);
    return NextResponse.json(
      { error: "对话失败，请稍后重试" },
      { status: 500 }
    );
  }
}

// 获取对话历史
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (conversationId) {
      // 获取对话信息
      const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId: session.user.id },
      });
      if (!conversation) {
        return NextResponse.json({ error: "对话不存在" }, { status: 404 });
      }
      const messages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: "asc" },
      });
      return NextResponse.json({ messages, conversation });
    } else {
      const conversations = await prisma.conversation.findMany({
        where: { userId: session.user.id },
        orderBy: { updatedAt: "desc" },
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
      });
      return NextResponse.json({ conversations });
    }
  } catch (error) {
    console.error("获取对话历史错误:", error);
    return NextResponse.json(
      { error: "获取失败" },
      { status: 500 }
    );
  }
}

// 删除对话
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json(
        { error: "对话 ID 不能为空" },
        { status: 400 }
      );
    }

    // 检查对话是否属于当前用户
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId: session.user.id },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "对话不存在" },
        { status: 404 }
      );
    }

    // 删除对话及其消息
    await prisma.message.deleteMany({
      where: { conversationId },
    });
    await prisma.conversation.delete({
      where: { id: conversationId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除对话错误:", error);
    return NextResponse.json(
      { error: "删除失败" },
      { status: 500 }
    );
  }
}
