import {z} from 'zod';
import {hasAccess} from './access.js';

// Each operation maps to an existing workspace action or a scoped title edit.
export const changeOperations = {
  cancelTask: {types:['task'], label:'Cancel task'},
  restoreTask: {types:['task'], label:'Restore task'},
  completeTask: {types:['task'], label:'Complete task'},
  reopenTask: {types:['task'], label:'Reopen task'},
  rescheduleTask: {types:['task'], label:'Reschedule task', field:'date'},
  categorizeTask: {types:['task'], label:'Change task category', field:'category'},
  repeatTask: {types:['task'], label:'Change repeat schedule', field:'repeat'},
  addSubtask: {types:['task'], label:'Add a checklist step', field:'step'},
  estimateTask: {types:['task'], label:'Change task estimate', field:'minutes'},
  reverseEntry: {types:['income','expense','transaction','opening','withdrawal'], label:'Reverse transaction', field:'reason'},
  rename: {types:['task','income','expense','transaction','opening','withdrawal','subscription','budget','goal','item'], label:'Change name', field:'title'},
  pauseSubscription: {types:['subscription'], label:'Pause subscription'},
  resumeSubscription: {types:['subscription'], label:'Resume subscription'},
  renewSubscription: {types:['subscription'], label:'Record subscription payment'},
  markRarelyUsed: {types:['subscription'], label:'Mark subscription as rarely used'},
  markRegularlyUsed: {types:['subscription'], label:'Mark subscription as regularly used'},
  archiveNote: {types:['note'], label:'Archive note'},
  restoreNote: {types:['note'], label:'Restore note'},
  convertNote: {types:['note'], label:'Convert note to task', field:'date'},
  updateGoal: {types:['goal'], label:'Change monthly savings plan', field:'amount'},
  fundGoal: {types:['goal'], label:'Assign savings to goal', field:'amount'},
  releaseGoal: {types:['goal'], label:'Release savings from goal', field:'amount'},
};

const tables = {
  task:'tasks', income:'entries', expense:'entries', transaction:'entries',
  opening:'entries', withdrawal:'entries', subscription:'subscriptions',
  budget:'budgets', goal:'goals', item:'items', note:'inbox',
};

export const companionChangeSchema = z.object({
  operation:z.enum(Object.keys(changeOperations)),
  type:z.enum(Object.keys(tables)),
  target:z.string().trim().max(160),
  value:z.string().trim().max(500).optional(),
}).strict();

export function changeTable(change) {
  return change.operation === 'restoreTask' ? 'cancelled_tasks' : tables[change.type];
}

export function canReviewChange(user, change) {
  const operation = changeOperations[change.operation];
  if (!operation?.types.includes(change.type)) return false;
  return hasAccess(user, ['task','note'].includes(change.type) ? 'tasks' : 'money');
}

export function proposeCompanionChange(user, change, language) {
  const ar = language === 'ar';
  if (!canReviewChange(user, change)) {
    return {answer:ar?'هالتغيير مش متاح للمساعد بحسابك.':'This change is unavailable through the companion for your account.',language};
  }
  return {
    answer:ar?'افتح المراجعة وتأكّد من السجل والتغيير قبل التأكيد.':'Open the review to check the record and proposed change, then confirm.',
    change,language,
  };
}

export function changeRecordName(record) {
  return record.title ?? record.text;
}

const fold = value => value.normalize('NFKC').toLowerCase().replace(/\p{M}/gu,'').replace(/\s+/g,' ').trim();
const unquote = value => value.trim().replace(/^["“«']|["”»']$/g,'');

export function changeCandidates(data, user, change) {
  if (!canReviewChange(user, change)) return [];
  const table = changeTable(change);
  const records = (data[table] || []).filter(record => {
    if (table === 'entries') return !record.voided_on && (change.type === 'transaction' || record.type === change.type);
    return true;
  });
  const target = fold(change.target);
  if (!target) return records;
  return records.filter(record => fold(changeRecordName(record) || '') === target);
}

const aliases = {
  'delete':'cancelTask', 'remove':'cancelTask', 'cancel':'cancelTask', 'restore':'restoreTask',
  'complete':'completeTask', 'finish':'completeTask', 'reopen':'reopenTask',
  'move':'rescheduleTask', 'reschedule':'rescheduleTask', 'categorize':'categorizeTask',
  'repeat':'repeatTask', 'estimate':'estimateTask', 'reverse':'reverseEntry', 'void':'reverseEntry',
  'rename':'rename', 'pause':'pauseSubscription', 'resume':'resumeSubscription',
  'renew':'renewSubscription', 'archive':'archiveNote', 'convert':'convertNote',
  'fund':'fundGoal', 'release':'releaseGoal',
};
const types = {
  task:'task', income:'income', expense:'expense', transaction:'transaction',
  subscription:'subscription', budget:'budget', goal:'goal', item:'item', note:'note',
};
const arabicVerbs = {
  احذف:'delete', احزف:'delete', امحي:'delete', شيل:'delete', الغي:'cancel',
  استرجع:'restore', خلص:'complete', كمل:'complete', رجع:'reopen',
  اجل:'reschedule', انقل:'move', غير:'rename', سمي:'rename', وقف:'pause', جدد:'renew',
};
const arabiziVerbs = {shil:'delete', ghayyer:'rename', ghayer:'rename', sammi:'rename', wa2ef:'pause'};
const arabicTypes = {مهمة:'task', مهمه:'task', دخل:'income', مصروف:'expense', عملية:'transaction', اشتراك:'subscription', ميزانية:'budget', هدف:'goal', ملاحظة:'note'};

export function parseCompanionChange(question) {
  const text = question.trim()
    .replace(/^(?:(?:please|can you|could you|bde|bdi|baddi|بدي|لو سمحت)\s+)+/i,'')
    .replace(/^(?:change|edit|update)\s+(?:the\s+)?name of\s+/i,'rename ');
  const match = text.match(/^(\S+)\s+(?:(?:the|my)\s+)?(\S+)(?:\s+(.*))?$/u);
  if (!match) return null;
  const verb = fold(match[1]).replace(/[أإآ]/g,'ا');
  const noun = fold(match[2]).replace(/^ال/,'').replace(/[أإآ]/g,'ا');
  const command = arabicVerbs[verb] || arabiziVerbs[verb] || verb;
  const type = arabicTypes[noun] || types[noun];
  if (!type || !Object.hasOwn(aliases,command)) return null;
  let operation = aliases[command];
  if (operation === 'cancelTask' && type === 'subscription') operation = 'pauseSubscription';
  if (operation === 'cancelTask' && changeOperations.reverseEntry.types.includes(type)) operation = 'reverseEntry';
  if (operation === 'cancelTask' && type === 'note') operation = 'archiveNote';
  if (operation === 'restoreTask' && type === 'note') operation = 'restoreNote';
  if (operation === 'restoreTask' && type === 'subscription') operation = 'resumeSubscription';
  let target = match[3] || '', value;
  if (changeOperations[operation].field) {
    const separator = operation === 'reverseEntry' ? /\s+(?:because|reason:|لأن|بسبب)\s+/i : /\s+(?:to|as|إلى|الى|لـ)\s+/i;
    const quotedTarget = target.match(/^(?:"[^"]*"|“[^”]*”|«[^»]*»|'[^']*')/u)?.[0] || '';
    const split = separator.exec(target.slice(quotedTarget.length));
    if (split) {
      const boundary = quotedTarget.length + split.index;
      value = unquote(target.slice(boundary + split[0].length));
      target = target.slice(0, boundary);
    }
  }
  const parsed = companionChangeSchema.safeParse({operation,type,target:unquote(target),value});
  return parsed.success ? parsed.data : null;
}
