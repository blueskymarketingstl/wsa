import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./tests',testMatch:'site.spec.mjs',workers:1,timeout:45000,
  use:{baseURL:'http://127.0.0.1:9402',browserName:'chromium',launchOptions:{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']},screenshot:'only-on-failure'},
  webServer:{command:'npm start',url:'http://127.0.0.1:9402/health',reuseExistingServer:false,env:{PORT:'9402',NODE_ENV:'production',NOINDEX:'true'}},
  reporter:[['list']]
});
