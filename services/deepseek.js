const axios = require('axios');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE = 'https://api.deepseek.com';

/**
 * 调用 DeepSeek API 生成汇报
 * @param {string} celebrity - 名人红人姓名
 * @param {Array} articles - 新闻文章列表
 * @returns {string} 生成的汇报内容
 */
async function generateReport(celebrity, articles) {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('未配置 DEEPSEEK_API_KEY 环境变量');
  }

  // 构建新闻摘要文本
  const articleTexts = articles.map((a, i) => {
    return `[${i + 1}] 标题：${a.title}\n   摘要：${a.snippet || '无摘要'}\n   来源：${a.source}（${a.sourceType}）\n   链接：${a.link}\n   时间：${a.pubDate instanceof Date ? a.pubDate.toISOString() : a.pubDate}`;
  }).join('\n\n');

  const prompt = `你是一位专业的娱乐新闻编辑。请根据以下关于「${celebrity}」的最新新闻资讯，生成一份"今日速览"汇报。

要求：
1. 总字数不超过 1000 字
2. 结构：一句话总览（概括今日整体动态）→ 3~6 个要点（每个要点简洁描述一条重要消息，要点后附上对应的来源链接）→ 结尾一句话总结
3. 默认中文输出；英文新闻需翻译成中文要点
4. 语气客观中立，不带主观评价
5. 文末标注"基于公开报道整理，仅供参考"
6. 使用 Markdown 格式输出

以下是搜索到的新闻资讯：
${articleTexts || '暂无相关新闻'}

请生成汇报：`;

  try {
    const resp = await axios.post(
      `${DEEPSEEK_BASE}/v1/chat/completions`,
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是专业的娱乐新闻编辑，擅长客观、简洁地整理新闻要点。' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1500,
        temperature: 0.7
      },
      {
        timeout: 60000,
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = resp.data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('DeepSeek API 返回为空');
    }
    return content;
  } catch (err) {
    if (err.response) {
      console.error('DeepSeek API 错误:', err.response.status, JSON.stringify(err.response.data));
      throw new Error(`DeepSeek API 返回错误 (${err.response.status})`);
    }
    console.error('DeepSeek API 调用失败:', err.message);
    throw err;
  }
}

module.exports = { generateReport };
