const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('SMTP 配置不完整，请检查 .env 文件中的 SMTP_HOST、SMTP_USER、SMTP_PASS');
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });

  return transporter;
}

/**
 * 发送汇报邮件
 * @param {string} to - 收件人邮箱
 * @param {string} celebrity - 名人红人姓名
 * @param {string} content - 汇报内容（Markdown 或纯文本）
 * @returns {object} 发送结果
 */
async function sendReportEmail(to, celebrity, content) {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  // 将 Markdown 转为适合邮件的纯文本
  const plainText = content
    .replace(/^#+ /gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/^[-*] /gm, '• ');

  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
  });

  const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 680px; margin: 0 auto; padding: 20px; background: #fafafa;">
  <div style="background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">
    <h1 style="font-size: 22px; color: #1a1a2e; margin: 0 0 4px 0;">📰 ${celebrity} · 今日速览</h1>
    <p style="color: #888; font-size: 13px; margin: 0 0 24px 0;">${today}</p>
    <div style="line-height: 1.8; color: #333; font-size: 15px;">
      ${content.replace(/\n/g, '<br>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #2563eb;">$1</a>')}
    </div>
    <hr style="border: none; border-top: 1px solid #eee; margin: 28px 0 0 0;">
    <p style="color: #aaa; font-size: 12px; margin: 16px 0 0 0;">此邮件由「名人红人每日资讯汇报」自动发送。定时汇报仅发送一次，您的信息已从系统中删除。</p>
  </div>
</body>
</html>`;

  const info = await transporter.sendMail({
    from: `"名人红人资讯汇报" <${from}>`,
    to,
    subject: `📰 ${celebrity} 今日速览 - ${today}`,
    text: plainText,
    html: htmlContent
  });

  console.log(`邮件已发送: ${info.messageId}`);
  return info;
}

module.exports = { sendReportEmail, getTransporter };
