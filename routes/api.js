const express = require('express');
const router = express.Router();
const { getSupabase } = require('../supabase');
const { searchAllSources } = require('../services/newsSearch');
const { generateReport } = require('../services/deepseek');
const { sendReportEmail } = require('../services/email');

// 北京时间 0:00~10:00 时返回 36h（含昨日），否则 24h
function getSearchHoursBack() {
  const bjHour = new Date().getHours();
  return (bjHour >= 0 && bjHour < 10) ? 36 : 24;
}
module.exports.getSearchHoursBack = getSearchHoursBack;

/**
 * POST /api/subscribe
 */
router.post('/subscribe', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { email, celebrities, report_frequency, report_time, report_day } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: '请提供有效的邮箱地址' });
    }
    if (!celebrities || !Array.isArray(celebrities) || celebrities.length === 0) {
      return res.status(400).json({ error: '请至少选择一位名人红人' });
    }
    if (!report_time || !/^\d{2}:\d{2}$/.test(report_time)) {
      return res.status(400).json({ error: '请选择有效的汇报时间' });
    }
    const freq = report_frequency || 'daily';
    if (!['daily', 'weekly'].includes(freq)) {
      return res.status(400).json({ error: '汇报频率无效' });
    }
    if (freq === 'weekly' && (!report_day || report_day < 1 || report_day > 7)) {
      return res.status(400).json({ error: '请选择星期几' });
    }
    if (freq === 'daily' && report_time < '11:00') {
      return res.status(400).json({ error: '日度汇报只能选择北京时间 11:00~24:00' });
    }

    // 查询用量限制
    const { data: limits } = await supabase
      .from('usage_limits')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    const currentCount = limits ? limits.subscribe_count : 0;
    if (currentCount >= 3) {
      return res.status(400).json({ error: '您已达到订阅上限（3次），无法继续订阅' });
    }
    if (celebrities.length > 3) {
      return res.status(400).json({ error: '每次最多订阅 3 位名人红人' });
    }

    // 检查是否已有订阅（upsert）
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('users')
        .update({
          celebrities: JSON.stringify(celebrities),
          report_time,
          report_frequency: freq,
          report_day: freq === 'weekly' ? report_day : null
        })
        .eq('email', email);
      return res.json({ success: true, message: '订阅已更新' });
    }

    await supabase
      .from('users')
      .insert({
        email,
        celebrities: JSON.stringify(celebrities),
        report_time,
        report_frequency: freq,
        report_day: freq === 'weekly' ? report_day : null
      });

    // 更新用量
    if (limits) {
      await supabase
        .from('usage_limits')
        .update({ subscribe_count: limits.subscribe_count + 1 })
        .eq('email', email);
    } else {
      await supabase
        .from('usage_limits')
        .insert({ email, subscribe_count: 1 });
    }

    res.json({ success: true, message: `订阅成功！（剩余订阅次数：${2 - currentCount}）` });
  } catch (err) {
    console.error('订阅失败:', err);
    res.status(500).json({ error: '订阅失败，请稍后重试' });
  }
});

/**
 * POST /api/trigger-report
 */
router.post('/trigger-report', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { celebrity, email } = req.body;

    if (!celebrity) {
      return res.status(400).json({ error: '请选择一位名人红人' });
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: '请提供有效的邮箱地址' });
    }

    // 限制：最多 3 次手动触发
    const { data: limits } = await supabase
      .from('usage_limits')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    const triggerCount = limits ? limits.trigger_count : 0;
    if (triggerCount >= 3) {
      return res.status(400).json({ error: '您已达到手动触发生成上限（3次），无法继续使用' });
    }

    console.log(`手动触发: celebrity=${celebrity}, email=${email}`);

    const hoursBack = getSearchHoursBack();
    const articles = await searchAllSources(celebrity, hoursBack);
    console.log(`搜索到 ${articles.length} 条新闻`);

    let reportContent;
    try {
      reportContent = await generateReport(celebrity, articles);
    } catch (err) {
      return res.status(500).json({
        error: '汇报生成失败',
        detail: err.message,
        partial: true,
        articles
      });
    }

    const { data: report, error: insertErr } = await supabase
      .from('reports')
      .insert({
        celebrity,
        content: reportContent,
        type: 'manual',
        user_email: email
      })
      .select('id')
      .single();

    const reportId = insertErr ? null : report?.id;

    let emailSent = false;
    let emailError = null;
    try {
      await sendReportEmail(email, celebrity, reportContent);
      emailSent = true;
    } catch (err) {
      console.error('邮件发送失败:', err.message);
      emailError = err.message;
    }

    // 更新触发次数
    if (limits) {
      await supabase
        .from('usage_limits')
        .update({ trigger_count: limits.trigger_count + 1 })
        .eq('email', email);
    } else {
      await supabase
        .from('usage_limits')
        .insert({ email, trigger_count: 1 });
    }

    res.json({
      success: true,
      remaining_triggers: 2 - triggerCount,
      report: {
        id: reportId,
        celebrity,
        content: reportContent,
        type: 'manual',
        created_at: new Date().toISOString()
      },
      articles_count: articles.length,
      email_sent: emailSent,
      email_error: emailError
    });
  } catch (err) {
    console.error('手动触发失败:', err);
    res.status(500).json({ error: '操作失败，请稍后重试', detail: err.message });
  }
});

/**
 * GET /api/reports?email=xxx
 */
router.get('/reports', async (req, res) => {
  try {
    const supabase = getSupabase();
    const email = req.query.email || '';

    // 模拟数据 + 该用户的手动汇报
    let query = supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (email) {
      query = query.or(`type.eq.simulated,and(type.eq.manual,user_email.eq.${email})`);
    } else {
      query = query.eq('type', 'simulated');
    }

    const { data: reports, error } = await query;

    if (error) throw error;
    res.json({ reports: reports || [] });
  } catch (err) {
    console.error('获取汇报失败:', err);
    res.status(500).json({ error: '获取汇报失败' });
  }
});

/**
 * GET /api/reports/:id
 */
router.get('/reports/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data: report, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!report) {
      return res.status(404).json({ error: '汇报不存在' });
    }
    res.json({ report });
  } catch (err) {
    console.error('获取汇报失败:', err);
    res.status(500).json({ error: '获取汇报失败' });
  }
});

/**
 * GET /api/user/:email
 */
router.get('/user/:email', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', req.params.email)
      .maybeSingle();

    if (error) throw error;
    if (!user) {
      return res.json({ user: null });
    }
    res.json({
      user: {
        email: user.email,
        celebrities: typeof user.celebrities === 'string' ? JSON.parse(user.celebrities) : user.celebrities,
        report_time: user.report_time,
        report_frequency: user.report_frequency || 'daily',
        report_day: user.report_day || null,
        created_at: user.created_at
      }
    });
  } catch (err) {
    console.error('获取用户信息失败:', err);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

/**
 * POST /api/exit
 */
router.post('/exit', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: '请提供邮箱地址' });
    }

    await supabase.from('reports').delete().eq('user_email', email).eq('type', 'manual');
    await supabase.from('users').delete().eq('email', email);
    await supabase.from('usage_limits').delete().eq('email', email);

    res.json({ success: true, message: '已退出，所有记录已清除' });
  } catch (err) {
    console.error('退出失败:', err);
    res.status(500).json({ error: '退出失败' });
  }
});

/**
 * GET /api/limits/:email
 */
router.get('/limits/:email', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data: limits } = await supabase
      .from('usage_limits')
      .select('*')
      .eq('email', req.params.email)
      .maybeSingle();

    const subscribeCount = limits ? limits.subscribe_count : 0;
    const triggerCount = limits ? limits.trigger_count : 0;

    res.json({
      subscribe_count: subscribeCount,
      trigger_count: triggerCount,
      subscribe_remaining: 3 - subscribeCount,
      trigger_remaining: 3 - triggerCount
    });
  } catch (err) {
    res.status(500).json({ error: '获取失败' });
  }
});

/**
 * DELETE /api/unsubscribe
 */
router.delete('/unsubscribe', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: '请提供邮箱地址' });
    }
    await supabase.from('users').delete().eq('email', email);
    res.json({ success: true, message: '已取消订阅' });
  } catch (err) {
    console.error('取消订阅失败:', err);
    res.status(500).json({ error: '取消订阅失败' });
  }
});

module.exports = router;
