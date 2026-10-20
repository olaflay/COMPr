import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isPrivateOrBlockedIp, validateWebhookUrl } from '../lib/ssrf.ts';

describe('SSRF Protection Security Module', () => {
  describe('isPrivateOrBlockedIp', () => {
    test('blocks loopback addresses', () => {
      assert.equal(isPrivateOrBlockedIp('127.0.0.1'), true);
      assert.equal(isPrivateOrBlockedIp('127.0.0.2'), true);
      assert.equal(isPrivateOrBlockedIp('127.255.255.255'), true);
      assert.equal(isPrivateOrBlockedIp('::1'), true);
    });

    test('blocks AWS/GCP/Azure cloud metadata and link-local', () => {
      assert.equal(isPrivateOrBlockedIp('169.254.169.254'), true);
      assert.equal(isPrivateOrBlockedIp('169.254.1.1'), true);
      assert.equal(isPrivateOrBlockedIp('fe80::1'), true);
    });

    test('blocks RFC 1918 private subnets', () => {
      // 10.0.0.0/8
      assert.equal(isPrivateOrBlockedIp('10.0.0.1'), true);
      assert.equal(isPrivateOrBlockedIp('10.255.255.255'), true);

      // 172.16.0.0/12
      assert.equal(isPrivateOrBlockedIp('172.16.0.1'), true);
      assert.equal(isPrivateOrBlockedIp('172.31.255.255'), true);
      assert.equal(isPrivateOrBlockedIp('172.32.0.1'), false); // Public

      // 192.168.0.0/16
      assert.equal(isPrivateOrBlockedIp('192.168.1.1'), true);
      assert.equal(isPrivateOrBlockedIp('192.168.254.254'), true);
    });

    test('blocks carrier-grade NAT and documentation ranges', () => {
      assert.equal(isPrivateOrBlockedIp('100.64.0.1'), true);
      assert.equal(isPrivateOrBlockedIp('192.0.2.1'), true);
      assert.equal(isPrivateOrBlockedIp('198.51.100.1'), true);
      assert.equal(isPrivateOrBlockedIp('203.0.113.1'), true);
    });

    test('allows legitimate public IP addresses', () => {
      assert.equal(isPrivateOrBlockedIp('1.1.1.1'), false);
      assert.equal(isPrivateOrBlockedIp('8.8.8.8'), false);
      assert.equal(isPrivateOrBlockedIp('93.184.216.34'), false);
      assert.equal(isPrivateOrBlockedIp('104.16.132.229'), false);
    });
  });

  describe('validateWebhookUrl', () => {
    test('rejects non-HTTP protocols', async () => {
      const fileRes = await validateWebhookUrl('file:///etc/passwd');
      assert.equal(fileRes.valid, false);

      const gopherRes = await validateWebhookUrl('gopher://127.0.0.1:6379');
      assert.equal(gopherRes.valid, false);
    });

    test('rejects localhost explicitly', async () => {
      const res = await validateWebhookUrl('http://localhost:8080/webhook');
      assert.equal(res.valid, false);
      assert.ok(res.reason?.includes('Localhost'));
    });

    test('rejects cloud metadata IP', async () => {
      const res = await validateWebhookUrl('http://169.254.169.254/latest/meta-data/');
      assert.equal(res.valid, false);
      assert.ok(res.reason?.includes('private or blocked'));
    });

    test('rejects RFC 1918 IPs in webhook URLs', async () => {
      const res1 = await validateWebhookUrl('https://10.10.10.10/events');
      assert.equal(res1.valid, false);

      const res2 = await validateWebhookUrl('http://192.168.1.100/webhook');
      assert.equal(res2.valid, false);
    });

    test('accepts public destination webhook endpoints', async () => {
      const res = await validateWebhookUrl('https://1.1.1.1/webhook');
      assert.equal(res.valid, true);
    });
  });
});
