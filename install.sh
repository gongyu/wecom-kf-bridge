#!/bin/bash

# 企业微信客服中转服务 - 一键安装脚本
# 在服务器上执行: curl -fsSL https://your-domain.com/install.sh | bash

set -e

INSTALL_DIR="/opt/wecom-kf-bridge"
SERVICE_NAME="wecom-kf-bridge"

echo "========================================"
echo "  企业微信客服中转服务安装"
echo "========================================"

# 检查 root 权限
if [ "$EUID" -ne 0 ]; then
    echo "[错误] 请使用 sudo 运行"
    exit 1
fi

# 安装 Node.js 20
echo "[1/6] 检查 Node.js..."
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" != "20" ]; then
    echo "[1/6] 安装 Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# 安装 PM2
echo "[2/6] 安装 PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# 创建目录
echo "[3/6] 创建目录..."
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR

# 下载代码
echo "[4/6] 下载代码..."
# 方式1: 从 GitHub 下载（需要上传）
# wget -O wecom-kf-bridge.tar.gz https://github.com/your-repo/releases/download/v1.0.0/wecom-kf-bridge.tar.gz

# 方式2: 本地文件（需要手动上传）
if [ ! -f "wecom-kf-bridge.tar.gz" ]; then
    echo "[提示] 请手动上传 wecom-kf-bridge.tar.gz 到 $INSTALL_DIR"
    echo "然后重新运行此脚本"
    exit 1
fi

tar xzf wecom-kf-bridge.tar.gz

# 安装依赖
echo "[5/6] 安装依赖..."
npm install --production

# 检查配置
echo "[6/6] 检查配置..."
if [ ! -f ".env" ]; then
    echo "[提示] 配置文件 .env 不存在，创建模板..."
    cat > .env << 'EOF'
# 企业微信配置（必填）
WECOM_CORP_ID=wwxxxxxxxxxxxxxxxx
WECOM_KF_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WECOM_TOKEN=xxxxxxxxxxxxxxxx
WECOM_ENCODING_AES_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# OpenClaw Gateway 配置
OPENCLAW_GATEWAY_URL=http://localhost:18789
OPENCLAW_GATEWAY_TOKEN=your_gateway_token_here

# 客服 Agent 配置
AGENT_ID=servers
PORT=3000
EOF
    echo "[警告] 请编辑 .env 文件，填入企业微信配置"
    echo "nano $INSTALL_DIR/.env"
    exit 1
fi

# 检查必要配置
source .env
if [ "$WECOM_CORP_ID" = "wwxxxxxxxxxxxxxxxx" ] || [ -z "$WECOM_CORP_ID" ]; then
    echo "[错误] WECOM_CORP_ID 未配置"
    echo "请编辑 .env 文件: nano $INSTALL_DIR/.env"
    exit 1
fi

if [ "$WECOM_KF_SECRET" = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" ] || [ -z "$WECOM_KF_SECRET" ]; then
    echo "[错误] WECOM_KF_SECRET 未配置"
    echo "请编辑 .env 文件: nano $INSTALL_DIR/.env"
    exit 1
fi

# 启动服务
echo "[6/6] 启动服务..."
pm2 delete $SERVICE_NAME 2>/dev/null || true
pm2 start server.js --name $SERVICE_NAME
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu

echo ""
echo "========================================"
echo "  安装完成"
echo "========================================"
echo "  服务状态: $(pm2 status $SERVICE_NAME | grep $SERVICE_NAME | awk '{print $10}')"
echo "  访问地址: http://your-domain.com:3000"
echo "  Webhook:  http://your-domain.com:3000/wecom-kf/webhook"
echo "========================================"
echo ""
echo "管理命令:"
echo "  查看日志: pm2 logs $SERVICE_NAME"
echo "  重启服务: pm2 restart $SERVICE_NAME"
echo "  停止服务: pm2 stop $SERVICE_NAME"
echo ""
echo "下一步:"
echo "1. 在企业微信后台配置 Webhook URL"
echo "2. 测试消息收发"
