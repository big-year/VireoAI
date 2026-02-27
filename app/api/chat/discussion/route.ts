import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createAIClient } from "@/lib/ai-providers";
import OpenAI from "openai";

// 专家类型定义
type Expert = {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
};

// 专家定义
const experts = [
  {
    id: "strategist",
    name: "李明",
    role: "战略顾问",
    systemPrompt: `你是李明，一位拥有20年商业咨询经验的战略顾问。你的专长是帮助创业者理清商业模式、制定增长策略、分析市场竞争格局。
你说话风格务实、直接，喜欢用具体案例来说明问题。你会从商业可行性、市场规模、竞争壁垒等角度分析问题。
在多人讨论中，你会主动提出战略层面的见解，也会对其他专家的观点进行补充或质疑。`,
  },
  {
    id: "tech",
    name: "张工",
    role: "技术顾问",
    systemPrompt: `你是张工，一位连续创业的CTO，实战派技术架构和选型专家。你的专长是技术架构设计、技术选型、MVP开发指导、技术团队搭建。
你说话风格技术范儿但不晦涩，善于用通俗的语言解释技术问题。你会从技术可行性、开发成本、扩展性等角度分析问题。
在多人讨论中，你会主动指出技术实现的难点和解决方案，也会评估其他专家提出的方案的技术可行性。`,
  },
  {
    id: "investor",
    name: "王总",
    role: "投资顾问",
    systemPrompt: `你是王总，一位早期投资人，专注于种子轮和天使轮投资。你的专长是帮助创业者打磨BP、制定融资策略、理解投资人视角。
你说话风格犀利、直接，会从投资回报的角度审视项目。你会从市场规模、团队能力、商业模式、退出路径等角度分析问题。
在多人讨论中，你会主动提出投资人关心的问题，也会对项目的估值和融资策略提出建议。`,
  },
  {
    id: "marketing",
    name: "陈姐",
    role: "营销专家",
    systemPrompt: `你是陈姐，一位大厂营销老兵，用户增长和品牌营销实操派。你的专长是用户获取、品牌建设、营销策略、增长黑客。
你说话风格接地气、实操性强，喜欢分享具体的营销案例和数据。你会从用户画像、获客成本、转化率、品牌定位等角度分析问题。
在多人讨论中，你会主动提出营销和增长方面的建议，也会评估产品的市场推广难度。`,
  },
  {
    id: "legal",
    name: "刘律",
    role: "法务顾问",
    systemPrompt: `你是刘律，一位创业法律专家，专注于股权架构和合规风险把控。你的专长是公司注册、股权设计、合同审核、知识产权、合规风险。
你说话风格严谨、专业，会提醒创业者注意法律风险。你会从合规性、法律风险、股权结构等角度分析问题。
在多人讨论中，你会主动指出可能存在的法律风险，也会对股权分配、合同条款等提出专业建议。`,
  },
];

// 主持人系统提示
const moderatorSystemPrompt = `你是一位专业的讨论主持人，负责协调多位专家进行讨论。你的职责是：
1. 引导讨论方向，确保讨论聚焦于用户的问题
2. 在适当的时候总结各位专家的观点
3. 发现讨论中的分歧点，引导专家深入讨论
4. 在需要时向用户提出问题，获取更多信息
5. 最后给出讨论纪要和行动建议

你说话风格专业、中立，善于归纳总结。`;

// 获取 AI 设置
async function getAISettings() {
  const settings = await prisma.systemSetting.findMany({
    where: {
      group: { in: ["ai", "thinkTank"] },
    },
  });

  const result: Record<string, unknown> = {
    maxTokens: 4096,
    temperature: 0.7,
    maxExperts: 0,
    maxDiscussionRounds: 0,
    defaultDiscussionRounds: 3,
  };

  settings.forEach((s) => {
    const key = s.key.split(".").pop() || s.key;
    if (s.type === "number") {
      result[key] = parseFloat(s.value);
    } else if (s.type === "boolean") {
      result[key] = s.value === "true";
    } else {
      result[key] = s.value;
    }
  });

  return result;
}

// 获取 OpenAI 客户端
async function getOpenAIClient() {
  const aiClient = await createAIClient();

  if (!aiClient) {
    throw new Error("没有可用的 AI 服务");
  }

  return {
    client: aiClient.client,
    model: aiClient.model,
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const {
      message,
      expertIds,
      mode, // "sequential" | "moderated" | "free"
      participationTiming, // "after_each_round" | "on_key_points" | "before_summary"
      conversationId,
      discussionRounds,
      projectId, // 关联的项目ID
    } = await request.json();

    if (!message || !expertIds || expertIds.length < 2) {
      return NextResponse.json(
        { error: "请选择至少2位专家" },
        { status: 400 }
      );
    }

    const aiSettings = await getAISettings();
    const { client, model } = await getOpenAIClient();

    // 检查专家数量限制
    const maxExperts = aiSettings.maxExperts as number;
    if (maxExperts > 0 && expertIds.length > maxExperts) {
      return NextResponse.json(
        { error: `最多只能选择 ${maxExperts} 位专家` },
        { status: 400 }
      );
    }

    // 获取选中的专家
    const selectedExperts = experts.filter((e) => expertIds.includes(e.id));

    // 如果有关联项目，获取项目信息
    let projectContext = "";
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { idea: true },
      });
      if (project) {
        projectContext = `
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
      }
    }

    // 创建或获取对话
    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
    }

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId: session.user.id,
          expertId: expertIds.join(","), // 存储多个专家ID
          title: message.slice(0, 50),
          projectId: projectId || null, // 关联项目
          mode: mode, // 讨论模式
        },
        include: { messages: true },
      });
    }

    // 保存用户消息
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: message,
      },
    });

    // 构建历史消息
    const historyMessages = conversation.messages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 发送开始标记
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "start", mode })}\n\n`));

          if (mode === "sequential") {
            // 轮流发言模式
            await handleSequentialMode(
              client,
              model,
              selectedExperts,
              message,
              historyMessages,
              aiSettings,
              projectContext,
              controller,
              encoder
            );
          } else if (mode === "moderated") {
            // 主持人模式
            await handleModeratedMode(
              client,
              model,
              selectedExperts,
              message,
              historyMessages,
              aiSettings,
              participationTiming,
              projectContext,
              controller,
              encoder
            );
          } else {
            // 自由讨论模式
            const rounds = discussionRounds || (aiSettings.defaultDiscussionRounds as number) || 3;
            await handleFreeMode(
              client,
              model,
              selectedExperts,
              message,
              historyMessages,
              aiSettings,
              rounds,
              projectContext,
              controller,
              encoder
            );
          }

          // 发送结束标记
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "end" })}\n\n`));

          controller.close();
        } catch (error) {
          console.error("讨论生成错误:", error);
          const errorMsg = error instanceof Error ? error.message : "讨论生成失败";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: errorMsg })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Conversation-Id": conversation.id,
      },
    });
  } catch (error) {
    console.error("多专家讨论错误:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "讨论失败" },
      { status: 500 }
    );
  }
}

// 轮流发言模式
async function handleSequentialMode(
  client: OpenAI,
  model: string,
  selectedExperts: Expert[],
  userMessage: string,
  history: { role: string; content: string }[],
  settings: Record<string, unknown>,
  projectContext: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  let previousResponses = "";

  for (let i = 0; i < selectedExperts.length; i++) {
    const expert = selectedExperts[i];

    // 发送专家开始发言的标记
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
      type: "expert_start",
      expertId: expert.id,
      expertName: expert.name,
      expertRole: expert.role
    })}\n\n`));

    // 构建该专家的上下文
    const contextPrompt = previousResponses
      ? `\n\n前面的专家已经发表了以下观点：\n${previousResponses}\n\n请在此基础上发表你的看法，可以补充、支持或提出不同意见。`
      : "";

    const messages = [
      { role: "system" as const, content: expert.systemPrompt + projectContext + contextPrompt },
      ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: userMessage },
    ];

    const stream = await client.chat.completions.create({
      model,
      messages,
      max_tokens: settings.maxTokens as number,
      temperature: settings.temperature as number,
      stream: true,
    });

    let expertResponse = "";
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "content", content })}\n\n`));
        expertResponse += content;
      }
    }

    // 发送专家结束发言的标记
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
      type: "expert_end",
      expertId: expert.id
    })}\n\n`));

    previousResponses += `\n**${expert.name}**：${expertResponse}`;
  }
}

// 主持人模式
async function handleModeratedMode(
  client: OpenAI,
  model: string,
  selectedExperts: Expert[],
  userMessage: string,
  history: { role: string; content: string }[],
  settings: Record<string, unknown>,
  participationTiming: string,
  projectContext: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  // 主持人开场
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
    type: "expert_start",
    expertId: "moderator",
    expertName: "主持人",
    expertRole: "讨论协调"
  })}\n\n`));

  const expertNames = selectedExperts.map((e: Expert) => `${e.name}（${e.role}）`).join("、");
  const openingMessages = [
    {
      role: "system" as const,
      content: moderatorSystemPrompt + projectContext,
    },
    {
      role: "user" as const,
      content: `用户提出了以下问题：\n\n"${userMessage}"\n\n参与讨论的专家有：${expertNames}\n\n请简短开场，然后邀请第一位专家发言。`,
    },
  ];

  const openingStream = await client.chat.completions.create({
    model,
    messages: openingMessages,
    max_tokens: 500,
    temperature: 0.7,
    stream: true,
  });

  let openingResponse = "";
  for await (const chunk of openingStream) {
    const content = chunk.choices[0]?.delta?.content || "";
    if (content) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "content", content })}\n\n`));
      openingResponse += content;
    }
  }

  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
    type: "expert_end",
    expertId: "moderator"
  })}\n\n`));

  // 专家轮流发言
  let discussionContext = `主持人开场：${openingResponse}`;

  for (const expert of selectedExperts) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
      type: "expert_start",
      expertId: expert.id,
      expertName: expert.name,
      expertRole: expert.role
    })}\n\n`));

    const expertMessages = [
      {
        role: "system" as const,
        content: expert.systemPrompt + projectContext + `\n\n当前讨论背景：\n${discussionContext}`,
      },
      { role: "user" as const, content: userMessage },
    ];

    const expertStream = await client.chat.completions.create({
      model,
      messages: expertMessages,
      max_tokens: settings.maxTokens as number,
      temperature: settings.temperature as number,
      stream: true,
    });

    let expertResponse = "";
    for await (const chunk of expertStream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "content", content })}\n\n`));
        expertResponse += content;
      }
    }

    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
      type: "expert_end",
      expertId: expert.id
    })}\n\n`));

    discussionContext += `\n\n${expert.name}：${expertResponse}`;
  }

  // 主持人总结
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
    type: "expert_start",
    expertId: "moderator_summary",
    expertName: "主持人",
    expertRole: "总结"
  })}\n\n`));

  const summaryMessages = [
    {
      role: "system" as const,
      content: moderatorSystemPrompt,
    },
    {
      role: "user" as const,
      content: `讨论内容：\n${discussionContext}\n\n请总结各位专家的观点，指出共识和分歧，并给出行动建议。${
        participationTiming === "before_summary"
          ? "\n\n在总结前，请先向用户提出1-2个需要确认的关键问题。"
          : ""
      }`,
    },
  ];

  const summaryStream = await client.chat.completions.create({
    model,
    messages: summaryMessages,
    max_tokens: 1000,
    temperature: 0.7,
    stream: true,
  });

  for await (const chunk of summaryStream) {
    const content = chunk.choices[0]?.delta?.content || "";
    if (content) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "content", content })}\n\n`));
    }
  }

  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
    type: "expert_end",
    expertId: "moderator_summary"
  })}\n\n`));
}

// 自由讨论模式
async function handleFreeMode(
  client: OpenAI,
  model: string,
  selectedExperts: Expert[],
  userMessage: string,
  history: { role: string; content: string }[],
  settings: Record<string, unknown>,
  rounds: number,
  projectContext: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  let discussionContext = "";

  // 检查最大轮数限制
  const maxRounds = settings.maxDiscussionRounds as number;
  if (maxRounds > 0 && rounds > maxRounds) {
    rounds = maxRounds;
  }

  for (let round = 1; round <= rounds; round++) {
    // 发送轮次标记
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
      type: "round",
      round,
      totalRounds: rounds
    })}\n\n`));

    for (const expert of selectedExperts) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        type: "expert_start",
        expertId: expert.id,
        expertName: expert.name,
        expertRole: expert.role,
        round
      })}\n\n`));

      const contextPrompt =
        round === 1
          ? ""
          : `\n\n前面的讨论内容：\n${discussionContext}\n\n这是第${round}轮讨论，请在前面讨论的基础上，进一步深入分析，可以回应其他专家的观点，提出新的见解或质疑。`;

      const expertMessages = [
        {
          role: "system" as const,
          content: expert.systemPrompt + projectContext + contextPrompt,
        },
        { role: "user" as const, content: userMessage },
      ];

      const expertStream = await client.chat.completions.create({
        model,
        messages: expertMessages,
        max_tokens: Math.floor((settings.maxTokens as number) / selectedExperts.length),
        temperature: settings.temperature as number,
        stream: true,
      });

      let expertResponse = "";
      for await (const chunk of expertStream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "content", content })}\n\n`));
          expertResponse += content;
        }
      }

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        type: "expert_end",
        expertId: expert.id
      })}\n\n`));

      discussionContext += `\n\n**${expert.name}（第${round}轮）**：${expertResponse}`;
    }
  }

  // 讨论纪要
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
    type: "expert_start",
    expertId: "summary",
    expertName: "最强秘书",
    expertRole: "讨论纪要"
  })}\n\n`));

  const summaryMessages = [
    {
      role: "system" as const,
      content: `你是"最强秘书"，一位专业高效的会议记录专家。请根据以下多位专家的讨论内容，生成一份结构化的讨论纪要，包括：
1. 核心观点汇总
2. 专家共识
3. 存在分歧的地方
4. 待确认的问题（需要用户回答）
5. 下一步行动建议`,
    },
    {
      role: "user" as const,
      content: `用户问题：${userMessage}\n\n讨论内容：${discussionContext}`,
    },
  ];

  const summaryStream = await client.chat.completions.create({
    model,
    messages: summaryMessages,
    max_tokens: 1500,
    temperature: 0.5,
    stream: true,
  });

  for await (const chunk of summaryStream) {
    const content = chunk.choices[0]?.delta?.content || "";
    if (content) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "content", content })}\n\n`));
    }
  }

  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
    type: "expert_end",
    expertId: "summary"
  })}\n\n`));
}
