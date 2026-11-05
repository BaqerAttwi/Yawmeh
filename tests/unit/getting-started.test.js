import test from 'node:test';
import assert from 'node:assert/strict';
import {gettingStartedSteps,guideStepReached} from '../../shared/getting-started.js';
test('recommended tour only includes pages the account can access',()=>{
 const pages=permissions=>gettingStartedSteps({role:'user',permissions}).map(s=>s.page);
 assert.deepEqual(pages(['tasks']),['settings','tasks','overview']);
 assert.deepEqual(pages(['money']),['settings','money','money','money','overview']);
 assert.deepEqual(pages([]),['settings','overview']);
 assert.deepEqual(gettingStartedSteps({role:'admin'}).map(s=>s.id),['currencies','savings','income','expense','tasks','overview']);
});
test('guide checks the relevant money tab and Today view, not just the page',()=>{
 const steps=gettingStartedSteps({role:'admin'}),savings=steps.find(s=>s.id==='savings'),income=steps.find(s=>s.id==='income');
 assert.equal(guideStepReached(savings,{page:'money',tab:'transactions'}),false);
 assert.equal(guideStepReached(savings,{page:'money',tab:'savings'}),true);
 assert.equal(guideStepReached(income,{page:'money',tab:'transactions'}),true);
 assert.equal(guideStepReached(steps.at(-1),{page:'overview',overviewTab:'dashboard'}),false);
 assert.equal(guideStepReached(steps.at(-1),{page:'overview',overviewTab:'checkin'}),true);
});
