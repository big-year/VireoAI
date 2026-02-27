import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateWithAI } from "@/lib/ai-providers";
import { parseAIJson } from "@/lib/parse-ai-json";

// 获取已保存的 MVP 规划
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
      select: { mvpData: true, name: true },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    if (!project.mvpData) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
      exists: true,
      success: true,
      mvp: JSON.parse(project.mvpData),
      projectName: project.name,
    });
  } catch (error) {
    console.error("获取 MVP 规划错误:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// 生成 MVP 功能规划
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
    const prompt = `你是一位资深的产品经理。请根据以下项目信息，规划 MVP（最小可行产品）的功能列表。

## 项目信息
- 项目名称：${project.name}
- 项目描述：${idea.description}

${canvas ? `
## 商业模式
- 价值主张：${canvas.valueProposition}
- 目标客户：${canvas.customerSegments}
- 关键业务：${canvas.keyActivities}
- 收入来源：${canvas.revenueStreams}
` : ""}

${analysis ? `
## 市场信息
- 目标用户：${analysis.targetAudience}
- 竞争对手：${analysis.competitors?.join("、") || "暂无"}
` : ""}

请生成 MVP 功能规划，以 JSON 格式返回：

{
  "summary": {
    "totalFeatures": 12,
    "mvpFeatures": 5,
    "estimatedWeeks": "6-8周",
    "teamSize": "2-3人"
  },
  "coreValue": "MVP 要验证的核心价值假设（一句话）",
  "features": {
    "mustHave": [
      {
        "name": "功能名称",
        "description": "功能描述",
        "priority": 1,
        "effort": "S/M/L",
        "userStory": "作为[用户]，我想要[功能]，以便[价值]"
      }
    ],
    "shouldHave": [
      {
        "name": "功能名称",
        "description": "功能描述",
        "priority": 2,
        "effort": "S/M/L",
        "userStory": "作为[用户]，我想要[功能]，以便[价值]"
      }
    ],
    "couldHave": [
      {
        "name": "功能名称",
        "description": "功能描述",
        "priority": 3,
        "effort": "S/M/L",
        "userStory": "作为[用户]，我想要[功能]，以便[价值]"
      }
    ],
    "wontHave": [
      {
        "name": "功能名称",
        "description": "为什么 MVP 阶段不做",
        "futurePhase": "V2/V3"
      }
    ]
  },
  "milestones": [
    {
      "phase": "第1阶段",
      "duration": "2周",
      "goals": ["目标1", "目标2"],
      "deliverables": ["交付物1", "交付物2"]
    }
  ],
  "techStack": {
    "frontend": ["推荐技术"],
    "backend": ["推荐技术"],
    "database": ["推荐技术"],
    "reason": "技术选型理由"
  },
  "successMetrics": [
    {
      "metric": "指标名称",
      "target": "目标值",
      "description": "为什么这个指标重要"
    }
  ]
}

要求：
1. Must Have 功能控制在 4-6 个，聚焦核心价值
2. 功能描述具体可执行
3. 工作量估算合理（S=1-2天，M=3-5天，L=1-2周）
4. 里程碑规划清晰
5. 只返回 JSON，不要其他内容`;

    const aiResult = await generateWithAI(
      [
        {
          role: "system",
          content: "你是一位资深产品经理，擅长 MVP 规划和敏捷开发。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      { temperature: 0.7, maxTokens: 3000 }
    );

    if (!aiResult?.content) {
      return NextResponse.json({ error: "AI 生成失败" }, { status: 500 });
    }

    // 解析 JSON
    let mvp;
    try {
      mvp = parseAIJson(aiResult.content);
    } catch (e) {
      console.error("JSON 解析失败:", e);
      return NextResponse.json({ error: "AI 返回格式错误，请重试" }, { status: 500 });
    }

    // 保存到数据库
    await prisma.project.update({
      where: { id },
      data: { mvpData: JSON.stringify(mvp) },
    });

    return NextResponse.json({
      success: true,
      mvp,
      projectName: project.name,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("生成 MVP 规划错误:", error);
    return NextResponse.json({ error: "生成失败" }, { status: 500 });
  }
}
