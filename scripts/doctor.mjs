import {spawnSync} from 'node:child_process';
import {runtimePaths} from '../runtimes.mjs';
const paths=runtimePaths();let errors=0;
console.log('Concept Lab setup check\n');
if(process.platform!=='darwin'){console.log('This beta supports macOS only. Linux and Windows runners are not implemented.');errors++;}
if(Number(process.versions.node.split('.')[0])<20){console.log('Node.js 20+ is required.');errors++;}
for(const [name,exe,args] of [['Node.js',paths.node,['--version']],['Go',paths.go,['version']],['Python',paths.python,['--version']],['Java compiler',paths.javac,['--version']],['Java runtime',paths.java,['--version']],['C++',paths.cpp,['--version']],['Rust',paths.rust,['--version']]]){
 if(!exe){console.log(`${name}: missing. Install it from its official website or package manager, then reopen your terminal.`);errors++;continue;}
 const r=spawnSync(exe,args,{encoding:'utf8',timeout:10000});if(r.status!==0){console.log(`${name}: executable found but did not run. Set a working path using CONCEPT_LAB_GO or CONCEPT_LAB_PYTHON.`);errors++;continue;}
 const version=(r.stdout||r.stderr).trim();console.log(`${name}: ${version}`);
 if(name==='Go'){const m=version.match(/go1\.(\d+)/);if(!m||Number(m[1])<22){console.log('Go 1.22+ is required.');errors++;}}
 if(name==='Python'){const m=version.match(/Python (\d+)\.(\d+)/);if(!m||Number(m[1])<3||(Number(m[1])===3&&Number(m[2])<10)){console.log('Python 3.10+ is required.');errors++;}}
}
console.log('\nNo credentials were inspected and no packages were downloaded.');console.log(errors?'Resolve the items above, then run npm run doctor again.':'Ready: run npm start, then open http://127.0.0.1:4318.');process.exitCode=errors?1:0;
