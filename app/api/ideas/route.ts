import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateWithAI } from "@/lib/ai-providers";

// 生成创意的 prompt
const generatePrompt = (keywords: string) => `
你是一个专业的创业顾问和商业分析师。根据用户提供的关键词，生成3个创新的创业点子。

关键词: ${keywords}

请为每个创业点子提供以下信息（用JSON格式返回）:
{
  "ideas": [
    {
      "title": "创业点子名称",
      "description": "详细描述（2-3句话）",
      "tags": ["标签1", "标签2", "标签3"],
      "marketSize": "预估市场规模（如：百亿级、千亿级）",
      "score": 85,
      "targetUsers": "目标用户群体",
      "competitors": "主要竞争对手",
      "uniqueValue": "独特价值主张"
    }
  ]
}

要求：
1. 创意要具有创新性和可行性
2. 评分要客观合理
3. 只返回JSON，不要其他内容
`;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const { keywords, save, singleIdea } = await request.json();

    // 如果是保存单个创意
    if (singleIdea && session?.user?.id) {
      const idea = await prisma.idea.create({
        data: {
          title: singleIdea.title,
          description: singleIdea.description,
          tags: JSON.stringify(singleIdea.tags),
          marketSize: singleIdea.marketSize,
          score: singleIdea.score,
          canvas: singleIdea.canvas ? JSON.stringify(singleIdea.canvas) : null,
          analysis: singleIdea.analysis ? JSON.stringify(singleIdea.analysis) : null,
          userId: session.user.id,
        },
      });
      return NextResponse.json({ success: true, idea: { id: idea.id } });
    }

    if (!keywords) {
      return NextResponse.json(
        { error: "请输入关键词" },
        { status: 400 }
      );
    }

    // 使用 AI 提供商系统生成
    const aiResult = await generateWithAI(
      [
        {
          role: "system",
          content: "你是一个专业的创业顾问，擅长发现商业机会和创新点子。",
        },
        {
          role: "user",
          content: generatePrompt(keywords),
        },
      ],
      { temperature: 0.8, maxTokens: 2000 }
    );

    if (!aiResult) {
      return NextResponse.json(
        { error: "AI 服务未配置，请联系管理员" },
        { status: 500 }
      );
    }

    const content = aiResult.content;
    if (!content) {
      throw new Error("AI 返回内容为空");
    }

    // 解析 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("无法解析 AI 返回的内容");
    }

    const result = JSON.parse(jsonMatch[0]);

    // 如果用户已登录且要求保存
    if (session?.user?.id && save) {
      for (const idea of result.ideas) {
        await prisma.idea.create({
          data: {
            title: idea.title,
            description: idea.description,
            tags: JSON.stringify(idea.tags),
            marketSize: idea.marketSize,
            score: idea.score,
            userId: session.user.id,
          },
        });
      }
    }

    return NextResponse.json({
      ...result,
      _meta: {
        provider: aiResult.provider,
        model: aiResult.model,
      },
    });
  } catch (error) {
    console.error("生成创意错误:", error);
    return NextResponse.json(
      { error: "生成失败，请稍后重试" },
      { status: 500 }
    );
  }
}

// 获取用户保存的创意
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "请先登录" },
        { status: 401 }
      );
    }

    const ideas = await prisma.idea.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    // 解析 JSON 字段
    const formattedIdeas = ideas.map((idea) => ({
      ...idea,
      tags: JSON.parse(idea.tags),
      canvas: idea.canvas ? JSON.parse(idea.canvas) : null,
      analysis: idea.analysis ? JSON.parse(idea.analysis) : null,
    }));

    return NextResponse.json({ ideas: formattedIdeas });
  } catch (error) {
    console.error("获取创意错误:", error);
    return NextResponse.json(
      { error: "获取失败" },
      { status: 500 }
    );
  }
}

// 删除创意
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
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "创意 ID 不能为空" },
        { status: 400 }
      );
    }

    // 检查创意是否属于当前用户
    const idea = await prisma.idea.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!idea) {
      return NextResponse.json(
        { error: "创意不存在" },
        { status: 404 }
      );
    }

    await prisma.idea.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除创意错误:", error);
    return NextResponse.json(
      { error: "删除失败" },
      { status: 500 }
    );
  }
}
