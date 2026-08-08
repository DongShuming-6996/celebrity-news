# 名人红人每日资讯汇报

一个本地运行的名人红人资讯订阅网站，支持定时邮件汇报和手动触发生成。

## 功能

- 🔔 **订阅定时汇报**：选择名人红人和时间，次日自动发送资讯邮件（仅一次）
- ⚡ **手动触发**：立即搜索新闻、AI 生成汇报、发送邮件
- 📚 **历史汇报**：预置周杰伦近 7 日模拟汇报 + 真实汇报记录
- 📱 **响应式设计**：手机和电脑浏览器都能使用

## 技术栈

- **后端**：Node.js + Express
- **数据库**：SQLite（better-sqlite3）
- **新闻搜索**：Google News RSS + 百度新闻
- **AI 汇报**：DeepSeek API（deepseek-chat）
- **邮件**：Nodemailer（SMTP）
- **定时任务**：node-cron

## 快速开始

### 1. 安装依赖

```bash
cd celebrity-news
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，填入你的配置：

```bash
cp .env.example .env
```

编辑 `.env`：

```env
# DeepSeek API Key（必填）
DEEPSEEK_API_KEY=sk-your-deepseek-api-key

# SMTP 邮件配置（必填，支持 QQ/163/Gmail）
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_USER=your-email@qq.com
SMTP_PASS=your-smtp-auth-code
SMTP_FROM=your-email@qq.com
```

**SMTP 说明：**

| 邮箱 | SMTP_HOST | SMTP_PORT | SMTP_PASS |
|------|-----------|-----------|-----------|
| QQ 邮箱 | smtp.qq.com | 587 | 邮箱设置 → 账户 → POP3/SMTP 服务 → 生成授权码 |
| 163 邮箱 | smtp.163.com | 587 | 邮箱设置 → POP3/SMTP/IMAP → 新增授权码 |
| Gmail | smtp.gmail.com | 587 | Google 账号 → 安全性 → 应用专用密码 |

### 3. 初始化种子数据

```bash
npm run seed
```

这会插入周杰伦近 7 日的模拟汇报数据。

### 4. 启动服务

```bash
npm start
```

浏览器打开 **http://localhost:3000**

## 使用流程

1. 打开网站 → 看到开屏弹窗 → 点击"我知道了"
2. 填写邮箱、选择名人红人、设置汇报时间 → 点击"订阅"
3. 点击"立即搜索并生成汇报"按钮手动体验完整流程
4. 在"历史汇报"中查看模拟预览和真实汇报

## 注意事项

- 定时汇报仅在订阅后的**次日指定时间**触发一次，发送成功后自动删除用户信息
- 手动触发不受次数限制，可反复体验
- 新闻来自 Google News RSS 和百度新闻的固定聚合，单个源失败时静默跳过
- 所有密钥（DeepSeek Key、SMTP 密码）仅存储在 `.env` 中，不上传至前端

## 项目结构

```
celebrity-news/
├── server.js              # 主入口，Express + Cron
├── db.js                  # SQLite 数据库初始化
├── seed.js                # 种子数据（模拟汇报）
├── routes/
│   └── api.js             # API 路由
├── services/
│   ├── newsSearch.js      # 新闻聚合搜索
│   ├── deepseek.js        # DeepSeek API 调用
│   └── email.js           # SMTP 邮件发送
├── public/
│   ├── index.html         # 前端页面
│   ├── style.css          # 样式
│   └── script.js          # 前端逻辑
├── .env.example           # 环境变量示例
├── package.json
└── README.md
```
