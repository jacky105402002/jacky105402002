import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {ROOT,writeTransaction} from '../scripts/cli.mjs';

test('partial local write failure restores original files and removes new files',async()=>{
  await fs.mkdir(path.join(ROOT,'work'),{recursive:true});
  const dir=await fs.mkdtemp(path.join(ROOT,'work/transaction-'));
  await fs.writeFile(path.join(dir,'README.md'),'original');
  await assert.rejects(writeTransaction(dir,{'README.md':'changed','assets/generated/hero.svg':'new','assets/generated/activity.svg':'fail'},{beforeWrite:name=>{if(name.endsWith('activity.svg'))throw new Error('simulated filesystem failure');}}));
  assert.equal(await fs.readFile(path.join(dir,'README.md'),'utf8'),'original');await assert.rejects(fs.access(path.join(dir,'assets/generated/hero.svg')));
  // Keep the tiny failed-write fixture in ignored work/ for inspection.
});
test('writes outside generated allowlist are rejected before mutation',async()=>{
  await assert.rejects(writeTransaction(ROOT,{'../outside.txt':'x'}));
});
