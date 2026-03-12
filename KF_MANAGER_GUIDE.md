# 客服管理工具使用指南

`kf-manager.js` 是一个命令行工具，用于管理企业微信客服账号，支持修改头像和名字。

## 📋 功能

- 📝 列出所有客服账号
- 🖼️ 更新客服头像
- ✏️ 更新客服名字
- 🔄 同时更新头像和名字

## 🚀 安装依赖

```bash
npm install
```

## 📖 使用方法

### 1. 列出所有客服账号

```bash
node kf-manager.js list

# 或使用npm脚本
npm run kf list

# 指定配置文件
node kf-manager.js list --config /path/to/config.conf
```

**输出示例**：
```
========================================
  企业微信客服账号列表
========================================

共找到 2 个客服账号:

1. 客服达达
   ID: wkYjQvBwAAoO1EkfROBjszWCkh8oavjg
   头像: https://...

2. 客服小美
   ID: wkYjQvBwAAanSBsm_wRbUGzB9S92A81A
   头像: https://...
```

### 2. 更新客服头像

```bash
node kf-manager.js update-avatar "客服达达" /path/to/avatar.jpg

# 或
npm run kf update-avatar "客服达达" /path/to/avatar.jpg
```

**支持的图片格式**：JPG、PNG
**图片大小限制**：最大10MB

**输出示例**：
```
========================================
  更新客服头像
========================================

[1/3] 查找客服账号...
✓ 找到客服: 客服达达 (wkYjQvBwAAoO1EkfROBjszWCkh8oavjg)

[2/3] 上传头像图片...
✓ 图片上传成功: 3tKIJ250iwRPZhOwPdgo0LwTou1QmC4Nd6ckOYs8BmCfrlcOQqyyMzpY4rp4pTxIryQ2yp4CW1-1rxprPpKBayg

[3/3] 更新客服头像...
✓ 头像更新成功

========================================
  ✅ 完成！
========================================
```

### 3. 更新客服名字

```bash
node kf-manager.js update-name "客服达达" "客服小晓"

# 或
npm run kf update-name "客服达达" "客服小晓"
```

**输出示例**：
```
========================================
  更新客服名字
========================================

[1/2] 查找客服账号...
✓ 找到客服: 客服达达 (wkYjQvBwAAoO1EkfROBjszWCkh8oavjg)

[2/2] 更新客服名字...
✓ 名字已更新: 客服达达 → 客服小晓

========================================
  ✅ 完成！
========================================
```

### 4. 同时更新头像和名字

```bash
node kf-manager.js update "客服达达" "客服小晓" /path/to/avatar.jpg

# 或
npm run kf update "客服达达" "客服小晓" /path/to/avatar.jpg
```

**输出示例**：
```
========================================
  更新客服信息
========================================

[1/3] 查找客服账号...
✓ 找到客服: 客服达达 (wkYjQvBwAAoO1EkfROBjszWCkh8oavjg)

[2/3] 上传头像图片...
✓ 图片上传成功: 3tKIJ250iwRPZhOwPdgo0LwTou1QmC4Nd6ckOYs8BmCfrlcOQqyyMzpY4rp4pTxIryQ2yp4CW1-1rxprPpKBayg

[3/3] 更新客服信息...
✓ 名字已更新: 客服达达 → 客服小晓
✓ 头像已更新

========================================
  ✅ 完成！
========================================
```

## ⚙️ 配置文件

工具默认使用当前目录下的 `config.conf` 文件。你也可以通过 `--config` 参数指定其他配置文件。

**配置文件格式**：
```json
{
  "wecom": {
    "corpId": "你的企业ID",
    "kfSecret": "你的客服Secret"
  }
}
```

## 🔍 常见问题

### 1. 找不到客服账号

**错误**：`未找到客服账号: 客服达达`

**解决方案**：
- 检查客服名字是否正确（区分大小写）
- 使用 `list` 命令查看所有客服账号
- 确认配置文件中的 CorpID 和 Secret 正确

### 2. 图片上传失败

**错误**：`上传图片失败: invalid media size`

**解决方案**：
- 检查图片大小是否超过10MB
- 确认图片格式为JPG或PNG
- 检查图片文件路径是否正确

### 3. 权限错误

**错误**：`获取 access_token 失败: invalid corpsecret`

**解决方案**：
- 检查配置文件中的 `kfSecret` 是否正确
- 确认使用的是客服Secret，不是其他应用的Secret
- 在企业微信后台重新获取Secret

## 📝 使用示例

### 示例1: 批量更新多个客服

```bash
# 更新客服1
node kf-manager.js update "客服达达" "旅游顾问小晓" ./avatars/xiaoxiao.jpg

# 更新客服2
node kf-manager.js update "客服小美" "教育顾问小美" ./avatars/xiaomei.jpg
```

### 示例2: 在服务器上使用

```bash
# SSH连接服务器
ssh ubuntu@your-server.com

# 进入实例目录
cd /opt/wecom-kf-bridge

# 列出客服
node kf-manager.js list

# 更新头像
node kf-manager.js update-avatar "客服达达" /tmp/new-avatar.jpg
```

### 示例3: 使用不同实例的配置

```bash
# 实例1
node kf-manager.js list --config /opt/wecom-kf-bridge/config.conf

# 实例2
node kf-manager.js list --config /opt/wecom-kf-bridge-2/config.conf
```

## 🔐 安全建议

1. **保护配置文件**：
   ```bash
   chmod 600 config.conf
   ```

2. **不要提交到Git**：
   配置文件已添加到 `.gitignore`

3. **定期轮换Secret**：
   建议每3-6个月更换一次客服Secret

## 🛠️ 开发

### 添加新功能

编辑 `kf-manager.js`，添加新的命令：

```javascript
program
  .command('your-command <args>')
  .description('命令描述')
  .option('-c, --config <path>', '配置文件路径', './config.conf')
  .action(yourFunction);
```

### 调试

```bash
# 查看详细错误信息
node kf-manager.js list --verbose
```

## 📚 相关文档

- [企业微信客服API文档](https://developer.work.weixin.qq.com/document/path/94670)
- [配置说明](CONFIG.md)
- [部署指南](DEPLOYMENT_GUIDE.md)

## 💡 提示

- 客服名字必须用引号括起来（如果包含空格）
- 图片路径可以是相对路径或绝对路径
- 更新后立即生效，无需重启服务
- 可以在任何目录运行，只需指定正确的配置文件路径
