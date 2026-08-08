// ====== Supabase 客户端（延迟初始化，避免 CDN 加载失败阻塞页面） ======
const SUPABASE_URL = 'https://gzioblxapcnzijjhlqoa.getSupabase().co';
const SUPABASE_ANON_KEY = 'sb_publishable_XUbV97b1tOL7vMclKQAyMQ_s2gxUICs';
let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  if (!window.supabase) throw new Error('Supabase 未加载，请刷新页面重试');
  _supabase = window.getSupabase().createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _supabase;
}

// ====== DeepSeek 配置（⚠️ 部署前请将下方占位符替换为你的 API Key） ======
const DEEPSEEK_API_KEY = 'sk-5c1cd1fef1c94effa13092b3f75a7802';

// ====== 名人红人列表 ======
const CELEBRITIES = [
  '张雅琪', '韩红', '王虹', '西村力', '邓煜',
  '周杰伦', '刘德华', '张学友', '王菲', '林俊杰',
  '陈奕迅', '蔡依林', '邓紫棋', '五月天', '孙燕姿',
  '张惠妹', '萧敬腾', 'Taylor Swift', 'Beyoncé', 'Ed Sheeran',
  'Adele', 'BTS', 'BLACKPINK', 'Bruno Mars', 'Lady Gaga',
  '王一博', '肖战', '易烊千玺', '王嘉尔', '张艺兴'
];

let selectedCelebrities = [];

// ====== 初始化 ======
document.addEventListener('DOMContentLoaded', () => {
  initSplashModal();
  initCelebritySelect();
  initTriggerButton();
  initNavHighlight();
  loadReports();
});

// ====== 开屏弹窗 ======
function initSplashModal() {
  const modal = document.getElementById('splash-modal');
  if (sessionStorage.getItem('splash-dismissed') === 'true') {
    modal.style.display = 'none';
    return;
  }
  document.getElementById('splash-dismiss').addEventListener('click', () => {
    modal.style.display = 'none';
    sessionStorage.setItem('splash-dismissed', 'true');
  });
}

// ====== 导航高亮 ======
function initNavHighlight() {
  const sections = [
    { id: 'main-section', nav: document.querySelector('.nav-item[href="#main-section"]') },
    { id: 'result-section', nav: document.querySelector('.nav-item[href="#result-section"]') },
    { id: 'history-section', nav: document.querySelector('.nav-item[href="#history-section"]') }
  ];
  const navItems = document.querySelectorAll('.nav-item');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navItems.forEach(n => n.classList.remove('active'));
        const match = sections.find(s => s.id === entry.target.id);
        if (match && match.nav) match.nav.classList.add('active');
      }
    });
  }, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });

  sections.forEach(s => {
    const el = document.getElementById(s.id);
    if (el) observer.observe(el);
  });

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
    });
  });
}

// ====== 名人红人多选组件 ======
function initCelebritySelect() {
  const wrapper = document.getElementById('celebrity-select-wrapper');
  const trigger = document.getElementById('celebrity-select-trigger');
  const dropdown = document.getElementById('celebrity-dropdown');
  const searchInput = document.getElementById('celebrity-search');
  const listEl = document.getElementById('celebrity-list');
  const placeholder = document.getElementById('celebrity-placeholder');
  const tagsContainer = document.getElementById('selected-celebrities');
  const customHint = document.getElementById('dropdown-custom');

  function renderList(filter = '') {
    const filtered = CELEBRITIES.filter(c => c.toLowerCase().includes(filter.toLowerCase()));
    listEl.innerHTML = filtered.map(c => {
      const checked = selectedCelebrities.includes(c) ? 'checked' : '';
      return `<label class="dropdown-item"><input type="checkbox" value="${c}" ${checked} onchange="window._toggleCelebrity('${c}', this.checked)"><span>${c}</span></label>`;
    }).join('');
    if (filter.length >= 1 && !CELEBRITIES.some(c => c === filter)) {
      customHint.style.display = 'block';
      searchInput.dataset.customName = filter;
    } else {
      customHint.style.display = 'none';
      delete searchInput.dataset.customName;
    }
  }

  window._toggleCelebrity = function(name, checked) {
    if (checked) {
      if (selectedCelebrities.length >= 3) { alert('最多选择3位名人红人'); renderList(document.getElementById('celebrity-search').value); return; }
      if (!selectedCelebrities.includes(name)) selectedCelebrities.push(name);
    } else {
      selectedCelebrities = selectedCelebrities.filter(c => c !== name);
    }
    updateSelectedDisplay();
  };

  function addCustomCelebrity(name) {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 1) return;
    if (selectedCelebrities.includes(trimmed)) return;
    if (selectedCelebrities.length >= 3) { alert('最多选择3位名人红人'); return; }
    selectedCelebrities.push(trimmed);
    if (!CELEBRITIES.includes(trimmed)) CELEBRITIES.push(trimmed);
    updateSelectedDisplay();
    searchInput.value = '';
    renderList('');
    customHint.style.display = 'none';
    delete searchInput.dataset.customName;
  }

  window.updateSelectedDisplay = function() {
    if (selectedCelebrities.length === 0) {
      placeholder.textContent = '点击选择或输入自定义名人红人...';
      placeholder.style.color = 'rgba(255,255,255,0.25)';
    } else {
      placeholder.textContent = `已选 ${selectedCelebrities.length} 位名人红人`;
      placeholder.style.color = '#e8e8f0';
    }
    tagsContainer.innerHTML = selectedCelebrities.map(c => {
      const isCustom = !CELEBRITIES.slice(0, 30).includes(c);
      return `<span class="selected-tag ${isCustom ? 'custom' : ''}">${c}<span class="remove-tag" onclick="window._removeCelebrity('${c.replace(/'/g, "\\'")}')">&times;</span></span>`;
    }).join('');
  };

  window._removeCelebrity = function(name) {
    selectedCelebrities = selectedCelebrities.filter(c => c !== name);
    window.updateSelectedDisplay();
    renderList(document.getElementById('celebrity-search').value);
  };

  trigger.addEventListener('click', (e) => { e.stopPropagation(); dropdown.classList.toggle('open'); if (dropdown.classList.contains('open')) { searchInput.focus(); renderList(searchInput.value); } });
  searchInput.addEventListener('input', (e) => renderList(e.target.value));
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); const cn = searchInput.dataset.customName || searchInput.value; if (cn && cn.trim()) addCustomCelebrity(cn); }
  });
  searchInput.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', (e) => { if (!wrapper.contains(e.target)) dropdown.classList.remove('open'); });
  renderList();
}

// ====== 生成汇报按钮 ======
function initTriggerButton() {
  document.getElementById('trigger-btn').addEventListener('click', async () => {
    if (selectedCelebrities.length === 0) {
      showStatus(document.getElementById('trigger-status'), '请先选择至少一位名人红人', 'error');
      return;
    }
    await doGenerate();
  });
}

// ====== 新闻搜索（浏览器端，带超时保护） ======
async function searchNews(query) {
  const articles = [];
  const encoded = encodeURIComponent(query);

  async function fetchWithTimeout(url, timeoutMs = 8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      return resp;
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  }

  // Google News 中文
  try {
    const url = `https://news.google.com/rss/search?q=${encoded}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`;
    const resp = await fetchWithTimeout(url);
    const text = await resp.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'application/xml');
    doc.querySelectorAll('item').forEach(item => {
      const title = item.querySelector('title')?.textContent || '';
      const link = item.querySelector('link')?.textContent || '';
      const snippet = item.querySelector('description')?.textContent || '';
      const pubDate = item.querySelector('pubDate')?.textContent;
      const source = item.querySelector('source')?.textContent || 'Google News';
      articles.push({ title, snippet: stripHtml(snippet).substring(0, 200), source, link, pubDate: pubDate ? new Date(pubDate) : new Date(), sourceType: 'Google News 中文' });
    });
  } catch (e) { console.warn('Google News 中文搜索失败:', e.message); }

  // Google News 英文
  try {
    const url = `https://news.google.com/rss/search?q=${encoded}&hl=en-US&gl=US&ceid=US:en`;
    const resp = await fetchWithTimeout(url);
    const text = await resp.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'application/xml');
    doc.querySelectorAll('item').forEach(item => {
      const title = item.querySelector('title')?.textContent || '';
      const link = item.querySelector('link')?.textContent || '';
      const snippet = item.querySelector('description')?.textContent || '';
      const pubDate = item.querySelector('pubDate')?.textContent;
      const source = item.querySelector('source')?.textContent || 'Google News';
      articles.push({ title, snippet: stripHtml(snippet).substring(0, 200), source, link, pubDate: pubDate ? new Date(pubDate) : new Date(), sourceType: 'Google News 英文' });
    });
  } catch (e) { console.warn('Google News 英文搜索失败:', e.message); }

  // 去重 + 按时间排序 + 取前15条
  const seen = new Set();
  let deduped = articles.filter(a => { const k = a.title.substring(0, 30); if (seen.has(k)) return false; seen.add(k); return true; });
  const cutoff = new Date(Date.now() - 48 * 3600000);
  deduped = deduped.filter(a => a.pubDate >= cutoff);
  deduped.sort((a, b) => b.pubDate - a.pubDate);
  return deduped.slice(0, 15);
}

function stripHtml(html) { const tmp = document.createElement('div'); tmp.innerHTML = html; return tmp.textContent || ''; }

// ====== DeepSeek AI 生成汇报 ======
async function generateReport(celebrity, articles) {
  const articleTexts = articles.map((a, i) =>
    `[${i + 1}] 标题：${a.title}\n   摘要：${a.snippet || '无摘要'}\n   来源：${a.source}（${a.sourceType}）\n   链接：${a.link}`
  ).join('\n\n');

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

  const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是专业的娱乐新闻编辑，擅长客观、简洁地整理新闻要点。' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1500,
      temperature: 0.7
    })
  });

  if (!resp.ok) throw new Error(`DeepSeek API 错误 (${resp.status})`);
  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('DeepSeek API 返回为空');
  return content;
}

// ====== 生成流程 ======
async function doGenerate() {
  const statusEl = document.getElementById('trigger-status');
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingText = document.getElementById('loading-text');
  const resultSection = document.getElementById('result-section');
  const resultContent = document.getElementById('result-content');
  const btn = document.getElementById('trigger-btn');

  btn.disabled = true;
  statusEl.style.display = 'none';
  resultSection.style.display = 'none';
  loadingOverlay.style.display = 'flex';
  resetLoadingSteps();

  const allResults = [];

  for (let i = 0; i < selectedCelebrities.length; i++) {
    const celebrity = selectedCelebrities[i];
    updateLoadingStep('step-search', 'active');
    updateLoadingStep('step-generate', '');
    updateLoadingStep('step-save', '');
    loadingText.textContent = `正在搜索「${celebrity}」的新闻...`;

    try {
      const articles = await searchNews(celebrity);
      if (articles.length > 0) {
        updateLoadingStep('step-search', 'done');
      } else {
        updateLoadingStep('step-search', 'done');
        loadingText.textContent = `未获取到实时新闻，AI 将基于已有知识生成「${celebrity}」的汇报...`;
      }
      updateLoadingStep('step-generate', 'active');
      loadingText.textContent = `AI 正在生成「${celebrity}」的汇报...`;

      const content = await generateReport(celebrity, articles);
      updateLoadingStep('step-generate', 'done');
      updateLoadingStep('step-save', 'active');
      loadingText.textContent = '正在保存记录...';

      const { error } = await getSupabase().from('reports').insert({
        celebrity, content, type: 'manual'
      });

      if (error) { updateLoadingStep('step-save', 'error'); console.error('保存失败:', error); }
      else { updateLoadingStep('step-save', 'done'); }

      allResults.push({ celebrity, content, type: 'manual', created_at: new Date().toISOString() });
    } catch (err) {
      updateLoadingStep('step-generate', 'error');
      showStatus(statusEl, `❌ 「${celebrity}」生成失败：${err.message}`, 'error');
    }
  }

  loadingText.textContent = allResults.length > 0 ? '✅ 全部完成！' : '⚠️ 生成失败';

  if (allResults.length > 0) {
    resultSection.style.display = 'block';
    resultContent.innerHTML = allResults.map(r => renderReport(r)).join('<hr style="margin:30px 0;border-color:var(--border)">');
    showStatus(statusEl, `✅ 已生成 ${allResults.length} 份汇报`, 'success');
  }

  loadReports();
  btn.disabled = false;
  setTimeout(() => { loadingOverlay.style.display = 'none'; }, 800);
}

// ====== 历史汇报 ======
async function loadReports() {
  const listEl = document.getElementById('history-list');
  try {
    const { data: reports } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (!reports || reports.length === 0) {
      listEl.innerHTML = '<p style="text-align:center;color:rgba(255,255,255,0.25);padding:28px;">暂无汇报记录</p>';
      return;
    }
    listEl.innerHTML = reports.map(r => {
      const date = new Date(r.created_at);
      const dateStr = date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
      const preview = stripMarkdown(r.content).substring(0, 100) + '...';
      const badgeClass = r.type === 'simulated' ? 'simulated' : 'manual';
      const badgeText = r.type === 'simulated' ? '模拟预览' : 'AI 生成';
      return `<div class="history-item" onclick="showReportDetail(${r.id})"><div class="hi-header"><span class="hi-celebrity">🌟 ${r.celebrity}</span><span class="hi-date">${dateStr} · <span class="badge ${badgeClass}">${badgeText}</span></span></div><div class="hi-preview">${preview}</div></div>`;
    }).join('');
  } catch (err) { listEl.innerHTML = '<p style="text-align:center;color:#e74c3c;padding:28px;">加载失败，请刷新页面</p>'; }
}

// ====== 汇报详情弹窗 ======
async function showReportDetail(id) {
  try {
    const { data: report } = await getSupabase().from('reports').select('*').eq('id', id).maybeSingle();
    if (!report) { alert('汇报不存在'); return; }

    const date = new Date(report.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' });
    const badgeClass = report.type === 'simulated' ? 'simulated' : 'manual';
    const badgeText = report.type === 'simulated' ? '模拟预览' : 'AI 生成';

    const overlay = document.createElement('div');
    overlay.className = 'detail-modal-overlay';
    overlay.innerHTML = `<div class="detail-modal"><button class="close-btn">&times;</button><div class="report-meta"><span>🌟 <strong>${report.celebrity}</strong></span><span>${date}</span><span class="badge ${badgeClass}">${badgeText}</span></div><div class="report-content">${renderReport(report)}</div></div>`;
    document.body.appendChild(overlay);

    const close = () => { document.body.removeChild(overlay); };
    overlay.querySelector('.close-btn').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
  } catch (err) { alert('加载汇报详情失败: ' + err.message); }
}

// ====== Markdown → HTML ======
function renderReport(report) {
  if (!report || !report.content) return '<p>暂无内容</p>';
  let html = report.content;
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/^---$/gm, '<hr>');
  html = html.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
  html = '<p>' + html + '</p>';
  html = html.replace(/<p>\s*<h/g, '<h').replace(/<\/h([23])>\s*<\/p>/g, '</h$1>').replace(/<p>\s*<\/p>/g, '').replace(/<p><br>\s*<\/p>/g, '');
  return html;
}

function stripMarkdown(md) {
  return md.replace(/^#+\s/gm, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/^[-*]\s/gm, '').replace(/^\d+\.\s/gm, '').replace(/---/g, '').replace(/\n+/g, ' ').trim();
}

// ====== 辅助 ======
function showStatus(el, message, type) {
  el.textContent = message; el.className = 'status-message ' + type; el.style.display = 'block';
  if (type === 'success') setTimeout(() => { el.style.display = 'none'; }, 6000);
}
function resetLoadingSteps() {
  ['step-search', 'step-generate', 'step-save'].forEach(id => { const el = document.getElementById(id); if (el) el.className = 'step'; });
}
function updateLoadingStep(stepId, status) {
  const el = document.getElementById(stepId); if (el) el.className = 'step ' + (status || '');
}
