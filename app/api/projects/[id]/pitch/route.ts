import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateWithAI } from "@/lib/ai-providers";
import { parseAIJson } from "@/lib/parse-ai-json";

// 获取已保存的电梯演讲稿
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { id } = await params;

    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id },
      select: { pitchData: true, name: true },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    if (!project.pitchData) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
      exists: true,
      success: true,
      pitch: JSON.parse(project.pitchData),
      projectName: project.name,
    });
  } catch (error) {
    console.error("获取电梯演讲稿错误:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// 生成电梯演讲稿
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { id } = await params;

    // 获取项目和关联的创意数据
    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id },
      include: {
        idea: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    if (!project.idea) {
      return NextResponse.json({ error: "项目没有关联创意" }, { status: 400 });
    }

    const idea = project.idea;
    const canvas = idea.canvas ? JSON.parse(idea.canvas) : null;
    const analysis = idea.analysis ? JSON.parse(idea.analysis) : null;

    // 构建 prompt
    const prompt = `你是一位专业的创业路演教练。请根据以下项目信息，生成三个版本的电梯演讲稿（Elevator Pitch）。

## 项目信息
- 项目名称：${project.name}
- 项目描述：${idea.description}
- 市场规模：${idea.marketSize || "待评估"}

${canvas ? `
## 核心信息
- 价值主张：${canvas.valueProposition}
- 目标客户：${canvas.customerSegments}
- 收入来源：${canvas.revenueStreams}
` : ""}

${analysis ? `
## 市场信息
- 市场规模：${analysis.marketSize}
- 增长率：${analysis.growthRate}
- 竞争对手：${analysis.competitors?.join("、") || "暂无"}
` : ""}

请生成三个版本的电梯演讲稿，以 JSON 格式返回：

{
  "pitch30s": {
    "duration": "30秒",
    "wordCount": "约80-100字",
    "content": "30秒版本的演讲稿，简洁有力，一句话说清楚做什么、为谁做、为什么选我们",
    "tips": ["演讲技巧提示1", "演讲技巧提示2"]
  },
  "pitch60s": {
    "duration": "1分钟",
    "wordCount": "约150-200字",
    "content": "1分钟版本，包含问题、解决方案、市场机会、竞争优势",
    "tips": ["演讲技巧提示1", "演讲技巧提示2"]
  },
  "pitch180s": {
    "duration": "3分钟",
    "wordCount": "约400-500字",
    "content": "3分钟版本，完整版本包含：开场hook、痛点、解决方案、市场规模、商业模式、竞争优势、团队、融资需求、愿景",
    "tips": ["演讲技巧提示1", "演讲技巧提示2", "演讲技巧提示3"]
  },
  "keyMessages": {
    "hook": "开场金句",
    "problem": "核心痛点一句话",
    "solution": "解决方案一句话",
    "whyUs": "为什么选我们一句话",
    "ask": "融资/合作诉求一句话"
  }
}

要求：
1. 语言生动有感染力，避免空洞的套话
2. 数据具体，让人印象深刻
3. 结构清晰，逻辑流畅
4. 适合口语表达，朗朗上口
5. 只返回 JSON，不要其他内容`;

    const aiResult = await generateWithAI(
      [
        {
          role: "system",
          content: "你是一位资深的创业路演教练，擅长帮助创业者打磨电梯演讲稿。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      { temperature: 0.8, maxTokens: 2000 }
    );

    if (!aiResult?.content) {
      return NextResponse.json({ error: "AI 生成失败" }, { status: 500 });
    }

    // 解析 JSON
    let pitch;
    try {
      pitch = parseAIJson(aiResult.content);
    } catch (e) {
      console.error("JSON 解析失败:", e);
      return NextResponse.json({ error: "AI 返回格式错误，请重试" }, { status: 500 });
    }

    // 保存到数据库
    await prisma.project.update({
      where: { id },
      data: { pitchData: JSON.stringify(pitch) },
    });

    return NextResponse.json({
      success: true,
      pitch,
      projectName: project.name,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("生成电梯演讲稿错误:", error);
    return NextResponse.json({ error: "生成失败" }, { status: 500 });
  }
}
