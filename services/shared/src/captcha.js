/**
 * SVG captcha generation and verification.
 * Stores answers in Redis with 5-minute expiry.
 */
const svgCaptcha = require('svg-captcha');
const crypto = require('crypto');

const CAPTCHA_PREFIX = 'captcha:';
const CAPTCHA_TTL = 300; // 5 minutes

async function generate(redis) {
  const captcha = svgCaptcha.create({
    size: 4,
    noise: 3,
    color: true,
    width: 120,
    height: 40,
    ignoreChars: '0o1ilI' // avoid confusing characters
  });

  const uuid = crypto.randomUUID();
  const answer = captcha.text.toLowerCase();

  await redis.set(`${CAPTCHA_PREFIX}${uuid}`, answer, 'EX', CAPTCHA_TTL);

  return { uuid, svg: captcha.data };
}

async function verify(redis, uuid, input) {
  if (!uuid || !input) return false;
  const key = `${CAPTCHA_PREFIX}${uuid}`;
  let answer;
  try {
    answer = await redis.get(key);
  } catch (e) {
    return false;
  }
  if (!answer) return false;
  // Delete after verification (one-time use)
  await redis.del(key);
  return answer === input.toLowerCase();
}

module.exports = { generate, verify };
