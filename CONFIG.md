# 配置文件说明

## 配置文件格式

配置文件使用 JSON 格式，文件名为 `config.conf`。

## 配置项说明

### wecom - 企业微信配置

| 配置项 | 说明 | 必填 | 示例 |
|--------|------|------|------|
| corpId | 企业ID | 是 | `wwxxxxxxxxxxxxxxxx` |
| kfSecret | 客服Secret | 是 | `your_kf_secret_here` |
| token | 消息加解密Token | 是 | `your_token_here` |
| encodingAESKey | 消息加解密AESKey | 是 | `your_encoding_aes_key_here` |

### openclaw - OpenClaw Gateway 配置

| 配置项 | 说明 | 必填 | 默认值 | 示例 |
|--------|------|------|--------|------|
| gatewayUrl | Gateway地址 | 否 | `http://localhost:18789` | `http://localhost:18789` |
| gatewayToken | Gateway访问令牌 | 是 | - | `your_gateway_token_here` |
| agentId | Agent ID | 否 | `servers` | `service` |

### server - 服务器配置

| 配置项 | 说明 | 必填 | 默认值 | 示例 |
|--------|------|------|--------|------|
| port | 服务端口 | 否 | `3000` | `3000` |

### welcome - 欢迎消息配置

| 配置项 | 说明 | 必填 | 默认值 | 示例 |
|--------|------|------|--------|------|
| enabled | 是否启用欢迎消息 | 否 | `true` | `true` / `false` |
| message | 欢迎消息内容 | 否 | 默认欢迎词 | `您好呀，我是小晓...` |
| clearInterval | 清理间隔（毫秒） | 否 | `86400000` (24小时) | `86400000` |

**说明**：
- `clearInterval` 设置为 86400000 (24小时) 表示每天清理一次欢迎消息记录，用户第二天可以再次收到欢迎消息
- 设置为更短的时间可以让用户更频繁地收到欢迎消息

### dedup - 消息去重配置

| 配置项 | 说明 | 必填 | 默认值 | 示例 |
|--------|------|------|--------|------|
| maxSize | 最大缓存消息数 | 否 | `1000` | `1000` |
| clearInterval | 清理间隔（毫秒） | 否 | `3600000` (1小时) | `3600000` |

**说明**：
- `maxSize` 设置消息去重缓存的最大数量，超过后会自动清理
- `clearInterval` 设置定期检查和清理的时间间隔

## 配置优先级

配置加载优先级（从高到低）：
1. `config.conf` 文件中的配置
2. 环境变量
3. 默认值

这意味着：
- 如果 `config.conf` 中有配置，优先使用
- 如果 `config.conf` 中没有，尝试读取环境变量
- 如果环境变量也没有，使用默认值

## 使用方法

### 1. 复制配置模板

```bash
cp config.conf.example config.conf
```

### 2. 编辑配置文件

```bash
nano config.conf
# 或
vim config.conf
```

### 3. 填写必填项

至少需要填写以下配置：
- `wecom.corpId` - 企业ID
- `wecom.kfSecret` - 客服Secret
- `wecom.token` - 消息加解密Token
- `wecom.encodingAESKey` - 消息加解密AESKey
- `openclaw.gatewayToken` - Gateway访问令牌

### 4. 重启服务

```bash
pm2 restart wecom-kf-bridge
```

## 配置示例

完整的配置示例：

```json
{
  "wecom": {
    "corpId": "wwxxxxxxxxxxxxxxxx",
    "kfSecret": "your_kf_secret_here",
    "token": "your_token_here",
    "encodingAESKey": "your_encoding_aes_key_here"
  },
  "openclaw": {
    "gatewayUrl": "http://localhost:18789",
    "gatewayToken": "your_gateway_token_here",
    "agentId": "service"
  },
  "server": {
    "port": 3000
  },
  "welcome": {
    "enabled": true,
    "message": "您好呀，我是小晓 🚂🚢 看您对旅游感兴趣～ 我们主要做专为中老年人设计的轻松线路。您这次想去那里啊？",
    "clearInterval": 86400000
  },
  "dedup": {
    "maxSize": 1000,
    "clearInterval": 3600000
  }
}
```

## 注意事项

1. **JSON 格式**：配置文件必须是有效的 JSON 格式，注意：
   - 字符串使用双引号
   - 最后一个配置项后面不要有逗号
   - 数字不要加引号

2. **敏感信息**：`config.conf` 包含敏感信息，请：
   - 不要提交到 Git 仓库
   - 设置适当的文件权限：`chmod 600 config.conf`

3. **修改后重启**：修改配置文件后需要重启服务才能生效

4. **配置验证**：启动时会在日志中显示配置加载情况，请检查是否正确加载
