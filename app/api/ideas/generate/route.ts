import { NextRequest, NextResponse } from "next/server";
import { generateWithAI } from "@/lib/ai-providers";

export async function POST(request: NextRequest) {
  try {
    const { keywords, existingTitles = [], count = 5 } = await request.json();

    if (!keywords) {
      return NextResponse.json({ error: "请输入关键词" }, { status: 400 });
    }

    const existingList = existingTitles.length > 0
      ? `\n\n【重要】以下点子已经生成过，请勿重复：\n${existingTitles.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}`
      : "";

    const systemPrompt = `你是一位资深的创业顾问和商业分析师，擅长发现创新的商业机会。
你需要根据用户提供的关键词，生成独特、可行、有市场潜力的创业点子。

要求：
1. 每个点子必须独特，不能与已有点子重复或相似
2. 点子要具体可执行，不能太空泛
3. 要考虑市场需求和可行性
4. 评分要客观，基于市场规模、竞争程度、技术可行性等因素

只返回 JSON 格式，不要有其他内容。`;

    const userPrompt = `请根据关键词「${keywords}」生成 ${count} 个创业点子。${existingList}

返回格式（JSON 数组）：
[
  {
    "title": "点子名称（简洁有力，10字以内）",
    "description": "详细描述（100-150字，说明这个点子是什么、解决什么问题、如何运作）",
    "tags": ["标签1", "标签2", "标签3"],
    "score": 85,
    "marketSize": "市场规模描述（如：百亿级、千亿级）",
    "targetUsers": "目标用户群体",
    "uniqueValue": "独特价值主张"
  }
]

注意：
- score 是 0-100 的整数，代表创业潜力评分
- 每个点子的方向要有差异化
- 标签要精准，便于分类`;

    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const result = await generateWithAI(messages, { maxTokens: 4000, temperature: 0.8 });

    if (!result) {
      return NextResponse.json(
        { error: "AI 服务不可用，请检查配置" },
        { status: 503 }
      );
    }

    // 解析 JSON
    let ideas;
    try {
      const content = result.content;
      // 尝试提取 JSON 数组
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        ideas = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("无法解析返回内容");
      }

      // 验证和清理数据
      ideas = ideas.map((idea: Record<string, unknown>) => ({
        title: String(idea.title || "未命名点子"),
        description: String(idea.description || ""),
        tags: Array.isArray(idea.tags) ? idea.tags.slice(0, 5) : [],
        score: Math.min(100, Math.max(0, Number(idea.score) || 70)),
        marketSize: String(idea.marketSize || "待评估"),
        targetUsers: String(idea.targetUsers || ""),
        uniqueValue: String(idea.uniqueValue || ""),
      }));

      // 过滤掉与已有点子重复的
      if (existingTitles.length > 0) {
        const existingSet = new Set(existingTitles.map((t: string) => t.toLowerCase()));
        ideas = ideas.filter((idea: { title: string }) =>
          !existingSet.has(idea.title.toLowerCase())
        );
      }

    } catch (parseError) {
      console.error("JSON 解析错误:", parseError);
      // 返回默认点子
      ideas = [
        {
          title: `${keywords}创新平台`,
          description: `基于${keywords}领域的创新解决方案，通过技术手段解决行业痛点，为用户提供更好的体验和价值。`,
          tags: [keywords, "创新", "平台"],
          score: 75,
          marketSize: "百亿级",
          targetUsers: "行业从业者和消费者",
          uniqueValue: "创新的解决方案",
        },
      ];
    }

    return NextResponse.json({ ideas });
  } catch (error) {
    console.error("生成创意错误:", error);
    return NextResponse.json(
      { error: "生成失败，请稍后重试" },
      { status: 500 }
    );
  }
}
