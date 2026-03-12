#!/bin/bash

# 企业微信客服中转服务部署脚本

set -e

echo "========================================"
echo "  企业微信客服中转服务部署"
echo "========================================"

# 检查环境
if [ ! -f ".env" ]; then
    echo "[错误] .env 文件不存在，请复制 .env.example 并配置"
    exit 1
fi

# 加载配置
source .env

# 检查必要配置
if [ -z "$WECOM_CORP_ID" ] || [ "$WECOM_CORP_ID" = "your_corp_id" ]; then
    echo "[错误] WECOM_CORP_ID 未配置"
    exit 1
fi

if [ -z "$WECOM_KF_SECRET" ] || [ "$WECOM_KF_SECRET" = "your_kf_secret" ]; then
    echo "[错误] WECOM_KF_SECRET 未配置"
    exit 1
fi

echo "[1/4] 安装依赖..."
npm install --production

echo "[2/4] 测试服务启动..."
timeout 5 node server.js &
PID=$!
sleep 2

# 测试健康检查
if curl -s http://localhost:3000/health > /dev/null; then
    echo "[✓] 服务测试通过"
else
    echo "[✗] 服务测试失败"
    kill $PID 2>/dev/null || true
    exit 1
fi

kill $PID 2>/dev/null || true

echo "[3/4] 配置 systemd 服务..."

# 创建 systemd 服务文件
SERVICE_FILE="/etc/systemd/system/wecom-kf-bridge.service"

sudo tee $SERVICE_FILE > /dev/null <<EOF
[Unit]
Description=WeCom KF Bridge Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=$(which node) $(pwd)/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

echo "[4/4] 启动服务..."
sudo systemctl daemon-reload
sudo systemctl enable wecom-kf-bridge
sudo systemctl restart wecom-kf-bridge

sleep 2

# 检查服务状态
if sudo systemctl is-active --quiet wecom-kf-bridge; then
    echo "[✓] 服务启动成功"
    echo ""
    echo "========================================"
    echo "  部署完成"
    echo "========================================"
    echo "  服务状态: $(sudo systemctl status wecom-kf-bridge --no-pager | grep Active)"
    echo "  访问地址: http://$(curl -s ifconfig.me 2>/dev/null || echo 'your-server-ip'):3000"
    echo "  Webhook:  http://$(curl -s ifconfig.me 2>/dev/null || echo 'your-server-ip'):3000/wecom-kf/webhook"
    echo "========================================"
    echo ""
    echo "下一步:"
    echo "1. 配置企业微信客服 Webhook URL"
    echo "2. 测试消息收发"
else
    echo "[✗] 服务启动失败"
    sudo systemctl status wecom-kf-bridge --no-pager
    exit 1
fi
