# 企业微信客服中转服务 (WeChat Work Customer Service Bridge)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)

接收企业微信客服消息，转发到 OpenClaw Gateway，实现外部微信用户与 AI Agent 的对话。

## ✨ 功能特性

- 🔐 **消息加解密**：支持企业微信安全模式，自动处理消息加解密和签名验证
- 🤖 **AI Agent 集成**：无缝对接 OpenClaw Gateway，支持多 Agent 配置
- 👋 **自动欢迎消息**：新用户首次对话时自动发送欢迎词
- 🔄 **消息去重**：防止重复消息处理
- ⚙️ **灵活配置**：支持 JSON 配置文件和环境变量
- 📊 **详细日志**：完整的消息流转日志，便于调试
- 🚀 **生产就绪**：支持 PM2、Docker 部署

## 📋 前置要求

- Node.js >= 20.0.0
- 企业微信账号（已开通微信客服功能）
- OpenClaw Gateway 实例

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/YOUR_USERNAME/wecom-kf-bridge.git
cd wecom-kf-bridge
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置服务

复制配置模板：

```bash
cp config.conf.example config.conf
```

编辑 `config.conf`，填入你的配置：

```json
{
  "wecom": {
    "corpId": "你的企业ID",
    "kfSecret": "你的客服Secret",
    "token": "你的Token",
    "encodingAESKey": "你的EncodingAESKey"
  },
  "openclaw": {
    "gatewayUrl": "http://localhost:18789",
    "gatewayToken": "你的Gateway Token",
    "agentId": "service"
  },
  "server": {
    "port": 3000
  },
  "welcome": {
    "enabled": true,
    "message": "您好呀，欢迎使用我们的服务！",
    "clearInterval": 86400000
  }
}
```

详细配置说明请查看 [CONFIG.md](CONFIG.md)

### 4. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

## 📖 企业微信配置指南

### 1. 开通微信客服

1. 登录 [企业微信管理后台](https://work.weixin.qq.com/)
2. 导航：应用管理 → 微信客服 → 开通

### 2. 创建客服账号

1. 微信客服 → 客服账号 → 添加账号
2. 填写客服名称和头像
3. 记录生成的 `open_kfid`

### 3. 配置接收消息

1. 微信客服 → 接入配置 → 接收消息
2. 填写配置：
   - **URL**: `http://your-domain:3000/wecom-kf/webhook`
   - **Token**: 随机生成 16 位字符串
   - **EncodingAESKey**: 随机生成 43 位字符串
   - **消息加解密方式**: 安全模式
3. 点击保存，完成 URL 验证

### 4. 获取凭证

| 配置项 | 获取位置 |
|--------|---------|
| CorpID | 我的企业 → 企业信息 → 企业ID |
| Secret | 应用管理 → 微信客服 → 查看 Secret |
| Token | 接收消息配置页面 |
| EncodingAESKey | 接收消息配置页面 |

## 🏗️ 架构说明

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────┐
│  微信用户   │────▶│ 企业微信客服  │────▶│  本服务      │────▶│ OpenClaw │
│             │     │              │     │  (Bridge)   │     │ Gateway  │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────┘
                                                │                    │
                                                │                    ▼
                                                │              ┌──────────┐
                                                │              │ AI Agent │
                                                │              └──────────┘
                                                │                    │
                                                ▼                    │
                                          ┌─────────────┐            │
                                          │  消息处理    │◀───────────┘
                                          │  - 解密      │
                                          │  - 去重      │
                                          │  - 欢迎消息  │
                                          └─────────────┘
```

## 🔧 配置说明

### 配置文件优先级

1. `config.conf` 文件（推荐）
2. 环境变量
3. 默认值

### 主要配置项

#### wecom - 企业微信配置

- `corpId`: 企业ID（必填）
- `kfSecret`: 客服Secret（必填）
- `token`: 消息加解密Token（必填）
- `encodingAESKey`: 消息加解密AESKey（必填）

#### openclaw - OpenClaw Gateway 配置

- `gatewayUrl`: Gateway地址（默认: `http://localhost:18789`）
- `gatewayToken`: Gateway访问令牌（必填）
- `agentId`: Agent ID（默认: `servers`）

#### welcome - 欢迎消息配置

- `enabled`: 是否启用欢迎消息（默认: `true`）
- `message`: 欢迎消息内容
- `clearInterval`: 清理间隔，毫秒（默认: 86400000，即24小时）

完整配置说明请查看 [CONFIG.md](CONFIG.md)

## 🚢 部署

### PM2 部署（推荐）

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start server.js --name wecom-kf-bridge

# 保存配置
pm2 save

# 设置开机自启
pm2 startup
```

### Docker 部署

```bash
# 构建镜像
docker build -t wecom-kf-bridge .

# 运行容器
docker run -d \
  --name wecom-kf-bridge \
  -p 3000:3000 \
  -v $(pwd)/config.conf:/app/config.conf \
  wecom-kf-bridge
```

### Docker Compose 部署

```bash
docker-compose up -d
```

## 🔍 API 接口

### 健康检查

```bash
GET /health
```

响应：
```json
{
  "status": "ok",
  "timestamp": "2026-03-12T00:00:00.000Z"
}
```

### Webhook 接口

```bash
POST /wecom-kf/webhook
```

企业微信会自动调用此接口推送消息。

## 🐛 调试

### 查看日志

```bash
# PM2 日志
pm2 logs wecom-kf-bridge

# 实时日志
pm2 logs wecom-kf-bridge --lines 100
```

### 测试连接

```bash
# 测试健康检查
curl http://localhost:3000/health

# 测试公网访问
curl http://your-domain:3000/health
```

## 📝 开发

### 项目结构

```
wecom-kf-bridge/
├── server.js              # 主服务文件
├── wecom-crypto.js        # 加解密模块
├── config.conf            # 配置文件（不提交）
├── config.conf.example    # 配置模板
├── package.json           # 依赖配置
├── CONFIG.md              # 配置说明文档
├── README.md              # 项目说明
├── Dockerfile             # Docker 配置
├── docker-compose.yml     # Docker Compose 配置
└── .gitignore             # Git 忽略规则
```

### 运行测试

```bash
npm test
```

## ⚠️ 注意事项

1. **公网可访问**: 服务器必须有公网 IP 或域名，企业微信才能推送消息
2. **端口开放**: 确保配置的端口（默认3000）已开放
3. **HTTPS**: 生产环境建议使用 HTTPS（可通过 Nginx 反向代理实现）
4. **Token 安全**: 不要将 `config.conf` 提交到 Git 仓库
5. **消息去重**: 企业微信可能重复推送消息，服务已内置去重机制
6. **AccessToken 缓存**: AccessToken 会自动缓存，避免频繁请求

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

[MIT License](LICENSE)

## 🔗 相关链接

- [企业微信开发文档](https://developer.work.weixin.qq.com/)
- [OpenClaw Gateway](https://github.com/openclaw/gateway)
- [配置说明文档](CONFIG.md)

## 💬 支持

如有问题，请提交 [Issue](https://github.com/YOUR_USERNAME/wecom-kf-bridge/issues)
