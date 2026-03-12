# wecom-kf-bridge 修复报告

## 问题诊断

### 原始错误
```
[OpenClaw] 转发失败: Request failed with status code 404
[OpenClaw] 响应: Not Found
```

### 根本原因
1. **错误的 API 端点**: 使用了不存在的 `/api/v1/sessions/send`
2. **HTTP API 未启用**: OpenClaw Gateway 的 HTTP API 默认是禁用的
3. **错误的认证 Token**: 使用了错误的 Gateway Token
4. **错误的 Agent ID**: 配置的 agent ID 与实际不符

## 解决方案

### 1. 启用 OpenClaw Gateway HTTP API

修改 `/home/ubuntu/.openclaw/openclaw.json`:

```json
{
  "gateway": {
    "http": {
      "endpoints": {
        "responses": {
          "enabled": true
        }
      }
    }
  }
}
```

### 2. 修复 API 调用代码

**文件**: `/opt/wecom-kf-bridge/server.js`

**修改前** (错误的端点和请求格式):
```javascript
const url = `${config.openclawUrl}/api/v1/sessions/send`;
const payload = {
  sessionKey: sessionKey,
  message: userContent,
  metadata: {...}
};
```

**修改后** (正确的 OpenResponses API):
```javascript
const url = `${config.openclawUrl}/v1/responses`;
const payload = {
  model: `agent:${config.agentId}`,
  input: userContent,
  user: sessionKey,
  stream: false,
};
```

### 3. 更新配置

**文件**: `/opt/wecom-kf-bridge/.env`

```bash
# 正确的 Gateway Token
OPENCLAW_GATEWAY_TOKEN=your_gateway_token_here

# 正确的 Agent ID
AGENT_ID=main
```

## 正确的 API 规范

### OpenResponses API

**端点**: `POST /v1/responses`

**认证**: Bearer Token (来自 `gateway.auth.token`)

**请求格式**:
```json
{
  "model": "agent:<agentId>",
  "input": "用户消息内容",
  "user": "会话标识",
  "stream": false
}
```

**响应格式**:
```json
{
  "id": "resp_xxx",
  "status": "completed",
  "output": [
    {
      "type": "message",
      "role": "assistant",
      "content": [
        {
          "type": "output_text",
          "text": "Agent 的回复内容"
        }
      ]
    }
  ]
}
```

## 部署步骤

1. ✅ 更新 OpenClaw Gateway 配置 (启用 HTTP API)
2. ✅ 重启 OpenClaw Gateway
3. ✅ 修复 wecom-kf-bridge 代码
4. ✅ 更新 .env 配置文件
5. ✅ 重启 wecom-kf-bridge 服务

## 测试结果

```bash
✅ Gateway 健康检查通过
✅ OpenResponses API 调用成功
✅ Agent 正常响应消息
```

**测试命令**:
```bash
cd /opt/wecom-kf-bridge
bash test-complete.sh
```

## 消息流程

```
企业微信客服
    ↓ (Webhook 推送)
wecom-kf-bridge (port 3000)
    ↓ (HTTP POST /v1/responses)
OpenClaw Gateway (port 18789)
    ↓ (调用 Agent)
Agent: main
    ↓ (返回回复)
OpenClaw Gateway
    ↓ (HTTP 响应)
wecom-kf-bridge
    ↓ (企业微信 API)
企业微信客服
```

## 服务状态

- **OpenClaw Gateway**: ✅ 运行中 (PID: 901557, Port: 18789)
- **wecom-kf-bridge**: ✅ 运行中 (PM2 管理, Port: 3000)
- **Agent**: main
- **HTTP API**: ✅ 已启用

## 参考文档

- [OpenResponses API Documentation](https://claw-tw.jackle.pro/gateway/openresponses-http-api)
- [OpenClaw Gateway Configuration](https://molty.finna.ai/docs/gateway/openresponses-http-api)

## 下一步

在企业微信客服中发送测试消息，验证完整的消息流转。
