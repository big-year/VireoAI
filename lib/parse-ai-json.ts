/**
 * 从 AI 返回的内容中解析 JSON
 * 处理各种常见的格式问题
 */
export function parseAIJson(content: string): any {
  // 1. 先尝试提取 JSON 代码块
  let jsonStr = content;

  // 移除 markdown 代码块标记
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  } else {
    // 尝试匹配最外层的 JSON 对象
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
  }

  // 2. 预处理：移除可能导致问题的字符
  jsonStr = jsonStr
    .replace(/^\uFEFF/, '') // 移除 BOM
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '');

  // 3. 尝试直接解析
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    // 继续尝试修复
  }

  // 4. 修复常见问题 - 逐字符扫描处理字符串中的特殊字符
  let fixed = '';
  let inString = false;
  let i = 0;

  while (i < jsonStr.length) {
    const char = jsonStr[i];
    const nextChar = jsonStr[i + 1];

    // 处理转义字符
    if (char === '\\' && inString) {
      fixed += char;
      if (nextChar) {
        fixed += nextChar;
        i += 2;
        continue;
      }
    }

    // 切换字符串状态
    if (char === '"') {
      // 检查是否是转义的引号
      let backslashCount = 0;
      for (let j = fixed.length - 1; j >= 0 && fixed[j] === '\\'; j--) {
        backslashCount++;
      }
      // 如果前面有偶数个反斜杠，这是一个真正的引号
      if (backslashCount % 2 === 0) {
        inString = !inString;
      }
      fixed += char;
      i++;
      continue;
    }

    // 在字符串内部处理特殊字符
    if (inString) {
      if (char === '\n') {
        fixed += '\\n';
      } else if (char === '\r') {
        fixed += '\\r';
      } else if (char === '\t') {
        fixed += '\\t';
      } else if (char.charCodeAt(0) < 32) {
        // 其他控制字符直接跳过
        i++;
        continue;
      } else {
        fixed += char;
      }
    } else {
      // 在字符串外部，跳过换行符
      if (char === '\n' || char === '\r') {
        fixed += ' ';
      } else {
        fixed += char;
      }
    }
    i++;
  }

  // 5. 移除尾随逗号
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

  try {
    return JSON.parse(fixed);
  } catch (e) {
    // 继续尝试
  }

  // 6. 尝试修复字符串值中的未转义引号
  // 这是一个常见问题：AI 可能在字符串中使用了未转义的引号
  let fixedQuotes = '';
  inString = false;
  let stringStart = -1;
  i = 0;

  while (i < fixed.length) {
    const char = fixed[i];

    if (char === '"') {
      // 检查是否是转义的引号
      let backslashCount = 0;
      for (let j = fixedQuotes.length - 1; j >= 0 && fixedQuotes[j] === '\\'; j--) {
        backslashCount++;
      }

      if (backslashCount % 2 === 0) {
        // 这是一个真正的引号
        if (!inString) {
          inString = true;
          stringStart = i;
          fixedQuotes += char;
        } else {
          // 检查这个引号后面是否是有效的 JSON 结构
          const afterQuote = fixed.substring(i + 1).trimStart();
          if (afterQuote.length === 0 ||
              afterQuote[0] === ',' ||
              afterQuote[0] === '}' ||
              afterQuote[0] === ']' ||
              afterQuote[0] === ':') {
            // 这是字符串的结束引号
            inString = false;
            fixedQuotes += char;
          } else {
            // 这可能是字符串内部的引号，需要转义
            fixedQuotes += '\\"';
          }
        }
      } else {
        fixedQuotes += char;
      }
    } else {
      fixedQuotes += char;
    }
    i++;
  }

  try {
    return JSON.parse(fixedQuotes);
  } catch (e) {
    // 继续尝试
  }

  // 7. 更激进的修复：尝试修复未闭合的结构
  let aggressive = fixedQuotes;

  // 检查是否有未闭合的字符串（奇数个引号）
  const quoteCount = (aggressive.match(/(?<!\\)"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    // 尝试在末尾添加引号
    aggressive = aggressive.replace(/([^"\\])$/, '$1"');
  }

  // 尝试修复缺少的闭合括号
  const openBraces = (aggressive.match(/\{/g) || []).length;
  const closeBraces = (aggressive.match(/\}/g) || []).length;
  if (openBraces > closeBraces) {
    aggressive += '}'.repeat(openBraces - closeBraces);
  }

  const openBrackets = (aggressive.match(/\[/g) || []).length;
  const closeBrackets = (aggressive.match(/\]/g) || []).length;
  if (openBrackets > closeBrackets) {
    aggressive += ']'.repeat(openBrackets - closeBrackets);
  }

  try {
    return JSON.parse(aggressive);
  } catch (e) {
    // 最后尝试
  }

  // 8. 最后尝试：移除所有控制字符并重试
  const lastTry = aggressive.replace(/[\x00-\x1F\x7F]/g, ' ');

  try {
    return JSON.parse(lastTry);
  } catch (e) {
    // 打印调试信息
    console.error('JSON 解析最终失败');
    console.error('错误位置附近内容:', lastTry.substring(7400, 7450));
    throw e;
  }
}
