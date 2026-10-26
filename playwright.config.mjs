import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./tests',workers:1,timeout:45000,
  use:{baseURL:'http://127.0.0.1:9400',browserName:'chromium',launchOptions:{executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']},screenshot:'only-on-failure'},
  reporter:[['list']],
});
