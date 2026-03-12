# 企业微信客服实例部署手册

本手册用于在同一服务器上部署多个独立的企业微信客服实例。

## 📋 部署前准备

### 1. 信息收集清单

在开始部署前，请准备以下信息：

#### 企业微信配置
- [ ] **企业ID** (CorpID): `wwxxxxxxxxxxxxxxxx`
- [ ] **客服Secret**: 从企业微信后台获取
- [ ] **Token**: 16位随机字符串（用于消息加解密）
- [ ] **EncodingAESKey**: 43位随机字符串（用于消息加解密）

#### 客服信息
- [ ] **客服名称**: 例如"客服小美"、"客服达达"
- [ ] **业务类型**: 例如"旅游"、"教育"、"电商"
- [ ] **欢迎消息**: 针对该业务的欢迎词

#### OpenClaw配置
- [ ] **Gateway URL**: 默认 `http://localhost:18789`
- [ ] **Gateway Token**: OpenClaw Gateway访问令牌
- [ ] **Agent ID**: 使用的Agent名称，例如"service"、"education"

#### 服务配置
- [ ] **实例编号**: 例如"2"、"3"（第一个实例是"1"，不需要编号）
- [ ] **端口号**: 3000 + 实例编号（例如：实例2用3001，实例3用3002）
- [ ] **PM2进程名**: `wecom-kf-bridge-{实例编号}`

### 2. 生成Token和AESKey

```bash
# 生成16位Token
openssl rand -hex 8

# 生成43位EncodingAESKey（Base64编码）
openssl rand -base64 32
```

---

## 🚀 部署步骤

### Step 1: 连接服务器

```bash
ssh ubuntu@your-server.com
# 输入密码
```

### Step 2: 创建实例目录

```bash
# 设置实例编号（根据实际情况修改）
INSTANCE_NUM=2

# 创建目录
sudo mkdir -p /opt/wecom-kf-bridge-${INSTANCE_NUM}
sudo chown ubuntu:ubuntu /opt/wecom-kf-bridge-${INSTANCE_NUM}
cd /opt/wecom-kf-bridge-${INSTANCE_NUM}
```

### Step 3: 复制代码文件

```bash
# 从第一个实例复制代码
cp /opt/wecom-kf-bridge/server.js .
cp /opt/wecom-kf-bridge/wecom-crypto.js .
cp /opt/wecom-kf-bridge/package.json .
cp /opt/wecom-kf-bridge/.gitignore .

# 验证文件
ls -la
```

### Step 4: 安装依赖

```bash
npm install --production
```

### Step 5: 创建配置文件

```bash
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
    "port": 3001
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
```

### Step 6: 编辑配置文件

```bash
nano config.conf
```

**填写说明**：
1. 将所有"填入xxx"替换为实际值
2. 确认端口号正确（实例2用3001，实例3用3002）
3. 保存：`Ctrl+O`，回车，`Ctrl+X`

### Step 7: 验证配置

```bash
# 检查JSON格式是否正确
cat config.conf | python3 -m json.tool

# 如果没有错误，说明格式正确
```

### Step 8: 启动服务

```bash
# 使用PM2启动
pm2 start server.js --name wecom-kf-bridge-${INSTANCE_NUM}

# 查看日志
pm2 logs wecom-kf-bridge-${INSTANCE_NUM} --lines 20
```

### Step 9: 验证服务运行

```bash
# 检查服务状态
pm2 status wecom-kf-bridge-${INSTANCE_NUM}

# 测试健康检查
curl http://localhost:3001/health

# 应该返回: {"status":"ok","timestamp":"..."}
```

### Step 10: 保存PM2配置

```bash
pm2 save
```

---

## 🔧 企业微信后台配置

### 1. 创建客服账号

1. 登录 [企业微信管理后台](https://work.weixin.qq.com/)
2. 导航：应用管理 → 微信客服 → 客服账号 → 添加账号
3. 填写客服名称和头像
4. 记录生成的 `open_kfid`

### 2. 配置接收消息

1. 微信客服 → 接入配置 → 接收消息
2. 填写配置：
   - **URL**: `http://your-server.com:3001/wecom-kf/webhook`
   - **Token**: 使用Step 5中填写的Token
   - **EncodingAESKey**: 使用Step 5中填写的EncodingAESKey
   - **消息加解密方式**: 安全模式
3. 点击"保存"，完成URL验证

### 3. 获取凭证

| 配置项 | 获取位置 |
|--------|---------|
| CorpID | 我的企业 → 企业信息 → 企业ID |
| Secret | 应用管理 → 微信客服 → 查看Secret |

---

## ✅ 验证部署

### 1. 检查服务状态

```bash
pm2 status
```

应该看到类似：
```
┌─────┬──────────────────────┬─────────┬─────────┬──────────┐
│ id  │ name                 │ status  │ restart │ uptime   │
├─────┼──────────────────────┼─────────┼─────────┼──────────┤
│ 0   │ wecom-kf-bridge      │ online  │ 0       │ 2h       │
│ 1   │ wecom-kf-bridge-2    │ online  │ 0       │ 5m       │
└─────┴──────────────────────┴─────────┴─────────┴──────────┘
```

### 2. 检查端口监听

```bash
sudo netstat -tlnp | grep node
```

应该看到：
```
tcp  0  0  0.0.0.0:3000  0.0.0.0:*  LISTEN  12345/node
tcp  0  0  0.0.0.0:3001  0.0.0.0:*  LISTEN  12346/node
```

### 3. 测试消息流转

1. 使用外部微信扫描客服二维码
2. 发送测试消息："你好"
3. 查看服务器日志：
   ```bash
   pm2 logs wecom-kf-bridge-2 --lines 50
   ```
4. 应该看到：
   - `[Config] 配置文件加载成功`
   - `[Message] 收到消息`
   - `[Welcome] 新用户，发送欢迎消息`（如果是新用户）
   - `[OpenClaw] 转发成功`
   - `[Send] 消息发送成功`

### 4. 验证欢迎消息

新用户首次发送消息时，应该先收到欢迎消息，然后再收到Agent的回复。

---

## 🔍 故障排查

### 问题1: 服务启动失败

**症状**: `pm2 status` 显示 `errored` 或 `stopped`

**排查步骤**:
```bash
# 查看错误日志
pm2 logs wecom-kf-bridge-2 --err --lines 50

# 常见原因：
# 1. 端口被占用
sudo lsof -i :3001

# 2. 配置文件格式错误
cat config.conf | python3 -m json.tool

# 3. 依赖未安装
npm install --production
```

### 问题2: URL验证失败

**症状**: 企业微信后台显示"openapi回调地址请求不通过"

**排查步骤**:
```bash
# 1. 检查服务是否运行
pm2 status wecom-kf-bridge-2

# 2. 检查端口是否开放
curl http://localhost:3001/health

# 3. 检查防火墙
sudo ufw status
sudo ufw allow 3001/tcp

# 4. 检查公网访问
curl http://your-server.com:3001/health
```

### 问题3: 消息无响应

**症状**: 发送消息后没有收到回复

**排查步骤**:
```bash
# 1. 查看实时日志
pm2 logs wecom-kf-bridge-2 --lines 100

# 2. 检查OpenClaw Gateway连接
curl http://localhost:18789/health

# 3. 检查Agent是否运行
# 在OpenClaw中执行: /agents list

# 4. 检查配置文件中的Agent ID
cat config.conf | grep agentId
```

### 问题4: 重复消息

**症状**: Agent重复处理同一条消息

**排查步骤**:
```bash
# 查看日志中的消息ID
pm2 logs wecom-kf-bridge-2 | grep msgId

# 检查是否有"跳过已处理消息"的日志
# 如果没有，说明去重机制未生效

# 重启服务
pm2 restart wecom-kf-bridge-2
```

---

## 📊 管理多个实例

### 查看所有实例

```bash
pm2 list
```

### 重启特定实例

```bash
pm2 restart wecom-kf-bridge-2
```

### 查看特定实例日志

```bash
pm2 logs wecom-kf-bridge-2
```

### 停止特定实例

```bash
pm2 stop wecom-kf-bridge-2
```

### 删除实例

```bash
# 停止并删除PM2进程
pm2 delete wecom-kf-bridge-2

# 删除实例目录
sudo rm -rf /opt/wecom-kf-bridge-2
```

---

## 🔒 安全建议

1. **配置文件权限**
   ```bash
   chmod 600 /opt/wecom-kf-bridge-2/config.conf
   ```

2. **定期备份配置**
   ```bash
   cp config.conf config.conf.backup.$(date +%Y%m%d)
   ```

3. **定期轮换凭证**
   - 建议每3-6个月轮换一次Token和Secret

4. **监控日志**
   ```bash
   # 设置日志轮转
   pm2 install pm2-logrotate
   ```

---

## 📝 配置模板

### 旅游业务示例

```json
{
  "wecom": {
    "corpId": "wwxxxxxxxxxxxxxxxx",
    "kfSecret": "your_secret_here",
    "token": "your_token_here",
    "encodingAESKey": "your_aes_key_here"
  },
  "openclaw": {
    "gatewayUrl": "http://localhost:18789",
    "gatewayToken": "your_gateway_token",
    "agentId": "travel"
  },
  "server": {
    "port": 3001
  },
  "welcome": {
    "enabled": true,
    "message": "您好呀，我是小晓 🚂🚢 看您对旅游感兴趣～ 我们主要做专为中老年人设计的轻松线路。您这次想去那里啊？",
    "clearInterval": 86400000
  }
}
```

### 教育业务示例

```json
{
  "wecom": {
    "corpId": "wwxxxxxxxxxxxxxxxx",
    "kfSecret": "your_secret_here",
    "token": "your_token_here",
    "encodingAESKey": "your_aes_key_here"
  },
  "openclaw": {
    "gatewayUrl": "http://localhost:18789",
    "gatewayToken": "your_gateway_token",
    "agentId": "education"
  },
  "server": {
    "port": 3002
  },
  "welcome": {
    "enabled": true,
    "message": "您好！我是教育咨询助手小智 📚 很高兴为您服务。请问您想了解哪方面的课程呢？",
    "clearInterval": 86400000
  }
}
```

---

## 🎯 快速部署检查清单

部署新实例时，按照此清单逐项检查：

- [ ] 收集所有必要的配置信息
- [ ] 生成Token和EncodingAESKey
- [ ] SSH连接到服务器
- [ ] 创建实例目录（/opt/wecom-kf-bridge-N）
- [ ] 复制代码文件
- [ ] 安装依赖（npm install）
- [ ] 创建并编辑config.conf
- [ ] 验证JSON格式
- [ ] 使用PM2启动服务
- [ ] 测试健康检查（curl localhost:PORT/health）
- [ ] 在企业微信后台创建客服账号
- [ ] 配置接收消息URL
- [ ] 完成URL验证
- [ ] 发送测试消息验证
- [ ] 保存PM2配置（pm2 save）
- [ ] 记录实例信息到文档

---

## 📞 支持

如有问题，请查看：
- [配置说明](CONFIG.md)
- [安全说明](SECURITY.md)
- [GitHub Issues](https://github.com/gongyu/wecom-kf-bridge/issues)
