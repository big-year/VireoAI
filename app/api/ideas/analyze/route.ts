import { NextRequest, NextResponse } from "next/server";
import { generateWithAI } from "@/lib/ai-providers";

export async function POST(request: NextRequest) {
  try {
    const { idea } = await request.json();

    if (!idea || !idea.title) {
      return NextResponse.json({ error: "缺少创意信息" }, { status: 400 });
    }

    const systemPrompt = `你是一位资深的商业分析师和创业顾问。你需要对创业点子进行深入分析，生成商业模式画布和市场分析报告。
请严格按照 JSON 格式返回，不要包含任何其他文字或 markdown 标记。`;

    const userPrompt = `请对以下创业点子进行深入分析：

标题：${idea.title}
描述：${idea.description}
标签：${idea.tags?.join("、") || "无"}
市场规模：${idea.marketSize || "未知"}

请返回以下 JSON 格式的分析结果：

{
  "canvas": {
    "valueProposition": "价值主张内容",
    "customerSegments": "客户细分内容",
    "channels": "渠道通路内容",
    "customerRelationships": "客户关系内容",
    "revenueStreams": "收入来源内容",
    "keyResources": "核心资源内容",
    "keyActivities": "关键业务内容",
    "keyPartners": "重要伙伴内容",
    "costStructure": "成本结构内容"
  },
  "analysis": {
    "marketSize": "市场规模数据",
    "growthRate": "年增长率",
    "targetAudience": "目标用户画像",
    "competitors": ["竞争对手1", "竞争对手2"],
    "opportunities": ["机会1", "机会2"],
    "threats": ["威胁1", "威胁2"],
    "entryBarriers": "进入壁垒",
    "recommendations": ["建议1", "建议2"]
  }
}`;

    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const result = await generateWithAI(messages, { maxTokens: 3000 });

    if (!result) {
      return NextResponse.json(
        { error: "AI 服务不可用，请检查配置" },
        { status: 503 }
      );
    }

    // 解析 JSON
    let parsed;
    try {
      // 尝试提取 JSON
      const content = result.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("无法解析 AI 返回的内容");
      }
    } catch (parseError) {
      console.error("JSON 解析错误:", parseError);
      // 返回默认结构
      parsed = {
        canvas: {
          valueProposition: "为目标用户提供创新解决方案",
          customerSegments: "对该领域有需求的用户群体",
          channels: "线上平台、社交媒体、合作伙伴",
          customerRelationships: "自助服务、社区支持、个性化服务",
          revenueStreams: "订阅制、交易佣金、增值服务",
          keyResources: "技术平台、用户数据、专业团队",
          keyActivities: "产品开发、用户获取、服务运营",
          keyPartners: "技术供应商、渠道合作伙伴、行业专家",
          costStructure: "研发成本、运营成本、营销成本",
        },
        analysis: {
          marketSize: idea.marketSize || "待评估",
          growthRate: "10-20%",
          targetAudience: "目标用户群体",
          competitors: ["行业领先者", "新兴竞争者"],
          opportunities: ["市场增长空间大", "技术创新机会", "政策支持"],
          threats: ["竞争加剧", "技术变革", "用户需求变化"],
          entryBarriers: "中等",
          recommendations: ["快速验证市场", "建立核心竞争力", "注重用户体验"],
        },
      };
    }

    return NextResponse.json({
      canvas: parsed.canvas,
      analysis: parsed.analysis,
    });
  } catch (error) {
    console.error("深入分析错误:", error);
    return NextResponse.json(
      { error: "分析失败，请稍后重试" },
      { status: 500 }
    );
  }
}
