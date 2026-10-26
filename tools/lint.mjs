import {PHP} from '@php-wasm/universal';
import {loadNodeRuntime,createNodeFsMountHandler} from '@php-wasm/node';
import {fileURLToPath} from 'node:url';
const php=new PHP(await loadNodeRuntime('8.3',{emscriptenOptions:{processId:process.pid}}));
php.mkdir('/theme');
await php.mount('/theme',createNodeFsMountHandler(fileURLToPath(new URL('../theme/weldon-spring',import.meta.url))));
const result=await php.run({code:`<?php $n=0;foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator('/theme')) as $f){if($f->getExtension() !== 'php')continue;try{token_get_all(file_get_contents($f->getPathname()), TOKEN_PARSE);$n++;}catch(ParseError $e){fwrite(STDERR,$f->getPathname().': '.$e->getMessage());exit(1);}}echo "Parsed $n PHP files successfully.\\n";`});
if(result.errors)console.error(result.errors);console.log(result.text);process.exit(result.exitCode);
