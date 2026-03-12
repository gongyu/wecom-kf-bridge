#!/bin/bash

# 企业微信客服实例自动部署脚本
# 用法: ./deploy-instance.sh <实例编号>

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印函数
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查参数
if [ -z "$1" ]; then
    print_error "请提供实例编号"
    echo "用法: $0 <实例编号>"
    echo "示例: $0 2"
    exit 1
fi

INSTANCE_NUM=$1
BASE_DIR="/opt/wecom-kf-bridge"
INSTANCE_DIR="/opt/wecom-kf-bridge-${INSTANCE_NUM}"
PORT=$((3000 + INSTANCE_NUM))
PM2_NAME="wecom-kf-bridge-${INSTANCE_NUM}"

echo "========================================"
echo "  企业微信客服实例部署脚本"
echo "========================================"
echo "  实例编号: ${INSTANCE_NUM}"
echo "  安装目录: ${INSTANCE_DIR}"
echo "  服务端口: ${PORT}"
echo "  PM2名称: ${PM2_NAME}"
echo "========================================"
echo ""

# 检查是否已存在
if [ -d "$INSTANCE_DIR" ]; then
    print_warn "实例目录已存在: ${INSTANCE_DIR}"
    read -p "是否覆盖? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "取消部署"
        exit 0
    fi
    print_info "删除旧实例..."
    pm2 delete ${PM2_NAME} 2>/dev/null || true
    sudo rm -rf ${INSTANCE_DIR}
fi

# 创建目录
print_info "创建实例目录..."
sudo mkdir -p ${INSTANCE_DIR}
sudo chown $USER:$USER ${INSTANCE_DIR}

# 复制代码文件
print_info "复制代码文件..."
cp ${BASE_DIR}/server.js ${INSTANCE_DIR}/
cp ${BASE_DIR}/wecom-crypto.js ${INSTANCE_DIR}/
cp ${BASE_DIR}/package.json ${INSTANCE_DIR}/
cp ${BASE_DIR}/.gitignore ${INSTANCE_DIR}/ 2>/dev/null || true

cd ${INSTANCE_DIR}

# 安装依赖
print_info "安装依赖..."
npm install --production --silent

# 收集配置信息
echo ""
echo "========================================"
echo "  配置信息收集"
echo "========================================"
echo ""

read -p "企业ID (CorpID): " CORP_ID
read -p "客服Secret: " KF_SECRET
read -p "Token (16位): " TOKEN
read -p "EncodingAESKey (43位): " AES_KEY
read -p "Gateway Token: " GATEWAY_TOKEN
read -p "Agent ID: " AGENT_ID
read -p "欢迎消息: " WELCOME_MSG

# 创建配置文件
print_info "创建配置文件..."
cat > config.conf << EOF
{
  "wecom": {
    "corpId": "${CORP_ID}",
    "kfSecret": "${KF_SECRET}",
    "token": "${TOKEN}",
    "encodingAESKey": "${AES_KEY}"
  },
  "openclaw": {
    "gatewayUrl": "http://localhost:18789",
    "gatewayToken": "${GATEWAY_TOKEN}",
    "agentId": "${AGENT_ID}"
  },
  "server": {
    "port": ${PORT}
  },
  "welcome": {
    "enabled": true,
    "message": "${WELCOME_MSG}",
    "clearInterval": 86400000
  },
  "dedup": {
    "maxSize": 1000,
    "clearInterval": 3600000
  }
}
EOF

# 验证JSON格式
print_info "验证配置文件格式..."
if ! python3 -m json.tool config.conf > /dev/null 2>&1; then
    print_error "配置文件JSON格式错误"
    exit 1
fi

# 设置文件权限
chmod 600 config.conf

# 启动服务
print_info "启动服务..."
pm2 start server.js --name ${PM2_NAME}

# 等待服务启动
sleep 3

# 验证服务
print_info "验证服务状态..."
if pm2 status ${PM2_NAME} | grep -q "online"; then
    print_info "服务启动成功"
else
    print_error "服务启动失败"
    pm2 logs ${PM2_NAME} --lines 20
    exit 1
fi

# 测试健康检查
print_info "测试健康检查..."
if curl -s http://localhost:${PORT}/health | grep -q "ok"; then
    print_info "健康检查通过"
else
    print_warn "健康检查失败，请检查日志"
fi

# 保存PM2配置
print_info "保存PM2配置..."
pm2 save

echo ""
echo "========================================"
echo "  ✅ 部署完成"
echo "========================================"
echo "  实例目录: ${INSTANCE_DIR}"
echo "  服务端口: ${PORT}"
echo "  PM2名称: ${PM2_NAME}"
echo "  Webhook URL: http://your-domain:${PORT}/wecom-kf/webhook"
echo "========================================"
echo ""
echo "下一步操作:"
echo "1. 在企业微信后台配置Webhook URL"
echo "2. 使用以下命令查看日志:"
echo "   pm2 logs ${PM2_NAME}"
echo "3. 使用以下命令管理服务:"
echo "   pm2 restart ${PM2_NAME}  # 重启"
echo "   pm2 stop ${PM2_NAME}     # 停止"
echo "   pm2 delete ${PM2_NAME}   # 删除"
echo ""
