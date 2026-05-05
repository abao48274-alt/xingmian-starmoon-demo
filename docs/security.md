# 安全与隐私说明

本仓库为星眠 StarMoon 项目的公开展示仓库，严格遵循以下安全原则：

## 不公开内容清单

### 🔐 API Key / Token
- ❌ 不提交任何 API Key
- ❌ 不提交任何 Token / Secret
- ❌ 不提交任何认证凭证
- ✅ 所有 Key 通过环境变量读取
- ✅ 代码中使用 `os.environ.get()` 获取

### 🌐 网络地址
- ❌ 不提交真实后端地址
- ❌ 不提交 Tailscale IP
- ❌ 不提交内网 IP / 端口
- ✅ 使用占位符 `<backend-host>`

### 📱 设备信息
- ❌ 不提交手机序列号
- ❌ 不提交 Mac 序列号
- ❌ 不提交设备 UDID
- ❌ 不提交 Apple ID / 邮箱

### 💬 用户数据
- ❌ 不提交聊天记录
- ❌ 不提交用户消息
- ❌ 不提交用户头像 / 昵称
- ❌ 不提交任何个人身份信息

### 🧠 AI 私有文件
- ❌ 不提交 SOUL.md（人格定义）
- ❌ 不提交 MEMORY.md（长期记忆）
- ❌ 不提交 memory/*.md（日记）
- ❌ 不提交 HEARTBEAT.md
- ❌ 不提交 BOOTSTRAP.md
- ❌ 不提交 openclaw.json（配置）

### 📁 生成文件
- ❌ 不提交日志文件（*.log）
- ❌ 不提交音频缓存（*.mp3, *.wav）
- ❌ 不提交图片素材
- ❌ 不提交数据库文件（*.db, *.sqlite）

### 🗂️ 开发环境
- ❌ 不提交 .env 文件
- ❌ 不提交 node_modules/
- ❌ 不提交 __pycache__/
- ❌ 不提交 .venv / venv/
- ❌ 不提交 .DS_Store

## 安全措施

### 代码层面
```python
# ✅ 正确：从环境变量读取
API_KEY = os.environ.get("API_KEY", "")

# ❌ 错误：硬编码 Key
API_KEY = "sk_xxxxx"
```

### 配置层面
```javascript
// ✅ 正确：使用占位符
const BACKEND = '<backend-host>';

// ❌ 错误：硬编码地址
const BACKEND = '100.126.76.81:8200';
```

### Git 层面
- `.gitignore` 已配置排除所有敏感文件
- 使用 `git status` 检查提交前的文件列表
- 使用 `git diff` 检查是否有敏感信息泄露

## 公开内容说明

### 允许公开的内容
- ✅ 架构设计文档
- ✅ 技术选型说明
- ✅ Agent 工作流程
- ✅ 项目进展报告
- ✅ 产品功能介绍
- ✅ 演示脚本
- ✅ 脱敏截图
- ✅ MIT 开源许可证

### 公开内容的脱敏处理
- 所有地址使用 `<backend-host>` 占位符
- 所有 Key 使用环境变量占位符
- 截图中模糊处理个人信息
- 日志中去除敏感字段

## 审核流程

每次提交前，执行以下检查：

```bash
# 检查是否有敏感文件
git status

# 检查是否有硬编码 Key
grep -r "sk_\|tp-\|api_key.*=" .

# 检查是否有真实 IP
grep -r "100\.\|192\.168\.\|10\.\|172\." .

# 检查是否有设备信息
grep -r "UDID\|serial\|apple_id" .
```

## 联系方式

如有安全问题，请联系项目维护者。

---

**最后更新：2026-05-03**

本安全说明随项目更新持续维护。
