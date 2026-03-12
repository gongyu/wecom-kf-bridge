# OpenClaw 部署操作指南

这是一份简化的操作指南，专门为OpenClaw或其他AI助手设计，用于快速部署新的企业微信客服实例。

## 📋 部署前准备

### 1. 向用户收集以下信息

```
请提供以下配置信息：

【企业微信配置】
1. 企业ID (CorpID):
2. 客服Secret:
3. Token (16位):
4. EncodingAESKey (43位):

【客服信息】
5. 客服名称:
6. 业务类型:

【OpenClaw配置】
7. Gateway Token:
8. Agent ID:

【欢迎消息】
9. 欢迎消息内容:

【实例配置】
10. 实例编号 (2, 3, 4...):
```

### 2. 如果用户没有Token和AESKey

提供生成命令：
```bash
# 生成16位Token
openssl rand -hex 8

# 生成43位EncodingAESKey
openssl rand -base64 32
```

## 🚀 部署步骤

### 方法1: 使用自动化脚本（推荐）

```bash
# 1. SSH连接服务器
ssh ubuntu@ockf.issf.site
# 密码: Stan3277.

# 2. 进入代码目录
cd /opt/wecom-kf-bridge

# 3. 运行部署脚本
./deploy-instance.sh <实例编号>

# 4. 按提示输入配置信息
# 脚本会自动完成所有部署步骤
```

### 方法2: 手动部署

```bash
# 1. SSH连接服务器
ssh ubuntu@ockf.issf.site

# 2. 设置变量
INSTANCE_NUM=<实例编号>
PORT=$((3000 + INSTANCE_NUM))

# 3. 创建目录
sudo mkdir -p /opt/wecom-kf-bridge-${INSTANCE_NUM}
sudo chown ubuntu:ubuntu /opt/wecom-kf-bridge-${INSTANCE_NUM}
cd /opt/wecom-kf-bridge-${INSTANCE_NUM}

# 4. 复制文件
cp /opt/wecom-kf-bridge/server.js .
cp /opt/wecom-kf-bridge/wecom-crypto.js .
cp /opt/wecom-kf-bridge/package.json .

# 5. 安装依赖
npm install --production

# 6. 创建配置文件
cat > config.conf << 'EOF'
{
  "wecom": {
    "corpId": "填入企业ID",
    "kfSecret": "填入客服Secret",
    "token": "填入Token",
    "encodingAESKey": "填入EncodingAESKey"
  },
  "openclaw": {
    "gatewayUrl": "http://localhost:18789",
    "gatewayToken": "填入Gateway Token",
    "agentId": "填入Agent ID"
  },
  "server": {
    "port": PORT值
  },
  "welcome": {
    "enabled": true,
    "message": "填入欢迎消息",
    "clearInterval": 86400000
  },
  "dedup": {
    "maxSize": 1000,
    "clearInterval": 3600000
  }
}
EOF

# 7. 编辑配置文件
nano config.conf
# 替换所有"填入xxx"为实际值
# 保存: Ctrl+O, 回车, Ctrl+X

# 8. 启动服务
pm2 start server.js --name wecom-kf-bridge-${INSTANCE_NUM}

# 9. 保存配置
pm2 save

# 10. 验证
curl http://localhost:${PORT}/health
pm2 logs wecom-kf-bridge-${INSTANCE_NUM} --lines 20
```

## ✅ 验证部署

### 1. 检查服务状态
```bash
pm2 status
```

应该看到新实例状态为 `online`

### 2. 检查日志
```bash
pm2 logs wecom-kf-bridge-<实例编号> --lines 50
```

应该看到：
- `[Config] 配置文件加载成功`
- `[Crypto] 安全模式已启用`
- `企业微信客服中转服务已启动`

### 3. 测试健康检查
```bash
curl http://localhost:<端口>/health
```

应该返回：`{"status":"ok","timestamp":"..."}`

## 🔧 企业微信后台配置

告诉用户完成以下配置：

```
请在企业微信管理后台完成以下配置：

1. 创建客服账号
   - 位置: 应用管理 → 微信客服 → 客服账号 → 添加账号
   - 填写客服名称: <用户提供的客服名称>

2. 配置接收消息
   - 位置: 微信客服 → 接入配置 → 接收消息
   - URL: http://ockf.issf.site:<端口>/wecom-kf/webhook
   - Token: <用户提供的Token>
   - EncodingAESKey: <用户提供的EncodingAESKey>
   - 消息加解密方式: 安全模式
   - 点击"保存"完成URL验证

3. 获取凭证
   - CorpID: 我的企业 → 企业信息 → 企业ID
   - Secret: 应用管理 → 微信客服 → 查看Secret
```

## 🧪 测试消息流转

```
请使用外部微信扫描客服二维码，发送测试消息"你好"

预期结果：
1. 先收到欢迎消息
2. 然后收到Agent的回复

如果没有收到回复，请查看日志：
pm2 logs wecom-kf-bridge-<实例编号>
```

## 🔍 故障排查

### 问题1: 服务启动失败
```bash
# 查看错误日志
pm2 logs wecom-kf-bridge-<实例编号> --err

# 常见原因：
# - 端口被占用: sudo lsof -i :<端口>
# - 配置格式错误: cat config.conf | python3 -m json.tool
# - 依赖未安装: npm install --production
```

### 问题2: URL验证失败
```bash
# 检查服务运行
pm2 status

# 检查端口开放
sudo ufw allow <端口>/tcp
curl http://localhost:<端口>/health

# 检查公网访问
curl http://ockf.issf.site:<端口>/health
```

### 问题3: 消息无响应
```bash
# 查看实时日志
pm2 logs wecom-kf-bridge-<实例编号>

# 检查OpenClaw Gateway
curl http://localhost:18789/health

# 检查Agent是否运行
# 在OpenClaw中: /agents list
```

## 📊 管理命令

```bash
# 查看所有实例
pm2 list

# 重启实例
pm2 restart wecom-kf-bridge-<实例编号>

# 查看日志
pm2 logs wecom-kf-bridge-<实例编号>

# 停止实例
pm2 stop wecom-kf-bridge-<实例编号>

# 删除实例
pm2 delete wecom-kf-bridge-<实例编号>
sudo rm -rf /opt/wecom-kf-bridge-<实例编号>
```

## 📝 部署完成报告模板

部署完成后，向用户提供以下信息：

```
✅ 部署完成

实例信息：
- 实例编号: <编号>
- 服务端口: <端口>
- PM2进程名: wecom-kf-bridge-<编号>
- 安装目录: /opt/wecom-kf-bridge-<编号>

Webhook配置：
- URL: http://ockf.issf.site:<端口>/wecom-kf/webhook
- Token: <Token>
- EncodingAESKey: <AESKey>

服务状态：
- 运行状态: online
- 健康检查: 通过

下一步：
1. 在企业微信后台配置Webhook URL
2. 创建客服账号并获取二维码
3. 测试消息流转

管理命令：
- 查看日志: pm2 logs wecom-kf-bridge-<编号>
- 重启服务: pm2 restart wecom-kf-bridge-<编号>
```

## 🔗 相关文档

- 完整部署指南: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- 配置说明: [CONFIG.md](CONFIG.md)
- 安全说明: [SECURITY.md](SECURITY.md)
- 项目主页: https://github.com/gongyu/wecom-kf-bridge
