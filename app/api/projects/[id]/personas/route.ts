import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateWithAI } from "@/lib/ai-providers";
import { parseAIJson } from "@/lib/parse-ai-json";

// 获取已保存的用户画像
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
      select: { personasData: true, name: true },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    if (!project.personasData) {
      return NextResponse.json({ exists: false });
    }

    const data = JSON.parse(project.personasData);
    return NextResponse.json({
      exists: true,
      success: true,
      ...data,
      projectName: project.name,
    });
  } catch (error) {
    console.error("获取用户画像错误:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// 生成用户画像
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
    const prompt = `你是一位用户研究专家。请根据以下项目信息，生成 3 个典型的用户画像（User Persona）。

## 项目信息
- 项目名称：${project.name}
- 项目描述：${idea.description}

${canvas ? `
## 目标客户
- 客户细分：${canvas.customerSegments}
- 价值主张：${canvas.valueProposition}
- 客户关系：${canvas.customerRelationships}
` : ""}

${analysis ? `
## 市场信息
- 目标用户：${analysis.targetAudience}
- 市场规模：${analysis.marketSize}
` : ""}

请生成 3 个用户画像，以 JSON 格式返回：

{
  "personas": [
    {
      "id": 1,
      "name": "用户昵称（如：效率达人小王）",
      "avatar": "emoji表情（如：👨‍💼）",
      "tagline": "一句话描述这个用户",
      "demographics": {
        "age": "年龄范围",
        "gender": "性别",
        "occupation": "职业",
        "income": "收入水平",
        "location": "所在城市类型",
        "education": "教育背景"
      },
      "psychographics": {
        "personality": ["性格特点1", "性格特点2"],
        "values": ["价值观1", "价值观2"],
        "lifestyle": "生活方式描述",
        "interests": ["兴趣爱好1", "兴趣爱好2", "兴趣爱好3"]
      },
      "behaviors": {
        "techSavvy": "高/中/低",
        "purchaseHabits": "消费习惯描述",
        "informationSources": ["信息获取渠道1", "信息获取渠道2"],
        "decisionFactors": ["决策因素1", "决策因素2"]
      },
      "painPoints": [
        {
          "pain": "痛点描述",
          "severity": "严重程度 1-5",
          "currentSolution": "目前如何解决"
        }
      ],
      "goals": ["目标1", "目标2", "目标3"],
      "motivations": ["使用动机1", "使用动机2"],
      "barriers": ["使用障碍1", "使用障碍2"],
      "quote": "这个用户可能说的一句话",
      "scenario": "典型使用场景描述"
    }
  ],
  "insights": {
    "commonPainPoints": ["共同痛点1", "共同痛点2"],
    "keyDifferentiators": ["用户群体差异点1", "用户群体差异点2"],
    "priorityPersona": "最应该优先服务的用户画像ID及原因"
  }
}

要求：
1. 三个画像要有明显差异，覆盖不同用户群体
2. 痛点要具体、真实、可共情
3. 数据要合理，符合中国市场实际情况
4. 只返回 JSON，不要其他内容`;

    const aiResult = await generateWithAI(
      [
        {
          role: "system",
          content: "你是一位资深的用户研究专家，擅长创建精准的用户画像。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      { temperature: 0.8, maxTokens: 3000 }
    );

    if (!aiResult?.content) {
      return NextResponse.json({ error: "AI 生成失败" }, { status: 500 });
    }

    // 解析 JSON
    let personas;
    try {
      personas = parseAIJson(aiResult.content);
    } catch (e) {
      console.error("JSON 解析失败:", e);
      return NextResponse.json({ error: "AI 返回格式错误，请重试" }, { status: 500 });
    }

    // 保存到数据库
    await prisma.project.update({
      where: { id },
      data: { personasData: JSON.stringify(personas) },
    });

    return NextResponse.json({
      success: true,
      ...personas,
      projectName: project.name,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("生成用户画像错误:", error);
    return NextResponse.json({ error: "生成失败" }, { status: 500 });
  }
}
