# 客服管理工具 - 快速参考

## 🚀 快速开始

```bash
# 安装依赖（首次使用）
npm install

# 查看帮助
node kf-manager.js --help
```

## 📝 常用命令

### 列出所有客服
```bash
node kf-manager.js list
```

### 更新头像
```bash
node kf-manager.js update-avatar "客服达达" ./avatar.jpg
```

### 更新名字
```bash
node kf-manager.js update-name "客服达达" "客服小晓"
```

### 同时更新
```bash
node kf-manager.js update "客服达达" "客服小晓" ./avatar.jpg
```

## 🔧 多实例使用

```bash
# 实例1
node kf-manager.js list --config ./config.conf

# 实例2
node kf-manager.js list --config /opt/wecom-kf-bridge-2/config.conf
```

## 💡 提示

- 客服名字需要用引号括起来
- 支持 JPG、PNG 格式图片
- 图片大小不超过 10MB
- 更新后立即生效

## 📚 详细文档

查看 [KF_MANAGER_GUIDE.md](KF_MANAGER_GUIDE.md) 获取完整使用说明。
