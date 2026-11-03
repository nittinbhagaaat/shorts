#!/usr/bin/env node
/**
 * scripts/refresh-cookies-playwright.js
 * Automated Headless YouTube Cookie Refresher for VPS/Server environments
 * 
 * Uses Playwright with a persistent user data directory to maintain an active
 * YouTube login session, refreshes session tokens, and dumps them to Netscape cookies.txt.
 * 
 * Setup:
 *   npm install playwright
 *   npx playwright install chromium
 * 
 * First-time setup (interactive login):
 *   node scripts/refresh-cookies-playwright.js --login
 * 
 * Automated cron execution (headless refresh):
 *   0 4 * * * node /var/www/shorts/scripts/refresh-cookies-playwright.js >> /var/log/cookie-refresh.log 2>&1
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USER_DATA_DIR = process.env.PLAYWRIGHT_USER_DATA_DIR || path.join(process.env.HOME || '/root', '.youtube-browser-profile');
const OUTPUT_COOKIE_PATH = process.env.OUTPUT_COOKIE_PATH || path.join(__dirname, '..', 'cookies.txt');

function convertToNetscape(cookies) {
  let content = '# Netscape HTTP Cookie File\n# Generated automatically by clip.studio cookie refresher\n\n';
  for (const c of cookies) {
    const domain = c.domain.startsWith('.') ? c.domain : `.${c.domain}`;
    const includeSubdomains = 'TRUE';
    const cookiePath = c.path || '/';
    const isSecure = c.secure ? 'TRUE' : 'FALSE';
    const expires = Math.round(c.expires > 0 ? c.expires : (Date.now() / 1000) + (365 * 24 * 3600));
    content += `${domain}\t${includeSubdomains}\t${cookiePath}\t${isSecure}\t${expires}\t${c.name}\t${c.value}\n`;
  }
  return content;
}

async function run() {
  let playwright;
  try {
    playwright = await import('playwright');
  } catch (err) {
    console.error('❌ Playwright is not installed. Run: npm install playwright && npx playwright install chromium');
    process.exit(1);
  }

  const isLoginMode = process.argv.includes('--login');
  console.log(`[CookieRefresher] Starting (Mode: ${isLoginMode ? 'INTERACTIVE LOGIN' : 'AUTOMATED REFRESH'})...`);

  const browserContext = await playwright.chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: !isLoginMode,
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  });

  const page = await browserContext.newPage();

  try {
    console.log('[CookieRefresher] Navigating to YouTube...');
    await page.goto('https://www.youtube.com', { waitUntil: 'domcontentloaded', timeout: 30000 });

    if (isLoginMode) {
      console.log('👉 Please log into your Google/YouTube account in the opened browser window.');
      console.log('   Once logged in, press Enter in this terminal to save your session.');
      await new Promise((resolve) => process.stdin.once('data', resolve));
    } else {
      // Allow session tokens and background pings to execute
      await page.waitForTimeout(4000);
    }

    const cookies = await browserContext.cookies(['https://www.youtube.com', 'https://google.com']);
    const hasLogin = cookies.some((c) => c.name === 'LOGIN_INFO' || c.name === '__Secure-3PSID' || c.name === 'SAPISID');

    if (!hasLogin) {
      console.warn('⚠️ Warning: Extracted cookies do not contain a logged-in YouTube session.');
      console.warn('   Run with "--login" once to authenticate a burner Google account.');
    } else {
      console.log('✅ Active YouTube authenticated login session detected!');
    }

    const netscapeContent = convertToNetscape(cookies);
    fs.writeFileSync(OUTPUT_COOKIE_PATH, netscapeContent, 'utf8');
    console.log(`📁 Successfully wrote fresh cookies to: ${OUTPUT_COOKIE_PATH} (${cookies.length} cookies)`);
  } catch (err) {
    console.error('❌ Error during cookie refresh:', err.message);
  } finally {
    await browserContext.close();
  }
}

run();

