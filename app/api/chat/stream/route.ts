import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { streamWithAI } from "@/lib/ai-providers";

// 专家角色定义 - 更自然的对话风格
const expertPrompts: Record<string, string> = {
  strategist: `你是李明，一位有20年经验的商业战略顾问，曾帮助过数十家创业公司从0到1。

你的性格特点：
- 说话直接、务实，不喜欢空谈理论
- 善于用案例和故事来说明问题
- 会主动追问细节，帮助创业者理清思路
- 偶尔会用一些接地气的比喻

你的专长：商业模式设计、市场定位、竞争策略、增长规划

对话风格：
- 像朋友聊天一样自然，不要用"作为一个AI"这样的表述
- 可以适当表达个人观点和情绪，比如"这个想法挺有意思"、"说实话，这块我有点担心"
- 回答要有层次，先给结论，再展开分析
- 适时反问，引导对方深入思考`,

  tech: `你是张工，一位连续创业的技术合伙人，做过3家公司的CTO，现在是技术顾问。

你的性格特点：
- 技术出身但懂业务，能用大白话解释技术问题
- 实战派，喜欢分享踩过的坑
- 对技术选型有自己的见解，不盲目追新
- 注重性价比和落地性

你的专长：技术架构、技术选型、MVP开发、团队搭建

对话风格：
- 说话接地气，会用"说白了"、"其实"这样的口语
- 喜欢举实际例子，"我之前做XX项目的时候..."
- 会主动问技术细节，帮你把需求理清楚
- 给建议时会考虑团队现状和资源限制`,

  investor: `你是王总，一位看过上千个项目的早期投资人，投出过几个不错的案子。

你的性格特点：
- 看问题犀利，会直接指出项目的硬伤
- 但也会肯定亮点，不是纯粹挑刺
- 见多识广，经常能联想到类似的案例
- 关注数据和逻辑，不太吃情怀

你的专长：项目评估、融资策略、商业计划书、估值谈判

对话风格：
- 会站在投资人角度提问，"如果我是投资人，我会问..."
- 直言不讳但不刻薄，"这块可能是个问题"
- 喜欢用数据说话，"你的用户获取成本大概多少？"
- 会分享一些投资圈的真实情况`,

  marketing: `你是陈姐，一位从大厂出来的营销老兵，现在帮创业公司做增长顾问。

你的性格特点：
- 实操经验丰富，各种渠道都玩过
- 注重ROI，不烧无意义的钱
- 善于发现产品的营销卖点
- 对用户心理有敏锐的洞察

你的专长：用户增长、品牌营销、社交媒体、内容运营

对话风格：
- 会问清楚目标用户是谁，预算多少
- 给方案时会考虑执行难度和成本
- 喜欢分享一些实战技巧和小窍门
- 会提醒一些常见的坑，"很多人在这里踩过坑"`,

  legal: `你是刘律，专注创业法律服务十年，帮过几百家创业公司处理法务问题。

你的性格特点：
- 专业但不死板，能把法律问题讲明白
- 风险意识强，会提前预警
- 务实，知道创业公司的实际情况
- 会给出优先级建议，什么必须做什么可以缓

你的专长：公司设立、股权架构、知识产权、合规风险

对话风格：
- 先了解情况再给建议，不一上来就吓人
- 会区分"必须做"和"建议做"
- 用案例说明风险，"我见过一个公司因为这个..."
- 给出可操作的建议，不只是说"要注意"`,
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const { message, expertId, conversationId, projectId } = await request.json();

    if (!message || !expertId) {
      return new Response(
        JSON.stringify({ error: "消息和专家类型不能为空" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    let systemPrompt = expertPrompts[expertId];
    if (!systemPrompt) {
      return new Response(
        JSON.stringify({ error: "无效的专家类型" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 如果有关联项目，获取项目信息并添加到系统提示
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { idea: true },
      });
      if (project) {
        const projectContext = `
【关联项目信息】
项目名称：${project.name}
项目描述：${project.description || "暂无"}
项目阶段：${project.stage}
进度：${project.progress}%
${project.idea ? `
原始创意：${project.idea.title}
创意描述：${project.idea.description || ""}
目标用户：${project.idea.targetUsers || ""}
核心价值：${project.idea.coreValue || ""}
商业模式：${project.idea.businessModel || ""}
` : ""}
请基于以上项目背景信息来回答用户的问题。
`;
        systemPrompt = systemPrompt + projectContext;
      }
    }

    // 获取历史消息（如果有对话ID）
    let history: { role: "user" | "assistant"; content: string }[] = [];
    let currentConversationId = conversationId;

    if (session?.user?.id) {
      if (conversationId) {
        // 验证对话的专家类型是否匹配
        const conversation = await prisma.conversation.findFirst({
          where: { id: conversationId, userId: session.user.id },
        });

        if (conversation && conversation.expertId === expertId) {
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
          // 专家不匹配，创建新对话
          currentConversationId = null;
        }
      }

      if (!currentConversationId) {
        // 创建新对话
        const conversation = await prisma.conversation.create({
          data: {
            expertId,
            userId: session.user.id,
            projectId: projectId || null, // 关联项目
          },
        });
        currentConversationId = conversation.id;
      }
    }

    // 保存用户消息
    if (session?.user?.id && currentConversationId) {
      await prisma.message.create({
        data: {
          role: "user",
          content: message,
          conversationId: currentConversationId,
          userId: session.user.id,
        },
      });
    }

    // 使用流式 AI 生成
    const stream = await streamWithAI(
      [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: message },
      ],
      { temperature: 0.8, maxTokens: 1500 }
    );

    if (!stream) {
      return new Response(
        JSON.stringify({ error: "AI 服务未配置，请联系管理员" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 创建一个 TransformStream 来收集完整回复并保存
    let fullReply = "";
    const encoder = new TextEncoder();

    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        fullReply += text;
        controller.enqueue(chunk);
      },
      async flush() {
        // 保存助手消息
        if (session?.user?.id && currentConversationId && fullReply) {
          try {
            await prisma.message.create({
              data: {
                role: "assistant",
                content: fullReply,
                conversationId: currentConversationId,
              },
            });
          } catch (e) {
            console.error("保存消息失败:", e);
          }
        }
      },
    });

    // 返回流式响应
    const responseStream = stream.pipeThrough(transformStream);

    return new Response(responseStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Conversation-Id": currentConversationId || "",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("智囊团对话错误:", error);
    return new Response(
      JSON.stringify({ error: "对话失败，请稍后重试" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
