import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { bootWordPressAndRequestHandler } from '@wp-playground/wordpress';
import { loadNodeRuntime, createNodeFsMountHandler } from '@php-wasm/node';
const root = fileURLToPath(new URL('../', import.meta.url));
const runtime = root + '.runtime';
if(!existsSync(runtime+'/wordpress-core/wp-load.php')) throw new Error('Run bash tools/setup.sh first.');
const port=Number(process.env.PORT || 9400);
const siteUrl=`http://127.0.0.1:${port}`;
console.log('Starting local WordPress with PHP 8.3 and SQLite…');
const handler=await bootWordPressAndRequestHandler({
  siteUrl, phpVersion:'8.3', maxPhpInstances:1, cookieStore:false,
  createPhpRuntime:()=>loadNodeRuntime('8.3',{emscriptenOptions:{processId:process.pid}}),
  wordpressInstallMode:'install-from-existing-files-if-needed',
  sqliteIntegrationPluginZip: new File([readFileSync(root+'node_modules/@wp-playground/cli/sqlite-database-integration.zip')],'sqlite.zip'),
  constants:{WP_DEBUG:true,WP_DEBUG_DISPLAY:false,WP_DEBUG_LOG:true,DISABLE_WP_CRON:true,WP_ENVIRONMENT_TYPE:'local'},
  hooks:{beforeWordPressFiles:async php=>{
    php.mkdir('/wordpress');
    await php.mount('/wordpress',createNodeFsMountHandler(runtime+'/wordpress-core'));
  },beforeDatabaseSetup:async php=>{
    php.mkdirTree('/wordpress/wp-content/themes/weldon-spring');
    await php.mount('/wordpress/wp-content/themes/weldon-spring',createNodeFsMountHandler(root+'theme/weldon-spring'));
  }},
  onProgress:message=>console.log(message)
});
const php=await handler.getPrimaryPhp();
// Development-only transport: prevent accidental mail and make its failure visible.
php.mkdirTree('/wordpress/wp-content/mu-plugins');
php.writeFile('/wordpress/wp-content/mu-plugins/wsa-local-mail.php', `<?php /* Match Apache/Nginx front-controller semantics in the local WASM adapter. */ $_SERVER['PHP_SELF'] = $_SERVER['SCRIPT_NAME'] ?? '/index.php'; add_filter('pre_wp_mail', function($return, $atts) { if (defined('WP_ENVIRONMENT_TYPE') && WP_ENVIRONMENT_TYPE === 'local') { return false; } return $return; }, 10, 2);`);
const setup=await php.run({code:`<?php require '/wordpress/wp-load.php'; if (get_stylesheet() !== 'weldon-spring') { switch_theme('weldon-spring'); do_action('after_switch_theme'); } if (function_exists('wsa_seed_pages') && !get_page_by_path('home')) { wsa_seed_pages(); } update_option('blog_public', 0); foreach(['hello-world','sample-page'] as $slug) { $p=get_page_by_path($slug, OBJECT, ['post','page']); if($p) wp_delete_post($p->ID,true); } echo 'Pages: '.wp_count_posts('page')->publish;`});
if(setup.exitCode || setup.errors) throw new Error(setup.errors || setup.text);
console.log(setup.text);
let queue=Promise.resolve();
const server=createServer((req,res)=>{
  const task=async()=>{
    try{
      const chunks=[];let length=0;
      for await(const chunk of req){length+=chunk.length;if(length>65536){res.writeHead(413).end();return;}chunks.push(chunk);}
      const headers={};for(const[k,v]of Object.entries(req.headers))if(v!==undefined)headers[k]=Array.isArray(v)?v.join(', '):v;
      const response=await handler.request({url:siteUrl+req.url,method:req.method,headers,body:chunks.length?new Uint8Array(Buffer.concat(chunks)):undefined});
      const out={...response.headers};delete out['transfer-encoding'];delete out['connection'];
      res.writeHead(response.httpStatusCode,out);res.end(response.bytes);
      if(response.errors)console.error(response.errors);
    }catch(error){console.error(error);if(!res.headersSent)res.writeHead(500,{'Content-Type':'text/plain'});res.end('Local WordPress error. See terminal.');}
  };
  queue=queue.then(task,task);
});
server.listen(port,'127.0.0.1',()=>console.log(`Local WordPress listening on port ${port}. Mail is disabled here; test delivery on SiteGround.`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
