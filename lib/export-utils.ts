/**
 * 工具结果导出工具
 */

// 导出为 Markdown
export function exportToMarkdown(data: any, type: string, projectName: string): string {
  const timestamp = new Date().toLocaleDateString('zh-CN');

  switch (type) {
    case 'bp':
      return generateBPMarkdown(data, projectName, timestamp);
    case 'pitch':
      return generatePitchMarkdown(data, projectName, timestamp);
    case 'mvp':
      return generateMVPMarkdown(data, projectName, timestamp);
    case 'personas':
      return generatePersonasMarkdown(data, projectName, timestamp);
    case 'financial':
      return generateFinancialMarkdown(data, projectName, timestamp);
    default:
      return '';
  }
}

// 下载 Markdown 文件
export function downloadMarkdown(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// 导出为 PDF - 基于数据生成完整内容，打开预览页面
export function exportToPDFFromData(data: any, type: string, projectName: string) {
  // 先生成 Markdown，再转换为 HTML
  const markdown = exportToMarkdown(data, type, projectName);
  const html = markdownToHtml(markdown);

  const toolNames: Record<string, string> = {
    bp: '商业计划书',
    pitch: '电梯演讲稿',
    mvp: 'MVP规划',
    personas: '用户画像',
    financial: '财务预测'
  };

  const filename = `${projectName}-${toolNames[type] || type}`;

  // 打印样式
  const printStyles = `
    <style>
      @media print {
        @page { size: A4; margin: 15mm; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: "Microsoft YaHei", "PingFang SC", -apple-system, sans-serif;
        font-size: 14px;
        line-height: 1.8;
        color: #333;
        background: #f5f5f5;
        padding: 0;
      }
      .toolbar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #fff;
        border-bottom: 1px solid #e0e0e0;
        padding: 12px 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        z-index: 100;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      .toolbar-title {
        font-size: 16px;
        font-weight: 600;
      }
      .toolbar-actions {
        display: flex;
        gap: 12px;
      }
      .btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }
      .btn-primary {
        background: #1a73e8;
        color: white;
      }
      .btn-primary:hover { background: #1557b0; }
      .btn-secondary {
        background: #f1f3f4;
        color: #333;
      }
      .btn-secondary:hover { background: #e8eaed; }
      .container {
        max-width: 800px;
        margin: 80px auto 40px;
        background: white;
        box-shadow: 0 2px 12px rgba(0,0,0,0.1);
        border-radius: 8px;
        overflow: hidden;
      }
      .content {
        padding: 40px 50px;
      }
      h1 {
        font-size: 28px;
        color: #111;
        margin-bottom: 8px;
        text-align: center;
      }
      .subtitle {
        text-align: center;
        color: #666;
        font-size: 13px;
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 2px solid #1a73e8;
      }
      h2 {
        font-size: 20px;
        color: #1a73e8;
        margin: 32px 0 16px;
        padding-bottom: 8px;
        border-bottom: 1px solid #e0e0e0;
      }
      h3 {
        font-size: 16px;
        color: #333;
        margin: 24px 0 12px;
      }
      h4 {
        font-size: 14px;
        color: #555;
        margin: 16px 0 8px;
      }
      p {
        margin-bottom: 12px;
        text-align: justify;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 16px 0;
        font-size: 13px;
      }
      th, td {
        border: 1px solid #e0e0e0;
        padding: 10px 12px;
        text-align: left;
      }
      th {
        background: #f8f9fa;
        font-weight: 600;
        color: #333;
      }
      tr:nth-child(even) { background: #fafafa; }
      ul, ol {
        margin: 12px 0;
        padding-left: 28px;
      }
      li { margin-bottom: 8px; }
      blockquote {
        margin: 16px 0;
        padding: 12px 20px;
        border-left: 4px solid #1a73e8;
        background: #f8f9fa;
        font-style: italic;
        color: #555;
      }
      hr {
        border: none;
        border-top: 1px solid #e0e0e0;
        margin: 24px 0;
      }
      strong { color: #111; }
      code {
        background: #f1f3f4;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 13px;
      }
      @media print {
        .toolbar { display: none; }
        .container {
          margin: 0;
          box-shadow: none;
          border-radius: 0;
        }
        body { background: white; }
      }
    </style>
  `;

  // 打开新窗口
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    alert('请允许弹出窗口以导出 PDF');
    return;
  }

  // 写入内容
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${filename}</title>
      ${printStyles}
    </head>
    <body>
      <div class="toolbar">
        <div class="toolbar-title">📄 ${filename}</div>
        <div class="toolbar-actions">
          <button class="btn btn-secondary" onclick="window.close()">关闭</button>
          <button class="btn btn-primary" onclick="window.print()">打印 / 保存 PDF</button>
        </div>
      </div>
      <div class="container">
        <div class="content">
          <h1>${filename}</h1>
          <div class="subtitle">生成时间：${new Date().toLocaleString('zh-CN')}</div>
          ${html}
        </div>
      </div>
    </body>
    </html>
  `);

  printWindow.document.close();
}

// 简单的 Markdown 转 HTML
function markdownToHtml(markdown: string): string {
  let html = markdown
    // 转义 HTML 特殊字符
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // 标题
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // 粗体
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // 斜体
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // 引用
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // 分隔线
    .replace(/^---$/gm, '<hr>')
    // 行内代码
    .replace(/`(.+?)`/g, '<code>$1</code>');

  // 处理表格
  html = processMarkdownTables(html);

  // 处理列表
  html = processMarkdownLists(html);

  // 处理段落（非空行且不是其他元素）
  html = html
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<')) return line;
      if (trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed)) return line;
      return `<p>${line}</p>`;
    })
    .join('\n');

  // 合并连续的 blockquote
  html = html.replace(/<\/blockquote>\s*<blockquote>/g, '<br>');

  return html;
}

// 处理 Markdown 表格
function processMarkdownTables(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let inTable = false;
  let tableRows: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // 检测表格行
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      // 跳过分隔行
      if (trimmed.match(/^\|[\s\-:|]+\|$/)) {
        continue;
      }

      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      tableRows.push(trimmed);
    } else {
      if (inTable) {
        // 结束表格
        result.push(renderTable(tableRows));
        inTable = false;
        tableRows = [];
      }
      result.push(line);
    }
  }

  // 处理最后一个表格
  if (inTable && tableRows.length > 0) {
    result.push(renderTable(tableRows));
  }

  return result.join('\n');
}

// 渲染表格
function renderTable(rows: string[]): string {
  if (rows.length === 0) return '';

  let html = '<table>';

  rows.forEach((row, index) => {
    const cells = row.split('|').filter(cell => cell.trim() !== '');
    const tag = index === 0 ? 'th' : 'td';

    html += '<tr>';
    cells.forEach(cell => {
      html += `<${tag}>${cell.trim()}</${tag}>`;
    });
    html += '</tr>';
  });

  html += '</table>';
  return html;
}

// 处理 Markdown 列表
function processMarkdownLists(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let inList = false;
  let listType = '';

  for (const line of lines) {
    const trimmed = line.trim();
    const unorderedMatch = trimmed.match(/^[-*]\s+(.+)$/);
    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);

    if (unorderedMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) result.push(`</${listType}>`);
        result.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      result.push(`<li>${unorderedMatch[1]}</li>`);
    } else if (orderedMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) result.push(`</${listType}>`);
        result.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      result.push(`<li>${orderedMatch[1]}</li>`);
    } else {
      if (inList) {
        result.push(`</${listType}>`);
        inList = false;
        listType = '';
      }
      result.push(line);
    }
  }

  if (inList) {
    result.push(`</${listType}>`);
  }

  return result.join('\n');
}

// 保留旧函数名兼容
export function exportToPDF(elementId: string, filename: string) {
  console.warn('exportToPDF 已废弃，请使用 exportToPDFFromData');
}

// 商业计划书 Markdown
function generateBPMarkdown(bp: any, projectName: string, timestamp: string): string {
  let md = `# ${projectName} - 商业计划书\n\n`;
  md += `> 生成时间：${timestamp}\n\n`;
  md += `---\n\n`;

  const sections = [
    'executiveSummary',
    'companyOverview',
    'productService',
    'marketAnalysis',
    'competitiveAnalysis',
    'businessModel',
    'marketingStrategy',
    'operationPlan',
    'financialProjection',
    'fundingRequest',
    'riskAnalysis',
    'appendix'
  ];

  for (const key of sections) {
    const section = bp[key];
    if (!section) continue;

    md += `## ${section.title || key}\n\n`;

    if (section.content) {
      md += `${section.content}\n\n`;
    }

    // 财务预测表格
    if (key === 'financialProjection' && section.years) {
      md += `### 三年财务预测\n\n`;
      md += `| 年份 | 预计收入 | 预计成本 | 预计利润 |\n`;
      md += `|------|----------|----------|----------|\n`;
      for (const year of section.years) {
        md += `| ${year.year} | ${year.revenue} | ${year.cost} | ${year.profit} |\n`;
      }
      md += `\n`;
    }

    // 融资用途
    if (key === 'fundingRequest') {
      if (section.amount) {
        md += `**融资金额**：${section.amount}\n\n`;
      }
      if (section.usage && section.usage.length > 0) {
        md += `**资金用途**：\n`;
        for (const item of section.usage) {
          md += `- ${item}\n`;
        }
        md += `\n`;
      }
    }

    // 风险分析表格
    if (key === 'riskAnalysis' && section.risks) {
      md += `| 风险类型 | 风险描述 | 应对措施 |\n`;
      md += `|----------|----------|----------|\n`;
      for (const risk of section.risks) {
        md += `| ${risk.type} | ${risk.description} | ${risk.mitigation} |\n`;
      }
      md += `\n`;
    }

    // 附录
    if (key === 'appendix' && section.items) {
      for (const item of section.items) {
        md += `- ${item}\n`;
      }
      md += `\n`;
    }
  }

  return md;
}

// 电梯演讲稿 Markdown
function generatePitchMarkdown(pitch: any, projectName: string, timestamp: string): string {
  let md = `# ${projectName} - 电梯演讲稿\n\n`;
  md += `> 生成时间：${timestamp}\n\n`;
  md += `---\n\n`;

  // 关键信息
  if (pitch.keyMessages) {
    md += `## 核心信息\n\n`;
    const km = pitch.keyMessages;
    if (km.hook) md += `**开场金句**：${km.hook}\n\n`;
    if (km.problem) md += `**核心痛点**：${km.problem}\n\n`;
    if (km.solution) md += `**解决方案**：${km.solution}\n\n`;
    if (km.whyUs) md += `**为什么选我们**：${km.whyUs}\n\n`;
    if (km.ask) md += `**融资诉求**：${km.ask}\n\n`;
    md += `---\n\n`;
  }

  // 30秒版本
  if (pitch.pitch30s) {
    md += `## 30秒版本\n\n`;
    md += `*${pitch.pitch30s.duration} | ${pitch.pitch30s.wordCount}*\n\n`;
    md += `${pitch.pitch30s.content}\n\n`;
    if (pitch.pitch30s.tips && pitch.pitch30s.tips.length > 0) {
      md += `**演讲技巧**：\n`;
      for (const tip of pitch.pitch30s.tips) {
        md += `- ${tip}\n`;
      }
      md += `\n`;
    }
    md += `---\n\n`;
  }

  // 1分钟版本
  if (pitch.pitch60s) {
    md += `## 1分钟版本\n\n`;
    md += `*${pitch.pitch60s.duration} | ${pitch.pitch60s.wordCount}*\n\n`;
    md += `${pitch.pitch60s.content}\n\n`;
    if (pitch.pitch60s.tips && pitch.pitch60s.tips.length > 0) {
      md += `**演讲技巧**：\n`;
      for (const tip of pitch.pitch60s.tips) {
        md += `- ${tip}\n`;
      }
      md += `\n`;
    }
    md += `---\n\n`;
  }

  // 3分钟版本
  if (pitch.pitch180s) {
    md += `## 3分钟版本\n\n`;
    md += `*${pitch.pitch180s.duration} | ${pitch.pitch180s.wordCount}*\n\n`;
    md += `${pitch.pitch180s.content}\n\n`;
    if (pitch.pitch180s.tips && pitch.pitch180s.tips.length > 0) {
      md += `**演讲技巧**：\n`;
      for (const tip of pitch.pitch180s.tips) {
        md += `- ${tip}\n`;
      }
      md += `\n`;
    }
  }

  return md;
}

// MVP 规划 Markdown
function generateMVPMarkdown(mvp: any, projectName: string, timestamp: string): string {
  let md = `# ${projectName} - MVP 功能规划\n\n`;
  md += `> 生成时间：${timestamp}\n\n`;
  md += `---\n\n`;

  // 概要
  if (mvp.summary) {
    md += `## 概要\n\n`;
    md += `| 指标 | 数值 |\n`;
    md += `|------|------|\n`;
    md += `| 总功能数 | ${mvp.summary.totalFeatures || '-'} |\n`;
    md += `| MVP 功能数 | ${mvp.summary.mvpFeatures || '-'} |\n`;
    md += `| 预计周期 | ${mvp.summary.estimatedWeeks || '-'} |\n`;
    md += `| 团队规模 | ${mvp.summary.teamSize || '-'} |\n`;
    md += `\n`;
  }

  if (mvp.coreValue) {
    md += `**核心价值假设**：${mvp.coreValue}\n\n`;
  }

  md += `---\n\n`;

  // 功能列表
  if (mvp.features) {
    const featureCategories = [
      { key: 'mustHave', title: 'Must Have（必须有）', priority: 'P0' },
      { key: 'shouldHave', title: 'Should Have（应该有）', priority: 'P1' },
      { key: 'couldHave', title: 'Could Have（可以有）', priority: 'P2' },
      { key: 'wontHave', title: "Won't Have（暂不做）", priority: 'P3' },
    ];

    for (const cat of featureCategories) {
      const features = mvp.features[cat.key];
      if (!features || features.length === 0) continue;

      md += `## ${cat.title}\n\n`;

      for (const feature of features) {
        md += `### ${feature.name}\n\n`;
        md += `${feature.description}\n\n`;
        if (feature.effort) md += `**工作量**：${feature.effort}\n\n`;
        if (feature.userStory) md += `**用户故事**：${feature.userStory}\n\n`;
        if (feature.futurePhase) md += `**计划版本**：${feature.futurePhase}\n\n`;
      }
    }
  }

  // 里程碑
  if (mvp.milestones && mvp.milestones.length > 0) {
    md += `## 里程碑规划\n\n`;
    for (const milestone of mvp.milestones) {
      md += `### ${milestone.phase}（${milestone.duration}）\n\n`;
      if (milestone.goals && milestone.goals.length > 0) {
        md += `**目标**：\n`;
        for (const goal of milestone.goals) {
          md += `- ${goal}\n`;
        }
        md += `\n`;
      }
      if (milestone.deliverables && milestone.deliverables.length > 0) {
        md += `**交付物**：\n`;
        for (const d of milestone.deliverables) {
          md += `- ${d}\n`;
        }
        md += `\n`;
      }
    }
  }

  // 技术栈
  if (mvp.techStack) {
    md += `## 推荐技术栈\n\n`;
    if (mvp.techStack.frontend) md += `**前端**：${mvp.techStack.frontend.join(', ')}\n\n`;
    if (mvp.techStack.backend) md += `**后端**：${mvp.techStack.backend.join(', ')}\n\n`;
    if (mvp.techStack.database) md += `**数据库**：${mvp.techStack.database.join(', ')}\n\n`;
    if (mvp.techStack.reason) md += `**选型理由**：${mvp.techStack.reason}\n\n`;
  }

  // 成功指标
  if (mvp.successMetrics && mvp.successMetrics.length > 0) {
    md += `## 成功指标\n\n`;
    md += `| 指标 | 目标值 | 说明 |\n`;
    md += `|------|--------|------|\n`;
    for (const metric of mvp.successMetrics) {
      md += `| ${metric.metric} | ${metric.target} | ${metric.description} |\n`;
    }
    md += `\n`;
  }

  return md;
}

// 用户画像 Markdown
function generatePersonasMarkdown(data: any, projectName: string, timestamp: string): string {
  let md = `# ${projectName} - 用户画像\n\n`;
  md += `> 生成时间：${timestamp}\n\n`;
  md += `---\n\n`;

  const personas = data.personas || [];

  for (const persona of personas) {
    md += `## ${persona.avatar || '👤'} ${persona.name}\n\n`;
    md += `*${persona.tagline}*\n\n`;

    // 人口统计
    if (persona.demographics) {
      md += `### 基本信息\n\n`;
      const d = persona.demographics;
      md += `| 属性 | 信息 |\n`;
      md += `|------|------|\n`;
      if (d.age) md += `| 年龄 | ${d.age} |\n`;
      if (d.gender) md += `| 性别 | ${d.gender} |\n`;
      if (d.occupation) md += `| 职业 | ${d.occupation} |\n`;
      if (d.income) md += `| 收入 | ${d.income} |\n`;
      if (d.location) md += `| 城市 | ${d.location} |\n`;
      if (d.education) md += `| 学历 | ${d.education} |\n`;
      md += `\n`;
    }

    // 心理特征
    if (persona.psychographics) {
      md += `### 心理特征\n\n`;
      const p = persona.psychographics;
      if (p.personality) md += `**性格特点**：${p.personality.join('、')}\n\n`;
      if (p.values) md += `**价值观**：${p.values.join('、')}\n\n`;
      if (p.lifestyle) md += `**生活方式**：${p.lifestyle}\n\n`;
      if (p.interests) md += `**兴趣爱好**：${p.interests.join('、')}\n\n`;
    }

    // 行为特征
    if (persona.behaviors) {
      md += `### 行为特征\n\n`;
      const b = persona.behaviors;
      if (b.techSavvy) md += `**技术熟练度**：${b.techSavvy}\n\n`;
      if (b.purchaseHabits) md += `**消费习惯**：${b.purchaseHabits}\n\n`;
      if (b.informationSources) md += `**信息渠道**：${b.informationSources.join('、')}\n\n`;
      if (b.decisionFactors) md += `**决策因素**：${b.decisionFactors.join('、')}\n\n`;
    }

    // 痛点
    if (persona.painPoints && persona.painPoints.length > 0) {
      md += `### 痛点\n\n`;
      for (const pain of persona.painPoints) {
        md += `- **${pain.pain}**（严重程度：${pain.severity}/5）\n`;
        md += `  - 当前解决方案：${pain.currentSolution}\n`;
      }
      md += `\n`;
    }

    // 目标和动机
    if (persona.goals) {
      md += `### 目标\n\n`;
      for (const goal of persona.goals) {
        md += `- ${goal}\n`;
      }
      md += `\n`;
    }

    if (persona.motivations) {
      md += `### 使用动机\n\n`;
      for (const m of persona.motivations) {
        md += `- ${m}\n`;
      }
      md += `\n`;
    }

    if (persona.barriers) {
      md += `### 使用障碍\n\n`;
      for (const b of persona.barriers) {
        md += `- ${b}\n`;
      }
      md += `\n`;
    }

    if (persona.quote) {
      md += `> "${persona.quote}"\n\n`;
    }

    if (persona.scenario) {
      md += `**典型场景**：${persona.scenario}\n\n`;
    }

    md += `---\n\n`;
  }

  // 洞察
  if (data.insights) {
    md += `## 用户洞察\n\n`;
    if (data.insights.commonPainPoints) {
      md += `**共同痛点**：${data.insights.commonPainPoints.join('、')}\n\n`;
    }
    if (data.insights.keyDifferentiators) {
      md += `**差异点**：${data.insights.keyDifferentiators.join('、')}\n\n`;
    }
    if (data.insights.priorityPersona) {
      md += `**优先服务**：${data.insights.priorityPersona}\n\n`;
    }
  }

  return md;
}

// 财务预测 Markdown
function generateFinancialMarkdown(financial: any, projectName: string, timestamp: string): string {
  let md = `# ${projectName} - 财务预测\n\n`;
  md += `> 生成时间：${timestamp}\n\n`;
  md += `---\n\n`;

  // 关键指标
  if (financial.keyMetrics) {
    md += `## 关键指标\n\n`;
    const km = financial.keyMetrics;
    md += `| 指标 | 数值 |\n`;
    md += `|------|------|\n`;
    if (km.cac) md += `| 获客成本 (CAC) | ${km.cac} |\n`;
    if (km.ltv) md += `| 用户生命周期价值 (LTV) | ${km.ltv} |\n`;
    if (km.ltvCacRatio) md += `| LTV/CAC 比率 | ${km.ltvCacRatio} |\n`;
    if (km.paybackPeriod) md += `| 回本周期 | ${km.paybackPeriod} |\n`;
    md += `\n`;
  }

  // 假设
  if (financial.assumptions) {
    md += `## 核心假设\n\n`;
    const a = financial.assumptions;
    if (a.pricingModel) md += `**定价模式**：${a.pricingModel}\n\n`;
    if (a.averagePrice) md += `**平均客单价**：${a.averagePrice}\n\n`;
    if (a.customerGrowthRate) md += `**用户增长率**：${a.customerGrowthRate}\n\n`;
    if (a.churnRate) md += `**流失率**：${a.churnRate}\n\n`;
    if (a.grossMargin) md += `**毛利率**：${a.grossMargin}\n\n`;
  }

  // 收入预测
  if (financial.revenue) {
    md += `## 收入预测\n\n`;

    if (financial.revenue.streams && financial.revenue.streams.length > 0) {
      md += `### 收入来源\n\n`;
      for (const stream of financial.revenue.streams) {
        md += `- **${stream.name}**（${stream.percentage}）：${stream.description}\n`;
      }
      md += `\n`;
    }

    if (financial.revenue.yearly && financial.revenue.yearly.length > 0) {
      md += `### 年度收入\n\n`;
      md += `| 年份 | 收入 | 增长率 |\n`;
      md += `|------|------|--------|\n`;
      for (const y of financial.revenue.yearly) {
        md += `| ${y.year} | ${typeof y.amount === 'number' ? y.amount.toLocaleString() : y.amount} | ${y.growth || '-'} |\n`;
      }
      md += `\n`;
    }
  }

  // 成本预测
  if (financial.costs) {
    md += `## 成本预测\n\n`;

    if (financial.costs.fixed && financial.costs.fixed.length > 0) {
      md += `### 固定成本\n\n`;
      md += `| 项目 | 月度 | 年度 | 说明 |\n`;
      md += `|------|------|------|------|\n`;
      for (const c of financial.costs.fixed) {
        md += `| ${c.item} | ${c.monthly?.toLocaleString() || '-'} | ${c.yearly?.toLocaleString() || '-'} | ${c.description || '-'} |\n`;
      }
      md += `\n`;
    }

    if (financial.costs.variable && financial.costs.variable.length > 0) {
      md += `### 可变成本\n\n`;
      md += `| 项目 | 占比 | 说明 |\n`;
      md += `|------|------|------|\n`;
      for (const c of financial.costs.variable) {
        md += `| ${c.item} | ${c.percentage} | ${c.description || '-'} |\n`;
      }
      md += `\n`;
    }
  }

  // 盈利预测
  if (financial.profitability) {
    md += `## 盈利预测\n\n`;

    if (financial.profitability.yearly && financial.profitability.yearly.length > 0) {
      md += `| 年份 | 收入 | 成本 | 利润 | 利润率 |\n`;
      md += `|------|------|------|------|--------|\n`;
      for (const y of financial.profitability.yearly) {
        md += `| ${y.year} | ${y.revenue?.toLocaleString() || '-'} | ${y.cost?.toLocaleString() || '-'} | ${y.profit?.toLocaleString() || '-'} | ${y.margin || '-'} |\n`;
      }
      md += `\n`;
    }

    if (financial.profitability.breakEvenMonth) {
      md += `**盈亏平衡点**：${financial.profitability.breakEvenMonth}\n\n`;
    }
    if (financial.profitability.breakEvenRevenue) {
      md += `**盈亏平衡收入**：${financial.profitability.breakEvenRevenue}\n\n`;
    }
  }

  // 融资建议
  if (financial.funding) {
    md += `## 融资建议\n\n`;
    if (financial.funding.recommended) md += `**建议融资金额**：${financial.funding.recommended}\n\n`;
    if (financial.funding.runway) md += `**资金可支撑时间**：${financial.funding.runway}\n\n`;

    if (financial.funding.usage && financial.funding.usage.length > 0) {
      md += `### 资金用途\n\n`;
      md += `| 用途 | 金额 | 占比 |\n`;
      md += `|------|------|------|\n`;
      for (const u of financial.funding.usage) {
        md += `| ${u.category} | ${u.amount?.toLocaleString() || '-'} | ${u.percentage || '-'} |\n`;
      }
      md += `\n`;
    }
  }

  // 风险
  if (financial.risks && financial.risks.length > 0) {
    md += `## 财务风险\n\n`;
    md += `| 风险 | 影响程度 | 应对措施 |\n`;
    md += `|------|----------|----------|\n`;
    for (const r of financial.risks) {
      md += `| ${r.risk} | ${r.impact} | ${r.mitigation} |\n`;
    }
    md += `\n`;
  }

  // 总结
  if (financial.summary) {
    md += `## 总结\n\n`;
    md += `${financial.summary}\n`;
  }

  return md;
}
