/**
 * 企业微信客服消息中转服务
 * 接收微信客服消息，转发到 OpenClaw Gateway
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';
import { parseString } from 'xml2js';
import axios from 'axios';
import { WeComCrypto } from './wecom-crypto.js';

// Load configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const configPath = join(__dirname, 'config.conf');

console.log('[Config] 尝试加载配置文件，路径:', configPath);

let configData = {};
try {
  const configContent = readFileSync(configPath, 'utf8');
  configData = JSON.parse(configContent);
  console.log('[Config] 配置文件加载成功');
} catch (error) {
  console.warn('[Config] 无法加载配置文件:', error.message);
  console.warn('[Config] 将使用环境变量或默认值');
}

const app = express();
app.use(express.raw({ type: 'text/xml' }));
app.use(express.json());

// 配置（优先使用config.conf，其次使用环境变量，最后使用默认值）
const config = {
  corpId: configData.wecom?.corpId || process.env.WECOM_CORP_ID || '',
  secret: configData.wecom?.kfSecret || process.env.WECOM_KF_SECRET || '',
  token: configData.wecom?.token || process.env.WECOM_TOKEN || '',
  encodingAESKey: configData.wecom?.encodingAESKey || process.env.WECOM_ENCODING_AES_KEY || '',
  openclawUrl: configData.openclaw?.gatewayUrl || process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789',
  openclawToken: configData.openclaw?.gatewayToken || process.env.OPENCLAW_GATEWAY_TOKEN || '',
  agentId: configData.openclaw?.agentId || process.env.AGENT_ID || 'servers',
  port: configData.server?.port || process.env.PORT || 3000,
  welcomeEnabled: configData.welcome?.enabled !== false,
  welcomeMessage: configData.welcome?.message || '您好呀，我是小晓 🚂🚢 看您对旅游感兴趣～ 我们主要做专为中老年人设计的轻松线路。您这次想去那里啊？',
  welcomeClearInterval: configData.welcome?.clearInterval || 86400000,
  dedupMaxSize: configData.dedup?.maxSize || 1000,
  dedupClearInterval: configData.dedup?.clearInterval || 3600000,
};

// 初始化加密模块（支持明文模式）
// 如果 Token 和 EncodingAESKey 未配置，进入明文模式
const crypto = (config.token && config.encodingAESKey && 
                config.token.length >= 3 && 
                config.encodingAESKey.length >= 43)
  ? new WeComCrypto(config.token, config.encodingAESKey)
  : null;

if (crypto) {
  console.log('[Crypto] 安全模式已启用');
} else {
  console.log('[Crypto] 明文模式（Token 或 EncodingAESKey 未配置）');
}

// AccessToken 缓存
let accessToken = {
  token: '',
  expiresAt: 0,
};

// 消息去重：记录已处理的消息 ID
const processedMessages = new Set();

// 欢迎消息：记录已发送欢迎消息的用户
const welcomedUsers = new Set();

// 定期清理已处理消息记录，避免内存无限增长
setInterval(() => {
  if (processedMessages.size > config.dedupMaxSize) {
    console.log('[Dedup] 清理已处理消息记录，当前数量:', processedMessages.size);
    processedMessages.clear();
  }
}, config.dedupClearInterval);

// 定期清理欢迎消息记录
setInterval(() => {
  if (welcomedUsers.size > 0) {
    console.log('[Welcome] 清理欢迎消息记录，当前数量:', welcomedUsers.size);
    welcomedUsers.clear();
  }
}, config.welcomeClearInterval);

/**
 * 获取企业微信 AccessToken
 */
async function getAccessToken() {
  if (accessToken.token && Date.now() < accessToken.expiresAt - 60000) {
    return accessToken.token;
  }

  try {
    const url = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${config.corpId}&corpsecret=${config.secret}`;
    const response = await axios.get(url);
    
    if (response.data.access_token) {
      accessToken.token = response.data.access_token;
      accessToken.expiresAt = Date.now() + (response.data.expires_in * 1000);
      console.log('[Token] 获取成功');
      return accessToken.token;
    } else {
      throw new Error(response.data.errmsg || '获取 Token 失败');
    }
  } catch (error) {
    console.error('[Token] 获取失败:', error.message);
    throw error;
  }
}

/**
 * 同步客服消息
 * 调用企业微信同步消息 API 拉取消息列表
 */
async function syncKfMessages(eventToken, openKfId = '') {
  try {
    const token = await getAccessToken();
    const url = `https://qyapi.weixin.qq.com/cgi-bin/kf/sync_msg?access_token=${token}`;

    let allMessages = [];
    let cursor = '';
    let hasMore = 1;

    // 循环拉取所有消息
    while (hasMore === 1) {
      const payload = {
        cursor: cursor,
        token: eventToken,
        limit: 100,
      };

      if (openKfId) {
        payload.open_kfid = openKfId;
      }

      console.log('[Sync] 拉取消息，cursor:', cursor || '(首次)');

      const response = await axios.post(url, payload);

      if (response.data.errcode === 0) {
        const msgList = response.data.msg_list || [];
        allMessages = allMessages.concat(msgList);

        cursor = response.data.next_cursor || '';
        hasMore = response.data.has_more || 0;

        console.log('[Sync] 本次拉取:', msgList.length, '条，总计:', allMessages.length, '条，hasMore:', hasMore);
      } else {
        console.error('[Sync] 拉取失败:', response.data.errmsg);
        break;
      }
    }

    return allMessages;
  } catch (error) {
    console.error('[Sync] 请求失败:', error.message);
    return [];
  }
}

/**
 * 发送客服消息
 */
async function sendKfMessage(openKfId, externalUserId, msgtype, content) {
  try {
    const token = await getAccessToken();
    const url = `https://qyapi.weixin.qq.com/cgi-bin/kf/send_msg?access_token=${token}`;

    const payload = {
      touser: externalUserId,
      open_kfid: openKfId,
      msgtype,
      [msgtype]: content,
    };

    const response = await axios.post(url, payload);

    if (response.data.errcode === 0) {
      console.log('[Send] 消息发送成功');
      return true;
    } else {
      console.error('[Send] 发送失败:', response.data.errmsg);
      return false;
    }
  } catch (error) {
    console.error('[Send] 请求失败:', error.message);
    return false;
  }
}

/**
 * 转发消息到 OpenClaw
 * 使用 OpenResponses API 将消息发送到 Agent
 */
async function forwardToOpenClaw(message) {
  try {
    // 构建用户消息文本
    let userContent = '';
    if (message.msgtype === 'text') {
      userContent = message.text?.content || '';
    } else if (message.msgtype === 'image') {
      userContent = '[图片消息]';
    } else if (message.msgtype === 'voice') {
      userContent = '[语音消息]';
    } else {
      userContent = `[${message.msgtype}消息]`;
    }

    // 构建会话标识（基于客服账号+用户ID）
    const sessionKey = `wecom-kf:${message.open_kfid}:${message.external_userid}`;

    console.log('[OpenClaw] 转发到 Agent:', config.agentId);
    console.log('[OpenClaw] 会话标识:', sessionKey);

    // 调用 OpenClaw Gateway OpenResponses API
    const url = `${config.openclawUrl}/v1/responses`;

    const payload = {
      model: `agent:${config.agentId}`,
      input: userContent,
      user: sessionKey,
      stream: false,
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${config.openclawToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 180000, // Agent 可能需要时间思考（3分钟）
    });

    console.log('[OpenClaw] 转发成功，收到回复');

    // 解析 Agent 的回复内容
    if (response.data && response.data.output) {
      // output 是一个数组，包含多个 item
      const textItems = response.data.output.filter(item => item.type === 'message' && item.role === 'assistant');
      if (textItems.length > 0) {
        const replyText = textItems.map(item => {
          if (Array.isArray(item.content)) {
            return item.content.map(c => c.text || c).join('');
          }
          return item.content;
        }).join('\n');
        return { content: replyText };
      }
    }

    return null;
  } catch (error) {
    console.error('[OpenClaw] 转发失败:', error.message);
    if (error.response) {
      console.error('[OpenClaw] 状态码:', error.response.status);
      console.error('[OpenClaw] 响应:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

/**
 * 处理接收到的客服消息
 */
async function handleKfMessage(message) {
  console.log('[Message] 收到消息:', {
    type: message.msgtype,
    from: message.external_userid,
    kfId: message.open_kfid,
    msgId: message.msgid,
  });

  // 消息去重检查
  const msgId = message.msgid;
  if (msgId && processedMessages.has(msgId)) {
    console.log('[Message] 跳过已处理消息:', msgId);
    return;
  }

  // 只处理客户发送的消息（origin=3）
  if (message.origin !== 3 && message.origin !== '3') {
    console.log('[Message] 跳过非客户消息，origin:', message.origin);
    return;
  }

  // 标记消息为已处理（在转发前标记，避免并发重复）
  if (msgId) {
    processedMessages.add(msgId);
  }

  // 检查是否是新用户，如果是则发送欢迎消息
  const userId = message.external_userid;
  const userKey = `${message.open_kfid}:${userId}`;

  if (config.welcomeEnabled && !welcomedUsers.has(userKey)) {
    console.log('[Welcome] 新用户，发送欢迎消息:', userId);
    welcomedUsers.add(userKey);

    // 发送欢迎消息
    await sendKfMessage(
      message.open_kfid,
      userId,
      'text',
      { content: config.welcomeMessage }
    );

    // 等待一小段时间，让欢迎消息先到达
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // 转发到 OpenClaw
  const reply = await forwardToOpenClaw(message);

  // 如果有回复，发送回微信
  if (reply && reply.content) {
    await sendKfMessage(
      message.open_kfid,
      message.external_userid,
      'text',
      { content: reply.content }
    );
  }
}

/**
 * 处理事件通知
 */
async function handleKfEvent(eventData) {
  const eventType = eventData.Event;

  console.log('[Event] 收到事件:', eventType);

  // 处理 kf_msg_or_event 事件
  if (eventType === 'kf_msg_or_event') {
    const token = eventData.Token;
    const openKfId = eventData.OpenKfId || '';

    console.log('[Event] kf_msg_or_event 事件，Token:', token ? token.substring(0, 20) + '...' : 'none');

    if (!token) {
      console.error('[Event] Token 为空，无法同步消息');
      return;
    }

    // 同步消息
    const messages = await syncKfMessages(token, openKfId);

    console.log('[Event] 同步到', messages.length, '条消息');

    // 处理每条消息
    for (const message of messages) {
      await handleKfMessage(message);
    }
  }
}

// ==================== 路由 ====================

/**
 * 健康检查
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * 企业微信验证 URL（GET）
 * 企业微信后台配置时发送验证请求
 * 
 * 明文模式：直接返回 echostr
 * 安全模式：验证签名 → 解密 echostr → 返回明文
 */
app.get('/wecom-kf/webhook', (req, res) => {
  const { msg_signature, timestamp, nonce, echostr } = req.query;
  
  // URL 解码 echostr（企业微信发送的是 URL 编码的）
  const decodedEchostr = echostr ? decodeURIComponent(echostr) : '';
  
  console.log('[Verify] ========================================');
  console.log('[Verify] 收到企业微信 URL 验证请求');
  console.log('[Verify] msg_signature:', msg_signature || 'none');
  console.log('[Verify] timestamp:', timestamp);
  console.log('[Verify] nonce:', nonce);
  console.log('[Verify] echostr (encoded):', echostr ? echostr.substring(0, 30) + '...' : 'empty');
  console.log('[Verify] echostr (decoded):', decodedEchostr ? decodedEchostr.substring(0, 30) + '...' : 'empty');

  // 情况1：明文模式（没有 msg_signature，直接返回 echostr）
  if (!msg_signature && decodedEchostr) {
    console.log('[Verify] 明文模式，直接返回 echostr');
    console.log('[Verify] ========================================');
    return res.send(decodedEchostr);
  }

  // 情况2：加密模块未初始化，无法处理安全模式
  if (!crypto) {
    console.error('[Verify] 收到加密请求但加密模块未初始化');
    console.error('[Verify] 请配置 WECOM_TOKEN 和 WECOM_ENCODING_AES_KEY');
    return res.status(500).send('Crypto not initialized');
  }

  // 情况3：安全模式，需要验证签名并解密
  try {
    // 验证签名（使用解码后的 echostr）
    const isValid = crypto.verifySignature(msg_signature, timestamp, nonce, decodedEchostr);
    
    if (!isValid) {
      console.error('[Verify] 签名验证失败');
      console.error('[Verify] 计算的签名:', crypto.generateSignature(timestamp, nonce, decodedEchostr));
      console.error('[Verify] 收到的签名:', msg_signature);
      return res.status(403).send('Invalid signature');
    }

    // 解密并返回 echostr
    const { message } = crypto.decrypt(decodedEchostr);
    console.log('[Verify] 验证成功，返回解密后的 echostr:', message);
    console.log('[Verify] ========================================');
    res.send(message);
  } catch (error) {
    console.error('[Verify] 解密失败:', error.message);
    res.status(500).send('Decrypt failed: ' + error.message);
  }
});

/**
 * 接收企业微信客服消息（POST）
 */
app.post('/wecom-kf/webhook', async (req, res) => {
  const { msg_signature, timestamp, nonce } = req.query;
  
  console.log('[Webhook] ========================================');
  console.log('[Webhook] 收到消息推送');

  try {
    // 解析 XML
    const xmlData = req.body.toString('utf8');
    console.log('[Webhook] 原始 XML:', xmlData.substring(0, 200));
    
    parseString(xmlData, { explicitArray: false }, async (err, result) => {
      if (err) {
        console.error('[Webhook] XML 解析失败:', err);
        return res.status(400).send('Invalid XML');
      }

      const xml = result.xml;
      const encrypt = xml.Encrypt;

      // 验证签名
      if (crypto) {
        const isValid = crypto.verifySignature(msg_signature, timestamp, nonce, encrypt);
        if (!isValid) {
          console.error('[Webhook] 签名验证失败');
          return res.status(403).send('Invalid signature');
        }

        // 解密消息
        const { message } = crypto.decrypt(encrypt);
        console.log('[Webhook] 解密后消息:', message.substring(0, 200));

        parseString(message, { explicitArray: false }, async (err, msgResult) => {
          if (err) {
            console.error('[Webhook] 消息解析失败:', err);
            return res.status(400).send('Invalid message');
          }

          const msgData = msgResult.xml;

          // 判断是事件还是消息
          if (msgData.MsgType === 'event') {
            console.log('[Webhook] 收到事件通知');
            await handleKfEvent(msgData);
          } else {
            console.log('[Webhook] 收到直接消息');
            await handleKfMessage(msgData);
          }

          res.send('success');
        });
      } else {
        // 明文模式（测试用）
        const msgData = xml;

        // 判断是事件还是消息
        if (msgData.MsgType === 'event') {
          console.log('[Webhook] 收到事件通知（明文）');
          await handleKfEvent(msgData);
        } else {
          console.log('[Webhook] 收到直接消息（明文）');
          await handleKfMessage(msgData);
        }

        res.send('success');
      }
    });
  } catch (error) {
    console.error('[Webhook] 处理失败:', error.message);
    res.status(500).send('Internal error');
  }
});

/**
 * 手动发送消息（测试用）
 */
app.post('/api/send', async (req, res) => {
  const { openKfId, externalUserId, content } = req.body;
  
  if (!openKfId || !externalUserId || !content) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await sendKfMessage(openKfId, externalUserId, 'text', { content });
    res.json({ success: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== 启动 ====================

app.listen(config.port, () => {
  console.log('========================================');
  console.log('  企业微信客服中转服务已启动');
  console.log('========================================');
  console.log(`  端口: ${config.port}`);
  console.log(`  Webhook: http://your-domain:${config.port}/wecom-kf/webhook`);
  console.log(`  OpenClaw: ${config.openclawUrl}`);
  console.log(`  Agent: ${config.agentId}`);
  console.log('========================================');
  
  if (!config.corpId || !config.secret) {
    console.warn('[Warning] CorpID 或 Secret 未配置');
  }
  if (!crypto) {
    console.warn('[Warning] 加密模块未初始化，将使用明文模式');
  }
});
