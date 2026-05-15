const axios = require('axios');
const http = require('http');
const https = require('https');

const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 45000);
const AI_RETRY_MAX = Number(process.env.AI_RETRY_MAX || 2);
const AI_RETRY_DELAY_MS = Number(process.env.AI_RETRY_DELAY_MS || 500);

const aiClient = axios.create({
  baseURL: AI_URL,
  timeout: AI_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true })
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryable = (err) => {
  if (!err) return false;
  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') return true;
  if (!err.response) return true;
  return [502, 503, 504].includes(err.response.status);
};

const requestWithRetry = async (config, attempt = 0) => {
  try {
    return await aiClient.request(config);
  } catch (err) {
    if (attempt >= AI_RETRY_MAX || !isRetryable(err)) {
      throw err;
    }
    const delay = AI_RETRY_DELAY_MS * Math.pow(2, attempt);
    await sleep(delay);
    return requestWithRetry(config, attempt + 1);
  }
};

module.exports = {
  AI_URL,
  AI_TIMEOUT_MS,
  AI_RETRY_MAX,
  AI_RETRY_DELAY_MS,
  aiClient,
  requestWithRetry
};
