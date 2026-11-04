import test from 'node:test';
import assert from 'node:assert/strict';
import {gettingStartedSteps} from '../../shared/getting-started.js';
test('recommended tour only includes pages the account can access',()=>{
 const pages=permissions=>gettingStartedSteps({role:'user',permissions}).map(s=>s.page);
 assert.deepEqual(pages(['tasks']),['settings','tasks','overview']);
 assert.deepEqual(pages(['money']),['settings','money','overview']);
 assert.deepEqual(pages([]),['settings','overview']);
 assert.deepEqual(gettingStartedSteps({role:'admin'}).map(s=>s.page),['settings','tasks','money','overview']);
});
