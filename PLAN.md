# TikTok全自动加好友 - Electron桌面版实施计划

## 账号格式
```
tiktok账号----tiktok密码----Outlook邮箱----邮箱密码----2FA令牌
```

## 总体策略
从 Discord 项目 fork 骨架，复用 ~50% 架构代码（Electron壳/IPC/指纹/代理池/任务调度/养号/冷却/UI框架），替换 TikTok 专属层（登录/自动化/选择器/平台适配）。

---

## 阶段1：项目骨架搭建（Electron壳 + 基础运行）

### 1.1 项目初始化
- 从 Discord 项目复制 Electron 壳模板（main.js / preload.js / package.json / electron-builder配置）
- 安装依赖：electron, electron-builder, electron-store, better-sqlite3, node-fetch 等
- 配置绿色便携版打包（NSIS portable）

### 1.2 基础框架迁移
- 直接复用：`src/main/logger.js`
- 直接复用：`src/main/proxyPool.js`, `src/main/proxyDetector.js`
- 直接复用：`src/main/browserFingerprint.js`（640 UA池）
- 直接复用：`src/shared/ipcChannels.js`（改 channel 名）
- 直接复用：IPC 通讯链路（preload.js / appIpcFacade.js / registerIpcHandlers.js / appApiClient.js / appController.js）
- 直接复用：`src/renderer/state/appState.js`（改初始状态字段）
- 直接复用：`src/renderer/styles.css`（CSS变量体系）

### 1.3 最小可运行验证
- Electron 窗口启动
- 打开 tiktok.com 页面
- 基础 IPC 通讯打通

**产物**：能启动的 Electron 壳，能打开 TikTok 页面

---

## 阶段2：账号系统（登录 + 管理）

### 2.1 账号导入解析
- 支持粘贴账号文本：`tiktok账号----tiktok密码----Outlook邮箱----邮箱密码----令牌`
- 批量导入，存入 electron-store
- 账号管理面板 UI（复用 Discord slot 卡片 + 表格）

### 2.2 Outlook 邮件收验证码
- 安装 `node-imap` 或 `imapflow`
- 实现 `src/main/mailReceiver.js`：
  - 连接 Outlook IMAP（outlook.office365.com:993）
  - 查收件箱最新未读邮件
  - 正则提取 TikTok 验证码（6位数字）
  - 返回验证码字符串
- 超时重试机制（TikTok 发验证码可能延迟 10-30s）

### 2.3 TikTok 自动化登录
- 新建 `src/main/tiktokLoginAutomation.js`
- 登录流程：
  1. 打开 tiktok.com/login
  2. 点击 "使用手机或邮箱"
  3. 输入用户名
  4. 输入密码
  5. TikTok 提示"需要验证"
  6. 调用 mailReceiver 收验证码
  7. 输入验证码
  8. 如有 2FA，输入令牌
  9. 检测登录成功（URL 变化 + cookie 存在）
- 登录状态持久化（electron-store 存 cookie，下次启动直接注入）
- Cookie 过期自动重新登录

### 2.4 账号管理面板
- 多 slot 账号卡片（复用 Discord 样式）
- 账号状态：离线/登录中/在线/CAPTCHA/冷却中
- 支持单账号登录/全部登录/登出
- 账号列表导入/导出

**产物**：完整的账号登录+管理系统

---

## 阶段3：自动化核心（TikTok Platform Adapter）

### 3.1 选择器配置系统
- 新建 `src/main/tiktokSelectors.js`（JSON 配置，非硬编码）
- 多层选择器结构：
```javascript
{
  "dmInput": {
    "primary": "[data-e2e='chat-input']",
    "fallback": [
      "[contenteditable='true'][role='textbox']",
      ".DraftEditor-root [contenteditable='true']"
    ],
    "textMatch": ["输入消息", "Send message"],
    "coordinate": { "x": "center", "y": "bottom" }
  },
  "followButton": { ... },
  "messageButton": { ... }
}
```
- 选择器在线更新：从远程拉取最新配置 JSON

### 3.2 HumanSimulator 模块
- 新建 `src/main/humanSimulator.js`
- 从现有 content.js 抽离 HumanSimulator 逻辑：
  - 真实鼠标点击（mouseover → mousedown → mouseup → click 序列）
  - 打字延迟模拟（50-200ms 每字随机）
  - contenteditable 打字（Draft.js 编辑器）
  - 鼠标轨迹模拟（贝塞尔曲线移动）
  - 随机滚动/停顿
- 安全模式开关（影响延迟范围和轨迹复杂度）

### 3.3 DM 私信自动化
- 新建 `src/main/tiktokDmAutomation.js`
- 搜索用户 → 打开主页 → 点击消息按钮 → 填入私信草稿 → 全自动发送
- 全自动发送（替代半自动的手动 Alt+N）
- 支持 AI 回复（复用 autoReplyManager 的 LLM 链路）

### 3.4 关注/回关自动化
- 新建 `src/main/tiktokFollowAutomation.js`
- 通知页回关流程（复用 content.js 的 5 策略模式）
- 关注/取关操作
- 关注后自动发欢迎消息

### 3.5 视频互动自动化
- 浏览 For You 页面
- 模拟观看行为（停留时长、滚动、点赞）
- 评论互动（可选 AI 生成评论）

**产物**：完整的 TikTok 自动化动作库

---

## 阶段4：业务功能层

### 4.1 引流私信（全自动 DM 获客）
- 从 Discord 项目复用 taskManager.js 框架
- 搜索关键词 → 抓取用户列表 → 逐条私信
- 支持多 slot 并行
- 每日上限/间隔控制
- 自定义私信模板（支持变量替换：{username}）
- 结果统计：已发送/已回复/失败/风控

### 4.2 涨粉模块
- 自动关注 + 回关 + 欢迎消息三连
- 批量取关（关注超过 N 天未回关的）
- 粉丝增长统计

### 4.3 视频推广
- 搜索目标视频 → 模拟观看 → 点赞/评论
- 提升目标账号互动率

### 4.4 矩阵养号
- 从 Discord 项目复用 nurturingManager.js 框架
- TikTok 养号阶段调整：
  - 阶段1：补全个人资料（头像/简介/背景）
  - 阶段2：浏览视频（建立兴趣画像）
  - 阶段3：互动模拟（点赞/评论/关注）
  - 阶段4：已养成（加入任务池）
- 亲和力评分 + 衰减窗口
- 每日活跃时长控制（3h/天）

### 4.5 智能冷却 + 风控
- 从 Discord 项目复用 smartCooldown.js
- CAPTCHA 检测 → 暂停 → 通知 → 5分钟冷却
- 连续风控 → 7 天硬排除
- 每日请求计数 + 速率限制

**产物**：全量业务功能

---

## 阶段5：UI 面板

### 5.1 整体布局
- 复用 Discord 项目的侧边栏 + 内容区布局
- 左侧导航：账号管理 / 任务控制 / 引流私信 / 涨粉 / 养号 / 设置
- 顶部状态栏：运行状态 / 今日统计

### 5.2 各面板
- **账号管理面板**：slot 卡片 + 登录状态 + 批量操作
- **任务控制面板**：任务队列 / 进度 / 日志（复用 Discord 样式）
- **引流私信面板**：关键词输入 / 私信模板 / 抓取按钮 / 发送进度
- **涨粉面板**：关注/取关控制 / 粉丝统计
- **养号面板**：slot 状态卡片 / 阶段进度 / 操作日志（直接复用 Discord nurturing 面板）
- **设置面板**：代理池 / 间隔时间 / 安全模式 / 选择器更新

**产物**：完整的 Electron 应用 UI

---

## 阶段6：自动化回复（AI 集成）

- 从 Discord 项目复用 autoReplyManager.js
- TikTok DM 回复触发机制（监控新消息小红点）
- LLM 回复生成（复用 openAiCompatibleClient）
- 多语言支持（根据对方消息语言自动切换）

---

## 阶段7：测试 + 打包

- 单 slot 端到端测试：登录 → 搜索 → DM 发送
- 多 slot 并行测试
- 绿色便携版打包（electron-builder NSIS portable）
- 自动更新配置（可选）

---

## 复用清单

| 模块 | 复用度 | 改动 |
|------|--------|------|
| logger.js | 100% | 无 |
| proxyPool.js | 100% | 无 |
| browserFingerprint.js | 90% | 无需改动 |
| ipcChannels.js + 整条 IPC 链 | 90% | 改 channel 名 |
| preload.js | 90% | 改 channel 名 |
| main.js (Electron 壳) | 60% | 改窗口配置 |
| taskManager.js | 70% | 换 automation 调用 |
| smartCooldown.js | 60% | 适配 TikTok 风控特征 |
| nurturingManager.js | 50% | 换 phase actions |
| autoReplyManager.js | 60% | 换 DM 触发机制 |
| appView.js / appController.js | 60% | 换面板内容 |
| styles.css | 50% | 增删面板样式 |
| appState.js | 50% | 改初始字段 |
| platformAdapter.js | 0% | 全重写 (tiktokPlatformAdapter) |
| accountManager.js | 30% | 换登录流程 |
| discordAutomationScript.js | 0% | 全重写 |
| resultClassifier.js | 0% | TikTok 专属 |
| humanSimulator.js | 0% | 新建，从 content.js 抽离 |

---

## 优先级顺序

```
阶段1 (基础壳) → 阶段2 (登录系统) → 阶段3 (自动化核心) → 
阶段4 (业务功能) → 阶段5 (UI面板) → 阶段6 (AI回复) → 阶段7 (测试打包)
```

每个阶段产出可独立验证。阶段1+2 完成后就能登录账号。
