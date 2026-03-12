/**
 * 企业微信消息加解密模块
 * 基于 AES-256-CBC 算法
 */

import crypto from 'crypto';

export class WeComCrypto {
  constructor(token, encodingAESKey) {
    this.token = token;
    this.aesKey = Buffer.from(encodingAESKey + '=', 'base64');
    this.iv = this.aesKey.slice(0, 16);
  }

  /**
   * 验证消息签名
   */
  verifySignature(signature, timestamp, nonce, encrypt) {
    const tmpStr = [this.token, timestamp, nonce, encrypt].sort().join('');
    const hash = crypto.createHash('sha1').update(tmpStr).digest('hex');
    return hash === signature;
  }

  /**
   * 解密消息
   */
  decrypt(encrypt) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.aesKey, this.iv);
    decipher.setAutoPadding(false);
    
    let decrypted = decipher.update(encrypt, 'base64', 'binary');
    decrypted += decipher.final('binary');
    
    const buffer = Buffer.from(decrypted, 'binary');
    
    // 去除填充
    const padLen = buffer[buffer.length - 1];
    const unpadded = buffer.slice(0, buffer.length - padLen);
    
    // 前16位是随机字符串，4字节是消息长度
    const msgLen = unpadded.readUInt32BE(16);
    const msgStart = 20;
    const msgEnd = msgStart + msgLen;
    
    const message = unpadded.slice(msgStart, msgEnd).toString('utf8');
    const corpId = unpadded.slice(msgEnd).toString('utf8');
    
    return { message, corpId };
  }

  /**
   * 加密消息
   */
  encrypt(message, corpId) {
    const random = crypto.randomBytes(16);
    const msgLen = Buffer.allocUnsafe(4);
    msgLen.writeUInt32BE(Buffer.byteLength(message, 'utf8'), 0);
    const msgBuffer = Buffer.from(message, 'utf8');
    const corpIdBuffer = Buffer.from(corpId, 'utf8');
    
    const toEncrypt = Buffer.concat([random, msgLen, msgBuffer, corpIdBuffer]);
    
    // PKCS7 填充
    const blockSize = 32;
    const padLen = blockSize - (toEncrypt.length % blockSize);
    const padBuffer = Buffer.alloc(padLen, padLen);
    const padded = Buffer.concat([toEncrypt, padBuffer]);
    
    const cipher = crypto.createCipheriv('aes-256-cbc', this.aesKey, this.iv);
    cipher.setAutoPadding(false);
    
    let encrypted = cipher.update(padded);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    return encrypted.toString('base64');
  }

  /**
   * 生成签名
   */
  generateSignature(timestamp, nonce, encrypt) {
    const tmpStr = [this.token, timestamp, nonce, encrypt].sort().join('');
    return crypto.createHash('sha1').update(tmpStr).digest('hex');
  }
}
