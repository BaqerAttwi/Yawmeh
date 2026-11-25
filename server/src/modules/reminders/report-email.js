import {fileURLToPath} from 'node:url';
import {hasAccess} from '../../../../shared/access.js';
import {currencyCatalog,formatMoney} from '../../../../shared/currency.js';
import {addDays} from '../../../../shared/planner.js';
import {buildWorkspaceReport,reportPreset,workspaceOverview,workspaceReports} from '../../../../shared/workspace-reports.js';

const avatar=fileURLToPath(new URL('../../../../client/public/branding/yawmeh-logo-small.png',import.meta.url));
const avatarCid='yawmeh-avatar@yawmeh.me';
const moneySections=['comparison','expenses','income','transactions','balances','budgets','goals','goal-activity','subscriptions','reversals'];
const taskSections=['task-categories','tasks','completions','check-ins'];
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function scheduledReportPeriods(current,hour){
  const periods=[];
  const weekday=new Date(current+'T12:00:00Z').getUTCDay();
  if((weekday===0&&hour>=9)||weekday===1){
    const sunday=weekday===0?current:addDays(current,-1);
    periods.push({kind:'weekly',start:addDays(sunday,-7),end:addDays(sunday,-1)});
  }
  const date=Number(current.slice(-2));
  if((date===1&&hour>=9)||date===2)periods.push({kind:'monthly',...reportPreset('last-month',current)});
  return periods;
}

export function pendingReportEmails(users,periods){
  return users.flatMap(user=>user.report_emails&&user.reminder_email
    ?periods.filter(period=>hasAccess(user,'money')||(period.kind==='monthly'&&hasAccess(user,'tasks')))
      .map(period=>({user,period,key:`report:${user.id}:${period.kind}:${period.end}`}))
    :[]);
}

function reportTable(id,data,user,options,catalog){
  const report=buildWorkspaceReport(id,data,user,options);
  const title=workspaceReports.find(item=>item.id===id).title;
  const cell=(value,column,row)=>column.currency||column.native
    ?value==null?'—':formatMoney(value,column.currency||row[typeof column.native==='number'?column.native:0],catalog)
    :value??'—';
  const table=report.rows.length?`<table><thead><tr>${report.columns.map(column=>`<th scope="col">${escapeHTML(column.label)}</th>`).join('')}</tr></thead><tbody>${report.rows.map(row=>`<tr>${row.map((value,index)=>`<td>${escapeHTML(cell(value,report.columns[index],row))}</td>`).join('')}</tr>`).join('')}</tbody></table>`:'<p>No records for this section.</p>';
  return `<section><h2>${escapeHTML(title)}</h2>${report.note?`<p>${escapeHTML(report.note)}</p>`:''}${table}</section>`;
}

export function buildReportEmail({user,period,key,data,from}){
  const {kind,start,end}=period;
  const monthly=kind==='monthly',money=hasAccess(user,'money'),tasks=monthly&&hasAccess(user,'tasks');
  const currency=data.settings?.home_currency||'USD',catalog=currencyCatalog(data.settings);
  const format=value=>formatMoney(value,currency,catalog);
  const options={start,end,current:end,currency};
  data={
    ...data,
    entries:(data.entries||[]).map(entry=>entry.voided_on&&entry.voided_on.slice(0,10)>end?{...entry,voided_on:null}:entry),
    tasks:(data.tasks||[]).map(task=>task.completed_on>end?{...task,completed:false,completed_on:null}:task),
  };
  const title=monthly?'Your monthly Yawmeh report':'Your weekly money report';
  const range=`${start} through ${end}`;
  const summary=[];
  const sections=[];
  if(money){
    const overview=workspaceOverview('money',data,user,options);
    const comparison=buildWorkspaceReport('comparison',data,user,options);
    const saved=comparison.rows[3][1];
    const categories=buildWorkspaceReport('expenses',data,user,options).rows;
    const top=categories.find(([, ,value])=>Number.isFinite(value)&&value>0);
    summary.push(`Income ${format(overview.income)} · Expenses ${format(overview.expenses)} · Income less expenses ${format(overview.net)}.`);
    if(top)summary.push(`Largest spending category was ${top[0]} at ${format(top[2])}.`);
    if(!monthly){
      const win=saved>0?`You set aside ${format(saved)} from income.`:overview.hasActivity?'You have a record of where your money went.':'You had no income or expenses recorded this week.';
      const goal=top?`Set a spending limit for ${top[0]} before next Sunday.`:'Record each purchase this week so you can see where your money goes.';
      summary.push(`What went well: ${win}`,`One goal for next week: ${goal}`);
    }
    sections.push(...moneySections);
  }
  if(tasks){
    const overview=workspaceOverview('tasks',data,user,options);
    const notes=(data.inbox||[]).filter(note=>note.date>=start&&note.date<=end).length;
    summary.push(`Tasks completed: ${overview.completed}. Still open from the period: ${overview.open}. Inbox notes captured: ${notes}.`);
    sections.push(...taskSections);
  }
  const text=[`Hi ${data.settings?.name||'there'},`,title,range,...summary,'The full report is attached.','Yawmeh'].join('\n\n');
  const report=`<!doctype html><html lang="en"><meta charset="utf-8"><title>${escapeHTML(title)}</title><style>body{font:16px system-ui;color:#203b30;margin:24px}section{margin:32px 0;overflow:auto}table{border-collapse:collapse;width:100%}th,td{border:1px solid #d7e0da;text-align:left;padding:8px;white-space:pre-wrap}th{background:#edf4ef}</style><main><h1>${escapeHTML(title)}</h1><p>${escapeHTML(range)}</p>${summary.map(line=>`<p>${escapeHTML(line)}</p>`).join('')}${sections.map(id=>reportTable(id,data,user,options,catalog)).join('')}</main></html>`;
  return {
    key,from:{name:'Yawmeh',address:from.match(/<([^<>]+)>\s*$/)?.[1]||from.trim()},
    subject:`${title} · ${start} to ${end}`,text,
    html:`<div style="font:16px Arial,sans-serif;color:#203b30;max-width:600px;margin:auto;padding:24px"><img src="cid:${avatarCid}" alt="Yawmeh" width="48" height="48"><h1>${escapeHTML(title)}</h1>${text.split('\n\n').filter(line=>line!==title).map(line=>`<p>${escapeHTML(line)}</p>`).join('')}</div>`,
    attachments:[{filename:'yawmeh-avatar.png',path:avatar,cid:avatarCid},{filename:`yawmeh-${kind}-${end}.html`,content:report,contentType:'text/html; charset=utf-8'}],
  };
}
