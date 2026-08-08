const axios = require('axios');
const Parser = require('rss-parser');
const cheerio = require('cheerio');

const rssParser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
});

/**
 * 从 Google News RSS 搜索新闻（中文版）
 */
async function searchGoogleNewsZh(query) {
  try {
    const encoded = encodeURIComponent(query);
    const url = `https://news.google.com/rss/search?q=${encoded}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`;
    const feed = await rssParser.parseURL(url);
    return (feed.items || []).map(item => ({
      title: item.title || '',
      snippet: item.contentSnippet || item.content || '',
      source: item.source?.name || extractSource(item.title),
      link: item.link || '',
      pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
      sourceType: 'Google News 中文'
    }));
  } catch (err) {
    console.warn(`Google News 中文搜索失败 (${query}):`, err.message);
    return [];
  }
}

/**
 * 从 Google News RSS 搜索新闻（英文版）
 */
async function searchGoogleNewsEn(query) {
  try {
    const encoded = encodeURIComponent(query);
    const url = `https://news.google.com/rss/search?q=${encoded}&hl=en-US&gl=US&ceid=US:en`;
    const feed = await rssParser.parseURL(url);
    return (feed.items || []).map(item => ({
      title: item.title || '',
      snippet: item.contentSnippet || item.content || '',
      source: item.source?.name || extractSource(item.title),
      link: item.link || '',
      pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
      sourceType: 'Google News 英文'
    }));
  } catch (err) {
    console.warn(`Google News 英文搜索失败 (${query}):`, err.message);
    return [];
  }
}

/**
 * 从百度新闻搜索
 */
async function searchBaiduNews(query) {
  try {
    const encoded = encodeURIComponent(query);
    const url = `https://www.baidu.com/s?wd=${encoded}&tn=news&rtt=1`;
    const resp = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9'
      }
    });
    const $ = cheerio.load(resp.data);
    const results = [];

    // 百度新闻搜索结果在 .result-op.c-container 中，第一个是热搜榜跳过
    $('.result-op.c-container').each((i, el) => {
      if (i === 0) return; // 跳过热搜榜

      const $el = $(el);
      const fullText = $el.text().trim();
      if (fullText.length < 20) return;

      // 解析文本结构：标题 + 时间 + 摘要 + 来源
      // 找到标题：通常是第一个较长的文本段
      const lines = fullText.split(/\s+/).filter(l => l.length > 2);
      if (lines.length < 2) return;

      // 标题通常是第一行（排除热搜标签）
      let title = lines[0];
      // 如果标题以数字开头（热搜编号），取第二行
      if (/^\d+$/.test(title) || title.length < 4) {
        title = lines[1] || title;
      }

      // 时间通常在标题之后
      let timeText = '';
      let dateMatch = fullText.match(/(\d+小时前|\d+分钟前|昨天|前天|\d{4}年\d{1,2}月\d{1,2}日|\d{1,2}月\d{1,2}日)/);
      if (dateMatch) {
        timeText = dateMatch[1];
      }

      // 来源通常在末尾
      let source = '百度新闻';
      const sourceMatch = fullText.match(/([一-龥]{2,10}(?:网|报|社|新闻|娱乐|财经|体育|客户端|APP))\s*$/);
      if (sourceMatch) {
        source = sourceMatch[1];
      }

      // 摘要：标题和来源之间的内容
      let snippet = fullText;
      if (title) snippet = snippet.replace(title, '');
      if (timeText) snippet = snippet.replace(timeText, '');
      if (source !== '百度新闻') snippet = snippet.replace(source, '');
      snippet = snippet.replace(/\s+/g, ' ').trim().substring(0, 200);

      // 查找链接
      let link = '';
      $el.find('a').each((_, a) => {
        const href = $(a).attr('href') || '';
        if (href.startsWith('http') && !link) {
          link = href;
        }
      });

      if (title && title.length > 3) {
        results.push({
          title,
          snippet,
          source,
          link,
          pubDate: parseChineseTime(timeText),
          sourceType: '百度新闻'
        });
      }
    });

    console.log(`百度新闻解析到 ${results.length} 条结果`);
    return results;
  } catch (err) {
    console.warn(`百度新闻搜索失败 (${query}):`, err.message);
    return [];
  }
}

/**
 * 解析中文时间格式（如 "2小时前"、"昨天"、"8月5日"）
 */
function parseChineseTime(text) {
  if (!text) return new Date();
  const now = new Date();

  const hourAgo = text.match(/(\d+)小时前/);
  if (hourAgo) {
    return new Date(now.getTime() - parseInt(hourAgo[1]) * 3600000);
  }

  const minAgo = text.match(/(\d+)分钟前/);
  if (minAgo) {
    return new Date(now.getTime() - parseInt(minAgo[1]) * 60000);
  }

  if (text.includes('昨天')) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return d;
  }

  if (text.includes('前天')) {
    const d = new Date(now);
    d.setDate(d.getDate() - 2);
    return d;
  }

  // 尝试匹配 "8月5日" 格式
  const monthDay = text.match(/(\d+)月(\d+)日/);
  if (monthDay) {
    const month = parseInt(monthDay[1]);
    const day = parseInt(monthDay[2]);
    const d = new Date(now.getFullYear(), month - 1, day);
    // 如果计算出的日期在未来，回退一年
    if (d > now) {
      d.setFullYear(d.getFullYear() - 1);
    }
    return d;
  }

  return now;
}

/**
 * 从标题中提取来源（如 "标题 - 来源"）
 */
function extractSource(title) {
  const parts = title.split(' - ');
  if (parts.length > 1) {
    const last = parts[parts.length - 1].trim();
    // 如果最后部分看起来像来源名称
    if (last.length < 30 && !last.includes('http')) {
      return last;
    }
  }
  return '未知来源';
}

/**
 * 去重：基于标题相似度简单去重
 */
function deduplicate(articles) {
  const seen = new Set();
  return articles.filter(a => {
    // 取标题前20个字符作为去重键
    const key = a.title.substring(0, 20).replace(/\s+/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * 聚合搜索：并行搜索所有源，合并去重，保留指定时间窗口内的新闻
 * @param {string} query - 搜索关键词
 * @param {number} hoursBack - 保留最近多少小时的新闻（默认 24）
 */
async function searchAllSources(query, hoursBack = 24) {
  console.log(`开始聚合搜索: "${query}"，时间窗口: ${hoursBack}h`);

  const [zhResults, enResults, baiduResults] = await Promise.all([
    searchGoogleNewsZh(query),
    searchGoogleNewsEn(query),
    searchBaiduNews(query)
  ]);

  console.log(`搜索结果: Google中文=${zhResults.length}, Google英文=${enResults.length}, 百度=${baiduResults.length}`);

  // 合并
  let all = [...zhResults, ...enResults, ...baiduResults];

  // 去重
  all = deduplicate(all);

  // 只保留近 hoursBack 小时的
  const cutoff = new Date(Date.now() - hoursBack * 3600000);
  all = all.filter(a => a.pubDate >= cutoff);

  // 按时间倒序
  all.sort((a, b) => b.pubDate - a.pubDate);

  // 取前 15 条
  const top = all.slice(0, 15);

  console.log(`聚合后结果: ${all.length} 条, 取前 ${top.length} 条`);
  return top;
}

module.exports = { searchAllSources };
