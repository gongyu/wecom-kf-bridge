#!/usr/bin/env node

/**
 * 企业微信客服管理工具
 * 支持修改客服头像和名字
 */

import axios from 'axios';
import FormData from 'form-data';
import { createReadStream, readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { program } from 'commander';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// AccessToken 缓存
let accessToken = null;
let tokenExpireTime = 0;

/**
 * 加载配置文件
 */
function loadConfig(configPath) {
  if (!existsSync(configPath)) {
    throw new Error(`配置文件不存在: ${configPath}`);
  }

  const configContent = readFileSync(configPath, 'utf8');
  const config = JSON.parse(configContent);

  if (!config.wecom || !config.wecom.corpId || !config.wecom.kfSecret) {
    throw new Error('配置文件缺少必要的企业微信配置 (wecom.corpId, wecom.kfSecret)');
  }

  return config;
}

/**
 * 获取 access_token
 */
async function getAccessToken(corpId, corpSecret) {
  if (accessToken && Date.now() < tokenExpireTime) {
    return accessToken;
  }

  const url = 'https://qyapi.weixin.qq.com/cgi-bin/gettoken';
  const response = await axios.get(url, {
    params: {
      corpid: corpId,
      corpsecret: corpSecret
    }
  });

  if (response.data.errcode === 0 || response.data.access_token) {
    accessToken = response.data.access_token;
    tokenExpireTime = Date.now() + (response.data.expires_in - 300) * 1000;
    return accessToken;
  } else {
    throw new Error(`获取 access_token 失败: ${response.data.errmsg}`);
  }
}

/**
 * 获取客服账号列表
 */
async function getKFAccountList(token) {
  const url = `https://qyapi.weixin.qq.com/cgi-bin/kf/account/list?access_token=${token}`;
  const response = await axios.get(url);

  if (response.data.errcode === 0 || response.data.account_list) {
    return response.data.account_list;
  } else {
    throw new Error(`获取客服列表失败: ${response.data.errmsg}`);
  }
}

/**
 * 上传图片到企业微信
 */
async function uploadImage(token, imagePath) {
  if (!existsSync(imagePath)) {
    throw new Error(`图片文件不存在: ${imagePath}`);
  }

  const url = `https://qyapi.weixin.qq.com/cgi-bin/media/upload?access_token=${token}&type=image`;
  const form = new FormData();
  form.append('media', createReadStream(imagePath));

  const response = await axios.post(url, form, {
    headers: form.getHeaders()
  });

  if (response.data.errcode === 0 || response.data.media_id) {
    return response.data.media_id;
  } else {
    throw new Error(`上传图片失败: ${response.data.errmsg}`);
  }
}

/**
 * 更新客服账号信息
 */
async function updateKFAccount(token, openKfId, updates) {
  const url = `https://qyapi.weixin.qq.com/cgi-bin/kf/account/update?access_token=${token}`;

  const payload = {
    open_kfid: openKfId,
    ...updates
  };

  const response = await axios.post(url, payload);

  if (response.data.errcode === 0) {
    return true;
  } else {
    throw new Error(`更新客服信息失败: ${response.data.errmsg}`);
  }
}

/**
 * 列出所有客服账号
 */
async function listAccounts(options) {
  try {
    console.log('========================================');
    console.log('  企业微信客服账号列表');
    console.log('========================================\n');

    const config = loadConfig(options.config);
    const token = await getAccessToken(config.wecom.corpId, config.wecom.kfSecret);
    const accounts = await getKFAccountList(token);

    if (accounts.length === 0) {
      console.log('未找到任何客服账号');
      return;
    }

    console.log(`共找到 ${accounts.length} 个客服账号:\n`);
    accounts.forEach((account, index) => {
      console.log(`${index + 1}. ${account.name}`);
      console.log(`   ID: ${account.open_kfid}`);
      console.log(`   头像: ${account.avatar || '未设置'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

/**
 * 更新客服头像
 */
async function updateAvatar(kfName, imagePath, options) {
  try {
    console.log('========================================');
    console.log('  更新客服头像');
    console.log('========================================\n');

    const config = loadConfig(options.config);
    const token = await getAccessToken(config.wecom.corpId, config.wecom.kfSecret);

    // 1. 获取客服账号列表
    console.log('[1/3] 查找客服账号...');
    const accounts = await getKFAccountList(token);
    const targetAccount = accounts.find(acc => acc.name === kfName);

    if (!targetAccount) {
      throw new Error(`未找到客服账号: ${kfName}`);
    }
    console.log(`✓ 找到客服: ${targetAccount.name} (${targetAccount.open_kfid})\n`);

    // 2. 上传图片
    console.log('[2/3] 上传头像图片...');
    const mediaId = await uploadImage(token, imagePath);
    console.log(`✓ 图片上传成功: ${mediaId}\n`);

    // 3. 更新头像
    console.log('[3/3] 更新客服头像...');
    await updateKFAccount(token, targetAccount.open_kfid, { media_id: mediaId });
    console.log('✓ 头像更新成功\n');

    console.log('========================================');
    console.log('  ✅ 完成！');
    console.log('========================================');

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    process.exit(1);
  }
}

/**
 * 更新客服名字
 */
async function updateName(kfName, newName, options) {
  try {
    console.log('========================================');
    console.log('  更新客服名字');
    console.log('========================================\n');

    const config = loadConfig(options.config);
    const token = await getAccessToken(config.wecom.corpId, config.wecom.kfSecret);

    // 1. 获取客服账号列表
    console.log('[1/2] 查找客服账号...');
    const accounts = await getKFAccountList(token);
    const targetAccount = accounts.find(acc => acc.name === kfName);

    if (!targetAccount) {
      throw new Error(`未找到客服账号: ${kfName}`);
    }
    console.log(`✓ 找到客服: ${targetAccount.name} (${targetAccount.open_kfid})\n`);

    // 2. 更新名字
    console.log('[2/2] 更新客服名字...');
    await updateKFAccount(token, targetAccount.open_kfid, { name: newName });
    console.log(`✓ 名字已更新: ${kfName} → ${newName}\n`);

    console.log('========================================');
    console.log('  ✅ 完成！');
    console.log('========================================');

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    process.exit(1);
  }
}

/**
 * 同时更新头像和名字
 */
async function updateBoth(kfName, newName, imagePath, options) {
  try {
    console.log('========================================');
    console.log('  更新客服信息');
    console.log('========================================\n');

    const config = loadConfig(options.config);
    const token = await getAccessToken(config.wecom.corpId, config.wecom.kfSecret);

    // 1. 获取客服账号列表
    console.log('[1/3] 查找客服账号...');
    const accounts = await getKFAccountList(token);
    const targetAccount = accounts.find(acc => acc.name === kfName);

    if (!targetAccount) {
      throw new Error(`未找到客服账号: ${kfName}`);
    }
    console.log(`✓ 找到客服: ${targetAccount.name} (${targetAccount.open_kfid})\n`);

    // 2. 上传图片
    console.log('[2/3] 上传头像图片...');
    const mediaId = await uploadImage(token, imagePath);
    console.log(`✓ 图片上传成功: ${mediaId}\n`);

    // 3. 更新信息
    console.log('[3/3] 更新客服信息...');
    await updateKFAccount(token, targetAccount.open_kfid, {
      name: newName,
      media_id: mediaId
    });
    console.log(`✓ 名字已更新: ${kfName} → ${newName}`);
    console.log('✓ 头像已更新\n');

    console.log('========================================');
    console.log('  ✅ 完成！');
    console.log('========================================');

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    process.exit(1);
  }
}

// 命令行接口
program
  .name('kf-manager')
  .description('企业微信客服管理工具')
  .version('1.0.0');

program
  .command('list')
  .description('列出所有客服账号')
  .option('-c, --config <path>', '配置文件路径', './config.conf')
  .action(listAccounts);

program
  .command('update-avatar <name> <image>')
  .description('更新客服头像')
  .option('-c, --config <path>', '配置文件路径', './config.conf')
  .action(updateAvatar);

program
  .command('update-name <name> <newName>')
  .description('更新客服名字')
  .option('-c, --config <path>', '配置文件路径', './config.conf')
  .action(updateName);

program
  .command('update <name> <newName> <image>')
  .description('同时更新客服名字和头像')
  .option('-c, --config <path>', '配置文件路径', './config.conf')
  .action(updateBoth);

program.parse();
