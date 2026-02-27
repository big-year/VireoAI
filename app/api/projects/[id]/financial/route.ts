import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateWithAI } from "@/lib/ai-providers";
import { parseAIJson } from "@/lib/parse-ai-json";

// 获取已保存的财务预测
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
      select: { financialData: true, name: true },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    if (!project.financialData) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
      exists: true,
      success: true,
      financial: JSON.parse(project.financialData),
      projectName: project.name,
    });
  } catch (error) {
    console.error("获取财务预测错误:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// 生成财务预测
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
    const prompt = `你是一位创业财务顾问。请根据以下项目信息，生成 3 年财务预测。

## 项目信息
- 项目名称：${project.name}
- 项目描述：${idea.description}
- 市场规模：${idea.marketSize || "待评估"}

${canvas ? `
## 商业模式
- 收入来源：${canvas.revenueStreams}
- 成本结构：${canvas.costStructure}
- 关键业务：${canvas.keyActivities}
- 核心资源：${canvas.keyResources}
` : ""}

${analysis ? `
## 市场信息
- 市场规模：${analysis.marketSize}
- 增长率：${analysis.growthRate}
- 竞争对手：${analysis.competitors?.join("、") || "暂无"}
` : ""}

请生成财务预测，以 JSON 格式返回：

{
  "assumptions": {
    "pricingModel": "定价模式说明",
    "averagePrice": "平均客单价",
    "customerGrowthRate": "用户增长率假设",
    "churnRate": "流失率假设",
    "grossMargin": "毛利率假设"
  },
  "revenue": {
    "streams": [
      {
        "name": "收入来源名称",
        "description": "描述",
        "percentage": "占比"
      }
    ],
    "yearly": [
      { "year": "第1年", "amount": 500000, "growth": null },
      { "year": "第2年", "amount": 1500000, "growth": "200%" },
      { "year": "第3年", "amount": 4000000, "growth": "167%" }
    ],
    "monthly": [
      { "month": "M1", "amount": 10000 },
      { "month": "M2", "amount": 15000 },
      { "month": "M3", "amount": 22000 },
      { "month": "M4", "amount": 30000 },
      { "month": "M5", "amount": 38000 },
      { "month": "M6", "amount": 48000 },
      { "month": "M7", "amount": 55000 },
      { "month": "M8", "amount": 62000 },
      { "month": "M9", "amount": 70000 },
      { "month": "M10", "amount": 78000 },
      { "month": "M11", "amount": 85000 },
      { "month": "M12", "amount": 95000 }
    ]
  },
  "costs": {
    "fixed": [
      { "item": "成本项", "monthly": 10000, "yearly": 120000, "description": "说明" }
    ],
    "variable": [
      { "item": "成本项", "percentage": "占收入比例", "description": "说明" }
    ],
    "yearly": [
      { "year": "第1年", "fixed": 300000, "variable": 150000, "total": 450000 },
      { "year": "第2年", "fixed": 500000, "variable": 450000, "total": 950000 },
      { "year": "第3年", "fixed": 800000, "variable": 1200000, "total": 2000000 }
    ]
  },
  "profitability": {
    "yearly": [
      { "year": "第1年", "revenue": 500000, "cost": 450000, "profit": 50000, "margin": "10%" },
      { "year": "第2年", "revenue": 1500000, "cost": 950000, "profit": 550000, "margin": "37%" },
      { "year": "第3年", "revenue": 4000000, "cost": 2000000, "profit": 2000000, "margin": "50%" }
    ],
    "breakEvenMonth": "第N个月",
    "breakEvenRevenue": "盈亏平衡收入"
  },
  "funding": {
    "recommended": "建议融资金额",
    "runway": "资金可支撑时间",
    "usage": [
      { "category": "用途", "amount": 100000, "percentage": "20%" }
    ]
  },
  "keyMetrics": {
    "cac": "获客成本",
    "ltv": "用户生命周期价值",
    "ltvCacRatio": "LTV/CAC 比率",
    "paybackPeriod": "回本周期"
  },
  "risks": [
    {
      "risk": "财务风险",
      "impact": "高/中/低",
      "mitigation": "应对措施"
    }
  ],
  "summary": "财务预测总结（2-3句话）"
}

要求：
1. 数据要基于市场规模和商业模式合理估算
2. 增长曲线要符合创业公司特点（前期慢，后期快）
3. 成本结构要完整合理
4. 只返回 JSON，不要其他内容`;

    const aiResult = await generateWithAI(
      [
        {
          role: "system",
          content: "你是一位资深的创业财务顾问，擅长财务建模和预测。",
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
    let financial;
    try {
      financial = parseAIJson(aiResult.content);
    } catch (e) {
      console.error("JSON 解析失败:", e);
      return NextResponse.json({ error: "AI 返回格式错误，请重试" }, { status: 500 });
    }

    // 保存到数据库
    await prisma.project.update({
      where: { id },
      data: { financialData: JSON.stringify(financial) },
    });

    return NextResponse.json({
      success: true,
      financial,
      projectName: project.name,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("生成财务预测错误:", error);
    return NextResponse.json({ error: "生成失败" }, { status: 500 });
  }
}
