# 配置文件迁移完成

## ✅ 已完成的更新

### 1. 配置文件系统
- 创建了 `config.conf` - JSON格式的配置文件
- 创建了 `config.conf.example` - 配置模板
- 创建了 `CONFIG.md` - 详细的配置说明文档
- 创建了 `.gitignore` - 防止敏感信息泄露

### 2. 配置项说明

#### wecom - 企业微信配置
- `corpId` - 企业ID
- `kfSecret` - 客服Secret
- `token` - 消息加解密Token
- `encodingAESKey` - 消息加解密AESKey

#### openclaw - OpenClaw Gateway 配置
- `gatewayUrl` - Gateway地址
- `gatewayToken` - Gateway访问令牌
- `agentId` - Agent ID

#### server - 服务器配置
- `port` - 服务端口

#### welcome - 欢迎消息配置
- `enabled` - 是否启用欢迎消息
- `message` - 欢迎消息内容
- `clearInterval` - 清理间隔（毫秒）

#### dedup - 消息去重配置
- `maxSize` - 最大缓存消息数
- `clearInterval` - 清理间隔（毫秒）

### 3. 配置优先级

配置加载优先级（从高到低）：
1. `config.conf` 文件中的配置
2. 环境变量（`.env` 文件）
3. 默认值

### 4. 部署状态

✅ 服务器已部署 v7 版本
✅ 配置文件已加载成功
✅ 服务正常运行

## 📝 使用方法

### 修改配置

1. SSH登录服务器：
```bash
ssh ubuntu@your-server.com
```

2. 编辑配置文件：
```bash
cd /opt/wecom-kf-bridge
nano config.conf
```

3. 重启服务：
```bash
pm2 restart wecom-kf-bridge
```

### 查看配置文档

```bash
cat /opt/wecom-kf-bridge/CONFIG.md
```

### 查看配置模板

```bash
cat /opt/wecom-kf-bridge/config.conf.example
```

## 🎯 配置示例

### 修改欢迎消息

编辑 `config.conf`：
```json
{
  "welcome": {
    "enabled": true,
    "message": "您的新欢迎消息内容",
    "clearInterval": 86400000
  }
}
```

### 禁用欢迎消息

```json
{
  "welcome": {
    "enabled": false
  }
}
```

### 修改Agent ID

```json
{
  "openclaw": {
    "agentId": "your-agent-id"
  }
}
```

### 修改服务端口

```json
{
  "server": {
    "port": 8080
  }
}
```

## 🔒 安全建议

1. **文件权限**：
```bash
chmod 600 /opt/wecom-kf-bridge/config.conf
```

2. **不要提交到Git**：
- `config.conf` 已添加到 `.gitignore`
- 只提交 `config.conf.example` 模板

3. **定期备份**：
```bash
cp config.conf config.conf.backup.$(date +%Y%m%d)
```

## 📊 日志查看

查看配置加载日志：
```bash
pm2 logs wecom-kf-bridge --lines 50 | grep Config
```

应该看到：
```
[Config] 尝试加载配置文件，路径: /opt/wecom-kf-bridge/config.conf
[Config] 配置文件加载成功
```

## 🎉 优势

1. **集中管理**：所有配置集中在一个文件中
2. **易于修改**：JSON格式，清晰易读
3. **灵活配置**：支持多层级配置
4. **向下兼容**：仍然支持环境变量
5. **安全性**：配置文件不会被提交到Git

## 📚 相关文件

- `/opt/wecom-kf-bridge/config.conf` - 实际配置文件
- `/opt/wecom-kf-bridge/config.conf.example` - 配置模板
- `/opt/wecom-kf-bridge/CONFIG.md` - 详细说明文档
- `/opt/wecom-kf-bridge/.gitignore` - Git忽略规则
