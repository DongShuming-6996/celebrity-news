// ====== 名人红人列表 ======
const CELEBRITIES = [
  '张雅琪', '韩红', '王虹', '西村力', '邓煜',
  '周杰伦', '刘德华', '张学友', '王菲', '林俊杰',
  '陈奕迅', '蔡依林', '邓紫棋', '五月天', '孙燕姿',
  '张惠妹', '萧敬腾', 'Taylor Swift', 'Beyoncé', 'Ed Sheeran',
  'Adele', 'BTS', 'BLACKPINK', 'Bruno Mars', 'Lady Gaga',
  '王一博', '肖战', '易烊千玺', '王嘉尔', '张艺兴'
];

// ====== 全局状态 ======
let selectedCelebrities = [];
let userEmail = '';
let reportFrequency = 'daily';
let reportDay = null;

// ====== 初始化 ======
document.addEventListener('DOMContentLoaded', async () => {
  userEmail = localStorage.getItem('celebnews_email') || '';
  if (userEmail) {
    document.getElementById('email').value = userEmail;
  }

  initSplashModal();
  initFrequencyToggle();
  initDayPicker();
  initCelebritySelect();
  initSubscribeForm();
  initTriggerButton();
  initExitButton();
  initBeforeUnload();
  loadReports();
  loadMySubscription();
  loadLimits();
  initNavHighlight();
});

// ====== 导航高亮：滚动时高亮当前区域 ======
function initNavHighlight() {
  const sections = [
    { id: 'main-section', nav: document.querySelector('.nav-item[href="#main-section"]') },
    { id: 'my-subscription-section', nav: document.querySelector('.nav-item[href="#my-subscription-section"]') },
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

  // 点击导航也高亮，但需要订阅的栏目做拦截
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const href = item.getAttribute('href');
      // 管理订阅 & 最新汇报需要已有订阅
      if ((href === '#my-subscription-section' || href === '#result-section') && !userEmail) {
        e.preventDefault();
        document.getElementById('no-sub-modal').style.display = 'flex';
        return;
      }
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
    });
  });

  // 无订阅弹窗关闭
  document.getElementById('no-sub-dismiss').addEventListener('click', () => {
    document.getElementById('no-sub-modal').style.display = 'none';
  });
  document.getElementById('no-sub-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('no-sub-modal')) {
      document.getElementById('no-sub-modal').style.display = 'none';
    }
  });
}

// ====== 开屏弹窗 ======
function initSplashModal() {
  const modal = document.getElementById('splash-modal');
  const dismissBtn = document.getElementById('splash-dismiss');
  if (sessionStorage.getItem('splash-dismissed') === 'true') {
    modal.style.display = 'none';
    return;
  }
  dismissBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    sessionStorage.setItem('splash-dismissed', 'true');
  });
}

// ====== 退出功能 ======
function initExitButton() {
  const exitBtn = document.getElementById('exit-btn');
  const exitModal = document.getElementById('exit-modal');
  const exitConfirm = document.getElementById('exit-confirm');
  const exitCancel = document.getElementById('exit-cancel');

  exitBtn.addEventListener('click', () => {
    exitModal.style.display = 'flex';
  });

  exitCancel.addEventListener('click', () => {
    exitModal.style.display = 'none';
  });

  exitModal.addEventListener('click', (e) => {
    if (e.target === exitModal) exitModal.style.display = 'none';
  });

  exitConfirm.addEventListener('click', async () => {
    doExit();
  });
}

async function doExit() {
  if (userEmail) {
    try {
      await fetch('/api/exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
        keepalive: true
      });
    } catch (e) {}
  }

  localStorage.removeItem('celebnews_email');
  userEmail = '';
  document.getElementById('email').value = '';
  selectedCelebrities = [];
  if (window.updateSelectedDisplay) window.updateSelectedDisplay();
  document.getElementById('trigger-status').style.display = 'none';
  document.getElementById('subscribe-status').style.display = 'none';
  document.getElementById('result-section').style.display = 'none';
  document.getElementById('my-subscription-section').style.display = 'none';
  document.getElementById('exit-modal').style.display = 'none';

  loadReports();
}

// ====== beforeunload — 关闭页面前清理 ======
function initBeforeUnload() {
  window.addEventListener('beforeunload', (e) => {
    if (userEmail) {
      // 发送清理请求（keepalive 确保发出）
      fetch('/api/exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
        keepalive: true
      }).catch(() => {});
    }
    // 现代浏览器会显示自己的提示
    e.preventDefault();
  });
}

// ====== 频率切换 ======
function initFrequencyToggle() {
  const options = document.querySelectorAll('.freq-option');
  const weeklyRow = document.getElementById('weekly-row');
  const dailyRow = document.getElementById('daily-row');

  options.forEach(opt => {
    opt.addEventListener('click', () => {
      options.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      reportFrequency = opt.dataset.freq;
      if (reportFrequency === 'weekly') {
        weeklyRow.style.display = 'grid';
        dailyRow.style.display = 'none';
      } else {
        weeklyRow.style.display = 'none';
        dailyRow.style.display = 'block';
      }
    });
  });
}

// ====== 星期选择 ======
function initDayPicker() {
  const dayOptions = document.querySelectorAll('.day-option');
  dayOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      dayOptions.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      reportDay = parseInt(opt.dataset.day);
    });
  });
  const defaultDay = document.querySelector('.day-option[data-day="1"]');
  if (defaultDay) { defaultDay.classList.add('active'); reportDay = 1; }
}

// ====== 用量查询 ======
async function loadLimits() {
  if (!userEmail) return;
  try {
    const resp = await fetch(`/api/limits/${encodeURIComponent(userEmail)}`);
    const data = await resp.json();
    document.getElementById('subscribe-btn').title = `剩余订阅：${data.subscribe_remaining}次`;
    document.getElementById('trigger-btn').title = `剩余手动触发：${data.trigger_remaining}次`;
  } catch (e) {}
}

// ====== 多选名人红人组件 ======
function initCelebritySelect() {
  const wrapper = document.getElementById('celebrity-select-wrapper');
  const trigger = document.getElementById('celebrity-select-trigger');
  const dropdown = document.getElementById('celebrity-dropdown');
  const searchInput = document.getElementById('celebrity-search');
  const listEl = document.getElementById('celebrity-list');
  const placeholder = document.getElementById('celebrity-placeholder');
  const tagsContainer = document.getElementById('selected-celebrities');
  const customHint = document.getElementById('dropdown-custom');

  function getFilteredCelebrities(filter) {
    return CELEBRITIES.filter(c => c.toLowerCase().includes(filter.toLowerCase()));
  }

  function renderList(filter = '') {
    const filtered = getFilteredCelebrities(filter);
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
      if (selectedCelebrities.length >= 3) {
        alert('最多选择3位名人红人');
        renderList(document.getElementById('celebrity-search').value);
        return;
      }
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
      const isCustom = !CELEBRITIES.slice(0, 25).includes(c);
      return `<span class="selected-tag ${isCustom ? 'custom' : ''}">${c}<span class="remove-tag" onclick="window._removeCelebrity('${c.replace(/'/g, "\\'")}')">&times;</span></span>`;
    }).join('');
  };

  window._removeCelebrity = function(name) {
    selectedCelebrities = selectedCelebrities.filter(c => c !== name);
    window.updateSelectedDisplay();
    renderList(document.getElementById('celebrity-search').value);
  };

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
    if (dropdown.classList.contains('open')) { searchInput.focus(); renderList(searchInput.value); }
  });

  searchInput.addEventListener('input', (e) => renderList(e.target.value));
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const customName = searchInput.dataset.customName || searchInput.value;
      if (customName && customName.trim()) addCustomCelebrity(customName);
    }
  });
  searchInput.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', (e) => { if (!wrapper.contains(e.target)) dropdown.classList.remove('open'); });

  renderList();
}

// ====== 订阅表单 ======
function initSubscribeForm() {
  const form = document.getElementById('subscribe-form');
  const statusEl = document.getElementById('subscribe-status');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();

    if (!email || !email.includes('@')) { showStatus(statusEl, '请提供有效的邮箱地址', 'error'); return; }
    if (selectedCelebrities.length === 0) { showStatus(statusEl, '请至少选择一位名人红人', 'error'); return; }
    if (selectedCelebrities.length > 3) { showStatus(statusEl, '最多选择3位名人红人', 'error'); return; }

    userEmail = email;
    localStorage.setItem('celebnews_email', email);

    let time, freq = reportFrequency, day = null;
    if (freq === 'weekly') {
      time = document.getElementById('report-time').value;
      day = reportDay;
      if (!day) { showStatus(statusEl, '请选择星期几', 'error'); return; }
    } else {
      time = document.getElementById('report-time-daily').value;
    }
    if (!time) { showStatus(statusEl, '请选择汇报时间', 'error'); return; }

    const btn = document.getElementById('subscribe-btn');
    btn.disabled = true;
    btn.textContent = '⏳ 订阅中...';

    try {
      const resp = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, celebrities: selectedCelebrities, report_frequency: freq, report_time: time, report_day: day })
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        showStatus(statusEl, `✅ ${data.message}`, 'success');
        loadMySubscription();
        loadLimits();
      } else {
        showStatus(statusEl, `❌ ${data.error}`, 'error');
      }
    } catch (err) {
      showStatus(statusEl, '❌ 网络错误', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '📩 订阅';
    }
  });
}

// ====== 我的订阅 ======
async function loadMySubscription() {
  const section = document.getElementById('my-subscription-section');
  const content = document.getElementById('my-subscription-content');
  if (!userEmail) { section.style.display = 'none'; return; }

  try {
    const resp = await fetch(`/api/user/${encodeURIComponent(userEmail)}`);
    const data = await resp.json();
    if (!data.user) { section.style.display = 'none'; return; }

    section.style.display = 'block';
    const u = data.user;
    const freqText = u.report_frequency === 'weekly'
      ? `每周${['','一','二','三','四','五','六','日'][u.report_day]}`
      : '每日';
    const celebs = u.celebrities.join('、');

    content.innerHTML = `
      <div class="subscription-card">
        <div class="subscription-info">
          <span class="sub-celebrities">🌟 ${celebs}</span>
          <span class="sub-meta">${freqText} ${u.report_time} · 发送一次后自动取消</span>
        </div>
        <button class="btn-danger" onclick="unsubscribe()">撤销订阅</button>
      </div>
    `;
  } catch (e) {
    section.style.display = 'none';
  }
}

window.unsubscribe = async function() {
  if (!confirm('确定撤销订阅吗？')) return;
  try {
    await fetch('/api/unsubscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail })
    });
    loadMySubscription();
    showStatus(document.getElementById('subscribe-status'), '✅ 已撤销订阅', 'success');
  } catch (e) {
    alert('撤销失败');
  }
};

// ====== 手动触发（先弹确认窗） ======
function initTriggerButton() {
  const btn = document.getElementById('trigger-btn');
  const confirmModal = document.getElementById('trigger-confirm-modal');
  const confirmBtn = document.getElementById('trigger-confirm-btn');
  const cancelBtn = document.getElementById('trigger-cancel-btn');

  btn.addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();
    if (!email || !email.includes('@')) {
      showStatus(document.getElementById('trigger-status'), '请先在上方填写邮箱地址', 'error');
      return;
    }
    if (selectedCelebrities.length === 0) {
      showStatus(document.getElementById('trigger-status'), '请先选择至少一位名人红人', 'error');
      return;
    }
    confirmModal.style.display = 'flex';
  });

  cancelBtn.addEventListener('click', () => { confirmModal.style.display = 'none'; });
  confirmModal.addEventListener('click', (e) => { if (e.target === confirmModal) confirmModal.style.display = 'none'; });

  confirmBtn.addEventListener('click', async () => {
    confirmModal.style.display = 'none';
    await doTrigger();
  });
}

async function doTrigger() {
  const email = document.getElementById('email').value.trim();
  const statusEl = document.getElementById('trigger-status');
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingText = document.getElementById('loading-text');
  const resultSection = document.getElementById('result-section');
  const resultContent = document.getElementById('result-content');

  userEmail = email;
  localStorage.setItem('celebnews_email', email);

  const btn = document.getElementById('trigger-btn');
  btn.disabled = true;
  document.getElementById('subscribe-btn').disabled = true;
  statusEl.style.display = 'none';
  resultSection.style.display = 'none';
  loadingOverlay.style.display = 'flex';
  resetLoadingSteps();

  const allResults = [];
  let lastError = null;

  for (let i = 0; i < selectedCelebrities.length; i++) {
    const celebrity = selectedCelebrities[i];
    updateLoadingStep('step-search', 'active');
    updateLoadingStep('step-generate', '');
    updateLoadingStep('step-email', '');
    loadingText.textContent = `正在搜索「${celebrity}」的新闻...`;

    try {
      const resp = await fetch('/api/trigger-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ celebrity, email })
      });
      updateLoadingStep('step-search', 'done');
      updateLoadingStep('step-generate', 'active');
      loadingText.textContent = `AI 正在生成「${celebrity}」的汇报...`;

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        updateLoadingStep('step-generate', 'error');
        lastError = data.error || '未知错误';
        continue;
      }
      updateLoadingStep('step-generate', 'done');
      updateLoadingStep('step-email', 'active');
      loadingText.textContent = '正在发送邮件...';

      if (data.email_sent) { updateLoadingStep('step-email', 'done'); }
      else { updateLoadingStep('step-email', 'error'); }

      allResults.push(data.report);
      // 显示剩余次数
      if (data.remaining_triggers !== undefined) {
        showStatus(statusEl, `✅ 已完成，剩余立即搜索并生成汇报次数：${data.remaining_triggers}`, 'info');
        loadLimits();
      }
    } catch (err) {
      updateLoadingStep('step-generate', 'error');
      lastError = err.message;
    }
  }

  loadingText.textContent = allResults.length > 0 ? '✅ 全部完成！' : '⚠️ 部分失败';

  if (allResults.length > 0) {
    resultSection.style.display = 'block';
    resultContent.innerHTML = allResults.map(r => renderReport(r)).join('<hr style="margin:30px 0;border-color:var(--border)">');
    if (lastError) showStatus(statusEl, `⚠️ 部分汇报生成失败：${lastError}`, 'error');
  } else if (lastError) {
    showStatus(statusEl, `❌ ${lastError}`, 'error');
  }

  loadReports();
  btn.disabled = false;
  document.getElementById('subscribe-btn').disabled = false;
  setTimeout(() => { loadingOverlay.style.display = 'none'; }, 1000);
}

// ====== 加载动画 ======
function resetLoadingSteps() {
  ['step-search', 'step-generate', 'step-email'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.className = 'step';
  });
}
function updateLoadingStep(stepId, status) {
  const el = document.getElementById(stepId);
  if (el) el.className = 'step ' + (status || '');
}

// ====== 历史汇报 ======
async function loadReports() {
  const listEl = document.getElementById('history-list');
  try {
    const emailParam = userEmail ? '?email=' + encodeURIComponent(userEmail) : '';
    const resp = await fetch('/api/reports' + emailParam);
    const data = await resp.json();
    if (!data.reports || data.reports.length === 0) {
      listEl.innerHTML = '<p style="text-align:center;color:rgba(255,255,255,0.25);padding:28px;">暂无汇报记录</p>';
      return;
    }
    listEl.innerHTML = data.reports.map(r => {
      const date = new Date(r.created_at);
      const dateStr = date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
      const preview = stripMarkdown(r.content).substring(0, 100) + '...';
      const badgeClass = r.type === 'simulated' ? 'simulated' : 'manual';
      const badgeText = r.type === 'simulated' ? '模拟预览' : '真实汇报';
      return `<div class="history-item" onclick="showReportDetail(${r.id})"><div class="hi-header"><span class="hi-celebrity">🌟 ${r.celebrity}</span><span class="hi-date">${dateStr} · <span class="badge ${badgeClass}">${badgeText}</span></span></div><div class="hi-preview">${preview}</div></div>`;
    }).join('');
  } catch (err) {
    listEl.innerHTML = '<p style="text-align:center;color:#e74c3c;padding:28px;">加载失败，请刷新页面</p>';
  }
}

// ====== 汇报详情弹窗 ======
async function showReportDetail(id) {
  try {
    const resp = await fetch(`/api/reports/${id}`);
    const data = await resp.json();
    if (!data.report) { alert('汇报不存在'); return; }

    const report = data.report;
    const date = new Date(report.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' });
    const badgeClass = report.type === 'simulated' ? 'simulated' : 'manual';
    const badgeText = report.type === 'simulated' ? '模拟预览' : '真实汇报';

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

// ====== Markdown -> HTML ======
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

function showStatus(el, message, type) {
  el.textContent = message;
  el.className = 'status-message ' + type;
  el.style.display = 'block';
  if (type === 'success') setTimeout(() => { el.style.display = 'none'; }, 6000);
}
