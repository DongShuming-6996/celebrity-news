require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const apiRoutes = require('./routes/api');
const { getSupabase } = require('./supabase');
const { getSearchHoursBack } = require('./routes/api');
const { searchAllSources } = require('./services/newsSearch');
const { generateReport } = require('./services/deepseek');
const { sendReportEmail } = require('./services/email');

const app = express();
const PORT = process.env.PORT || 3000;

// 名人红人照片目录
const PHOTOS_DIR = '/Users/dongshuming/Desktop/名人红人照片';

// 中间件
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/photos', express.static(PHOTOS_DIR));

// 照片列表 API（递归扫描所有子文件夹）
app.get('/api/photos', (req, res) => {
  try {
    const photos = [];
    function scanDir(dir, category) {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath, entry.name);
        } else if (entry.name.endsWith('.jpg') || entry.name.endsWith('.jpeg') || entry.name.endsWith('.png')) {
          const name = entry.name.replace(/\.(jpg|jpeg|png)$/i, '');
          const relPath = path.relative(PHOTOS_DIR, fullPath);
          photos.push({
            name,
            category: category || '其他',
            url: '/photos/' + relPath.replace(/\\/g, '/'),
            filename: entry.name
          });
        }
      }
    }
    if (fs.existsSync(PHOTOS_DIR)) scanDir(PHOTOS_DIR, '');
    res.json({ photos });
  } catch (err) {
    console.error('读取照片列表失败:', err.message);
    res.json({ photos: [] });
  }
});

// ============ 定时检查并发送汇报（供 Vercel Cron Jobs 调用） ============
async function checkScheduledReports() {
  try {
    const supabase = getSupabase();

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentDayOfWeek = now.getDay() === 0 ? 7 : now.getDay();

    console.log(`[定时检查] 日期${today} 周${currentDayOfWeek}`);

    // 每天一次：处理所有创建日期早于今天的用户
    // 日度用户无条件，周度用户匹配星期
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .lt('created_at', today + 'T00:00:00Z')
      .or(`report_frequency.eq.daily,and(report_frequency.eq.weekly,report_day.eq.${currentDayOfWeek})`);

    if (error) throw error;
    if (!users || users.length === 0) return;

    console.log(`[定时任务] 发现 ${users.length} 个用户需要发送定时汇报`);

    for (const user of users) {
      const celebrities = typeof user.celebrities === 'string'
        ? JSON.parse(user.celebrities)
        : user.celebrities;

      console.log(`[定时任务] 处理用户 ${user.email}, 名人红人: ${celebrities.join(', ')}, 频率: ${user.report_frequency || 'daily'}`);

      let allSuccess = true;

      for (const celebrity of celebrities) {
        try {
          const hoursBack = getSearchHoursBack();
          const articles = await searchAllSources(celebrity, hoursBack);
          const reportContent = await generateReport(celebrity, articles);

          await supabase
            .from('reports')
            .insert({
              celebrity,
              content: reportContent,
              type: 'manual',
              user_email: user.email
            });

          await sendReportEmail(user.email, celebrity, reportContent);
          console.log(`[定时任务] ✅ ${celebrity} 汇报已发送至 ${user.email}`);
        } catch (err) {
          console.error(`[定时任务] ❌ ${celebrity} 汇报发送失败:`, err.message);
          allSuccess = false;
        }
      }

      if (allSuccess) {
        await supabase.from('users').delete().eq('id', user.id);
        console.log(`[定时任务] 用户 ${user.email} 已删除（汇报发送成功）`);
      } else {
        console.log(`[定时任务] 用户 ${user.email} 部分失败，保留信息以便重试`);
      }
    }
  } catch (err) {
    console.error('[定时任务] 执行出错:', err);
  }
}

// Vercel Cron Jobs 端点（每分钟调用一次）
app.get('/api/cron', async (req, res) => {
  await checkScheduledReports();
  res.json({ success: true, message: 'Cron check completed' });
});

// API 路由
app.use('/api', apiRoutes);

// 本地开发模式
if (process.env.NODE_ENV !== 'production') {
  setInterval(checkScheduledReports, 60 * 1000);
  console.log('✅ 定时任务已启动（每分钟检查一次）');

  app.listen(PORT, () => {
    console.log(`🚀 名人红人每日资讯汇报 已启动: http://localhost:${PORT}`);
    console.log('📋 访问 http://localhost:' + PORT + ' 开始使用');
  });
}

module.exports = app;
