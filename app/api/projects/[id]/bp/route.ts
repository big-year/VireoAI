import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateWithAI } from "@/lib/ai-providers";
import { parseAIJson } from "@/lib/parse-ai-json";

// 获取已保存的商业计划书
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
      select: { bpData: true, name: true },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    if (!project.bpData) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
      exists: true,
      success: true,
      bp: JSON.parse(project.bpData),
      projectName: project.name,
    });
  } catch (error) {
    console.error("获取商业计划书错误:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// 生成商业计划书
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
    const prompt = `你是一位专业的商业计划书撰写专家。请根据以下项目信息，生成一份完整、专业的商业计划书。

## 项目信息
- 项目名称：${project.name}
- 项目描述：${idea.description}
- 市场规模：${idea.marketSize || "待评估"}
- 潜力评分：${idea.score || 0}/100

${canvas ? `
## 商业模式画布
- 价值主张：${canvas.valueProposition}
- 客户细分：${canvas.customerSegments}
- 渠道通路：${canvas.channels}
- 客户关系：${canvas.customerRelationships}
- 收入来源：${canvas.revenueStreams}
- 核心资源：${canvas.keyResources}
- 关键业务：${canvas.keyActivities}
- 重要伙伴：${canvas.keyPartners}
- 成本结构：${canvas.costStructure}
` : ""}

${analysis ? `
## 市场分析
- 市场规模：${analysis.marketSize}
- 增长率：${analysis.growthRate}
- 目标用户：${analysis.targetAudience}
- 进入壁垒：${analysis.entryBarriers}
- 竞争对手：${analysis.competitors?.join("、") || "暂无"}
- 市场机会：${analysis.opportunities?.join("；") || "暂无"}
- 潜在威胁：${analysis.threats?.join("；") || "暂无"}
` : ""}

请生成包含以下章节的商业计划书，以 JSON 格式返回：

{
  "executiveSummary": {
    "title": "执行摘要",
    "content": "简洁有力的项目概述，包括核心价值、目标市场、商业模式和融资需求（300-500字）"
  },
  "companyOverview": {
    "title": "公司概述",
    "content": "公司愿景、使命、发展历程和核心团队介绍"
  },
  "productService": {
    "title": "产品与服务",
    "content": "详细描述产品/服务特点、核心功能、技术优势和差异化竞争力"
  },
  "marketAnalysis": {
    "title": "市场分析",
    "content": "目标市场规模、增长趋势、用户画像、市场机会分析"
  },
  "competitiveAnalysis": {
    "title": "竞争分析",
    "content": "竞争格局、主要竞争对手分析、竞争优势和壁垒"
  },
  "businessModel": {
    "title": "商业模式",
    "content": "盈利模式、收入来源、定价策略、成本结构"
  },
  "marketingStrategy": {
    "title": "营销策略",
    "content": "市场推广计划、获客渠道、品牌建设、用户增长策略"
  },
  "operationPlan": {
    "title": "运营计划",
    "content": "运营模式、关键里程碑、发展阶段规划"
  },
  "financialProjection": {
    "title": "财务预测",
    "years": [
      { "year": "第1年", "revenue": "预计收入", "cost": "预计成本", "profit": "预计利润" },
      { "year": "第2年", "revenue": "预计收入", "cost": "预计成本", "profit": "预计利润" },
      { "year": "第3年", "revenue": "预计收入", "cost": "预计成本", "profit": "预计利润" }
    ],
    "content": "财务假设说明和盈亏平衡分析"
  },
  "fundingRequest": {
    "title": "融资需求",
    "amount": "融资金额",
    "usage": ["资金用途1", "资金用途2", "资金用途3"],
    "content": "融资计划、资金使用规划、预期回报"
  },
  "riskAnalysis": {
    "title": "风险分析",
    "risks": [
      { "type": "风险类型", "description": "风险描述", "mitigation": "应对措施" }
    ]
  },
  "appendix": {
    "title": "附录",
    "items": ["补充材料说明"]
  }
}

要求：
1. 内容专业、数据合理、逻辑清晰
2. 财务数据要基于市场规模和商业模式合理估算
3. 融资金额要与项目阶段和发展计划匹配
4. 只返回 JSON，不要其他内容`;

    const aiResult = await generateWithAI(
      [
        {
          role: "system",
          content: "你是一位资深的商业计划书撰写专家，擅长帮助创业者撰写专业的 BP。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      { temperature: 0.7, maxTokens: 4000 }
    );

    if (!aiResult?.content) {
      return NextResponse.json({ error: "AI 生成失败" }, { status: 500 });
    }

    // 解析 JSON
    let bp;
    try {
      bp = parseAIJson(aiResult.content);
    } catch (e: any) {
      console.error("JSON 解析失败:", e.message);
      console.error("AI 原始返回内容:", aiResult.content);
      return NextResponse.json({ error: "AI 返回格式错误，请重试" }, { status: 500 });
    }

    // 保存到数据库
    await prisma.project.update({
      where: { id },
      data: { bpData: JSON.stringify(bp) },
    });

    return NextResponse.json({
      success: true,
      bp,
      projectName: project.name,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("生成商业计划书错误:", error);
    return NextResponse.json({ error: "生成失败" }, { status: 500 });
  }
}
