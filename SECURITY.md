# 安全说明

## ⚠️ 重要提醒

本项目涉及企业微信客服集成，包含敏感配置信息。请务必注意以下安全事项：

## 🔒 配置文件安全

### 不要提交的文件

以下文件包含敏感信息，已添加到 `.gitignore`，**绝不要提交到Git仓库**：

- `config.conf` - 主配置文件（包含所有真实凭证）
- `.env` - 环境变量文件

### 可以提交的文件

- `config.conf.example` - 配置模板（仅包含占位符）
- `.env.example` - 环境变量模板（仅包含占位符）

## 🛡️ 凭证管理

### 需要保护的敏感信息

1. **企业微信凭证**
   - 企业ID (CorpID)
   - 客服Secret
   - 消息加解密Token
   - EncodingAESKey

2. **OpenClaw Gateway**
   - Gateway访问令牌

3. **服务器信息**
   - 服务器域名/IP
   - SSH密码

### 凭证轮换建议

- **定期轮换**：建议每3-6个月轮换一次所有凭证
- **泄露后立即轮换**：如果怀疑凭证泄露，立即重新生成
- **使用强密码**：Token和Secret应使用足够长度的随机字符串

## 📋 安全检查清单

在提交代码前，请确认：

- [ ] `config.conf` 和 `.env` 已添加到 `.gitignore`
- [ ] 代码中没有硬编码的凭证
- [ ] 文档中使用的都是占位符，不是真实凭证
- [ ] 运行 `git log -p` 检查历史记录中没有敏感信息

## 🔍 检查命令

```bash
# 检查暂存区是否包含敏感文件
git status

# 检查是否有硬编码的凭证（替换为你的真实凭证片段）
git grep -i "your_real_token_here"

# 检查Git历史
git log -p --all | grep -i "secret\|token\|password"
```

## 🚨 如果不小心提交了敏感信息

1. **立即轮换所有泄露的凭证**
2. **清理Git历史**：
   ```bash
   # 删除远程仓库
   gh repo delete username/repo-name --yes

   # 删除本地Git历史
   rm -rf .git

   # 重新初始化
   git init
   git add .
   git commit -m "Initial commit"

   # 重新创建远程仓库
   gh repo create repo-name --public --source=. --push
   ```

3. **监控异常访问**：密切关注企业微信后台和服务器日志

## 📚 相关文档

- [配置说明](CONFIG.md)
- [部署文档](DEPLOYMENT_V7.md)
- [README](README.md)

## 💡 最佳实践

1. **使用环境变量**：生产环境使用环境变量而不是配置文件
2. **最小权限原则**：只授予必要的权限
3. **定期审查**：定期检查代码和配置文件
4. **使用密钥管理服务**：考虑使用 AWS Secrets Manager、HashiCorp Vault 等
5. **启用双因素认证**：为GitHub和企业微信账号启用2FA
