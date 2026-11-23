import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,Download,FileChartColumn,Plus} from 'lucide-react';
import {currencyCatalog,currencyLabel,formatMoney} from '../../../../shared/currency.js';
import {buildWorkspaceReport,reportPreset,reportsFor,validReportRange,workspaceReportCsv,workspaceOverview} from '../../../../shared/workspace-reports.js';
import {daysUntil} from '../../../../shared/domain.js';
import {companionRequestTimeoutMs} from '../../../../shared/companion-status.js';
import './reports.css';

const presets=[
 ['today','Today'],['week','Week to date'],['month','Month to date'],['last-month','Last month'],
 ['quarter','Quarter to date'],['year','Year to date'],['next-30','Next 30 days'],['custom','Custom dates'],
];
const overviewPresets=[['today','Today'],['week','This week'],['month','This month'],['last-month','Last month'],['year','This year'],['date','Specific date'],['custom','Custom dates']];
const areas=[['money','Money'],['tasks','Tasks']];
const convertedReports=['comparison','cash-flow','income','expenses','transactions'];
const pageSize=25;
const reportDates=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
const reportCounts=new Intl.NumberFormat('en-US');
const reportPercent=new Intl.NumberFormat('en-US',{style:'percent',maximumFractionDigits:1});

function exportReport(report,name,start,end){
 const blob=new Blob(['\uFEFF',workspaceReportCsv(report)],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob);
 const link=document.createElement('a');
 link.href=url;
 link.download=`yawmeh-${name}-${start}-${end}.csv`;
 link.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function ReportTable({report,title,catalog,onAddItem,busy}){
 const [page,setPage]=useState(0);
 const count=report.rows.length,lastPage=Math.max(0,Math.ceil(count/pageSize)-1);
 const currentPage=Math.min(page,lastPage),offset=currentPage*pageSize;
 if(!count)return <div className="report-empty"><FileChartColumn size={23} aria-hidden="true"/><p>No records match this report.</p></div>;
 return <>
  <div className="report-table-wrap" role="region" aria-label={title+' table'} tabIndex={0}>
   <table className="report-table">
    <thead><tr>{report.columns.map(column=><th key={column.label} scope="col" className={column.currency||column.native?'report-number':undefined}>
     {column.label}{column.currency&&<small>{column.currency}</small>}
    </th>)}</tr></thead>
    <tbody>{report.rows.slice(offset,offset+pageSize).map((row,index)=><tr key={offset+index}>{row.map((value,i)=>{
     const column=report.columns[i],code=column.currency||(column.native?row[column.native===true?0:column.native]:null);
     const displayed=value==null?'—':code?formatMoney(value,code,catalog):value;
     return i===0?<th key={column.label} scope="row">{onAddItem?<div className="report-category-action"><span>{displayed}</span>
      <button type="button" className="secondary" disabled={busy} aria-label={`Add item to ${value}`} onClick={()=>onAddItem(value)}><Plus size={14} aria-hidden="true"/>Add item</button>
     </div>:displayed}</th>:<td key={column.label} className={code?'report-number':undefined}>{displayed}</td>;
    })}</tr>)}</tbody>
   </table>
  </div>
  <div className="report-pagination">
   <span aria-live="polite">{offset+1}–{Math.min(offset+pageSize,count)} of {count} rows</span>
   {lastPage>0&&<div><button type="button" className="secondary" disabled={currentPage===0} onClick={()=>setPage(currentPage-1)} aria-label="Previous report page"><ChevronLeft size={17}/></button>
    <button type="button" className="secondary" disabled={currentPage===lastPage} onClick={()=>setPage(currentPage+1)} aria-label="Next report page"><ChevronRight size={17}/></button></div>}
  </div>
 </>;
}

function CashFlowChart({report,currency,catalog}){
 const rows=report.rows.slice(-12).filter(([,income,expenses])=>Number.isFinite(income)&&Number.isFinite(expenses));
 const max=Math.max(0,...rows.flatMap(([,income,expenses])=>[income,expenses]));
 if(!max)return null;
 return <figure className="report-chart">
  <figcaption>Income and expenses · Latest 12 recorded months</figcaption>
  <div className="report-chart-key"><span>Income</span><span>Expenses</span></div>
  <div className="report-chart-months">{rows.map(([month,income,expenses])=><div key={month} className="report-chart-row">
   <span>{month}</span>
   <div>{[[income,'Income'],[expenses,'Expenses']].map(([value,label])=><div key={label}
    role="img" aria-label={label+' '+formatMoney(value,currency,catalog)} title={label+' '+formatMoney(value,currency,catalog)}>
    <span style={{width:(value/max*100)+'%'}}/>
   </div>)}</div>
  </div>)}</div>
 </figure>;
}

function ReportDetails({data,user,current,reports,initialRange,initialPreset,onAddItem,busy}){
 const [selected,setSelected]=useState(reports[0]?.id);
 const [preset,setPreset]=useState(initialPreset);
 const [range,setRange]=useState(initialRange);
 const [preferredCurrency,setCurrency]=useState(data.settings?.home_currency||'USD');
 const definition=reports.find(report=>report.id===selected)||reports[0];
 const allDates=definition?.id==='subscriptions'||definition?.id==='items';
 const catalog=useMemo(()=>currencyCatalog(data.settings),[data.settings]);
 const currency=catalog.some(item=>item.code===preferredCurrency)?preferredCurrency:'USD';
 const {start,end}=allDates?{start:current,end:current}:range;
 const goodRange=validReportRange(start,end);
 const report=useMemo(()=>definition&&goodRange?buildWorkspaceReport(definition.id,data,user,{start,end,current,currency}):null,
  [definition,goodRange,data,user,start,end,current,currency]);
 if(!definition)return null;
 function changePreset(value){
  setPreset(value);
  if(value!=='custom')setRange(reportPreset(value,current));
 }
 function changeDate(field,value){
  setPreset('custom');
  setRange(old=>({...old,[field]:value}));
 }
 function chooseReport(id){
  setSelected(id);
  if(id==='renewals'&&range.end<=current)changePreset('next-30');
 }
 return <div className="report-detail-body">
   <label className="field"><span>Detailed report</span><select aria-label="Detailed report" value={definition.id} onChange={event=>chooseReport(event.target.value)}>
    {reports.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}
   </select></label>
   <section className="card report-card" aria-labelledby="report-title">
    <header className="report-heading">
     <div><h2 id="report-title">{definition.title}</h2><p>{definition.description}</p></div>
     <button type="button" className="secondary" disabled={!report?.rows.length}
      onClick={()=>exportReport(report,definition.id,allDates?'all':start,allDates?'dates':end)}><Download size={16}/>Export CSV</button>
    </header>
    {!allDates&&<div className="report-filters">
     <label className="field"><span>Period</span><select aria-label="Period" value={preset} onChange={event=>changePreset(event.target.value)}>
      {presets.map(([id,label])=><option value={id} key={id}>{label}</option>)}
     </select></label>
     <label className="field"><span>Start date</span><input type="date" value={start} max={end} onChange={event=>changeDate('start',event.target.value)}/></label>
     <label className="field"><span>End date</span><input type="date" value={end} min={start} onChange={event=>changeDate('end',event.target.value)}/></label>
     {convertedReports.includes(definition.id)&&<label className="field"><span>Report currency</span><select aria-label="Report currency" value={currency} onChange={event=>setCurrency(event.target.value)}>
      {catalog.map(item=><option key={item.code} value={item.code}>{currencyLabel(item)}</option>)}
     </select></label>}
    </div>}
    {!report?<p className="report-note" role="alert">Choose an ordered date range of up to 3,660 days.</p>:<>
     {report.note&&<p className="report-note">{report.note}</p>}
     {definition.id==='cash-flow'&&<CashFlowChart report={report} currency={currency} catalog={catalog}/>}
     <ReportTable key={[definition.id,start,end,currency].join('|')} report={report} title={definition.title} catalog={catalog}
      onAddItem={definition.id==='expenses'?onAddItem:undefined} busy={busy}/>
    </>}
   </section>
 </div>;
}

function summarizeReport(area,overview,display,topCategory){
 if(area==='tasks')return {
  summary:`Completed in this period: ${reportCounts.format(overview.completed)}. Still open and due in this period: ${reportCounts.format(overview.open)}, including ${reportCounts.format(overview.overdue)} overdue.`,
  recommendation:overview.overdue?'Review one overdue task and decide whether to finish it or move it to a realistic date.':overview.open?'Pick one open task to tackle next and give it a realistic time estimate.':'Review what helped you finish your tasks and repeat it in your next plan.',
 };
 const {expenses,net}=overview;
 const difference=!Number.isFinite(net)?'A missing saved exchange rate keeps the app from calculating the difference.':net>0?`Income was ${display(net)} higher than spending.`:net<0?`Spending was ${display(-net)} higher than income.`:'Income and spending were equal.';
 const largest=topCategory?` ${topCategory[0]} was your largest spending category at ${display(topCategory[2])} (${reportPercent.format(topCategory[2]/expenses)} of spending).`:'';
 return {summary:difference+largest,recommendation:topCategory?`Review your ${topCategory[0]} purchases and pick one optional cost to reduce next period.`:
  !Number.isFinite(net)?'Check the original amounts in Balances by currency before setting a spending target.':'Keep recording expenses as they happen so your next report shows where your money went.'};
}

function ReportReviewChart({title,series,display,scale}){
 const max=scale||Math.max(1,...series.filter(([,value])=>Number.isFinite(value)).map(([,value])=>value));
 return <figure className="report-chart report-review-chart" aria-label={`${title} chart`}>
  <figcaption>{title}</figcaption>
  <dl>{series.map(([label,value,tone])=><div key={label}>
   <div className="report-review-value"><dt>{label}</dt><dd>{display(value)}</dd></div>
   {Number.isFinite(value)&&<div className="report-review-track" aria-hidden="true"><span data-tone={tone} style={{width:(value/max*100)+'%'}}/></div>}
  </div>)}</dl>
 </figure>;
}

function ReportExplanation({api,area,start,end,period}){
 const [answer,setAnswer]=useState(null),[pending,setPending]=useState(false),[error,setError]=useState('');
 const active=useRef(null);
 useEffect(()=>()=>active.current?.abort(),[]);

 async function explain(){
  if(active.current)return;
  const controller=new AbortController();
  active.current=controller;
  setPending(true);
  setError('');
  try{
   const result=await api('/companion/chat','POST',{question:'report',reportArea:area,reportFormat:'analysis',language:'en',avatar:'sage',start,end},
    {timeoutMs:companionRequestTimeoutMs,signal:controller.signal});
   if(!result.steps?.length||!result.recommendation)throw new Error('AI returned an incomplete explanation. You can try again.');
   if(!controller.signal.aborted)setAnswer(result);
  }catch(error){
   if(!controller.signal.aborted)setError(error.code==='provider_busy'?'Gemini is temporarily busy. You can try again shortly.':
    ['timeout','request_timeout'].includes(error.code)?'AI took too long to reply. You can try again.':error.message);
  }finally{
   if(!controller.signal.aborted){active.current=null;setPending(false);}
  }
 }

 return <section className="report-ai" aria-label="AI report explanation">
  <p id="report-ai-data">{area==='money'?'Gemini reviews selected dates, totals, purchase names, categories, and prices.':'Gemini reviews selected dates, task counts, categories, and time estimates.'}</p>
  <button type="button" className="secondary" aria-describedby="report-ai-data" disabled={pending} onClick={explain}>
   {answer?'Explain again':'Explain with AI'}
  </button>
  {pending&&<p role="status">Reviewing your records…</p>}
  {error&&<p role="alert">{error}</p>}
  {answer&&<div className="report-ai-answer" aria-live="polite">
   <h3>AI step-by-step explanation</h3>
   <p>{period}</p>
   <ol className="report-review-steps">{answer.steps.map(step=><li key={step.evidenceId}>
    <strong>{step.title}</strong><p>{step.evidence}</p><p>{step.explanation}</p>
   </li>)}</ol>
   <div className="report-next-step"><h3>What to try next</h3><p>{answer.recommendation}</p></div>
  </div>}
 </section>;
}

function ReportSummary({area,overview,display,expenseCategories,children}){
 const {summary,recommendation}=summarizeReport(area,overview,display,expenseCategories[0]);
 const money=area==='money';
 const series=money
  ?[['Income',overview.income,'green'],['Spending',overview.expenses,'orange']]
  :[['Completed',overview.completed,'green'],['Open and on schedule',overview.open-overview.overdue,'blue'],['Overdue',overview.overdue,'orange']];
 return <div className="report-summary">
  <p className="report-summary-facts">{summary}</p>
  <ReportReviewChart title={money?'Income and spending':'Task status'} series={series} display={money?display:reportCounts.format}/>
  <details className="report-breakdown">
   <summary>Step-by-step review</summary>
   <div className="report-breakdown-body">
    <ol className="report-review-steps">{money?<>
     <li><strong>Add recorded income and expenses separately.</strong> The totals use transactions in the selected dates through today. Currency conversions use the rates saved with each transaction.</li>
     <li><strong>Subtract spending from income.</strong> This shows the difference for the period. Savings transfers are excluded.</li>
    </>:<>
     <li><strong>Count completions by finish date.</strong> A task counts if you finished it during the selected period.</li>
     <li><strong>Count open tasks by due date.</strong> A task counts as overdue if it is still open and its due date has passed.</li>
    </>}</ol>
    {expenseCategories.length>0&&<ReportReviewChart title="Largest spending categories" scale={overview.expenses}
     series={expenseCategories.map(([name,,total])=>[name,total,'orange'])}
     display={total=>`${display(total)} · ${reportPercent.format(total/overview.expenses)}`}/>}
    <div className="report-next-step"><h3>How to improve</h3><p>{recommendation}</p></div>
   </div>
  </details>
  {children}
 </div>;
}

export function Reports({data,user,current,reportAPI,onAddItem,busy}){
 const reports=reportsFor(user);
 const choices=areas.filter(([id])=>reports.some(report=>report.area===id));
 const [selected,setSelected]=useState(choices[0]?.[0]);
 const [preset,setPreset]=useState('month');
 const [range,setRange]=useState(()=>reportPreset('month',current));
 const [detailsOpened,setDetailsOpened]=useState(false);
 const area=choices.some(([id])=>id===selected)?selected:choices[0]?.[0];
 if(!area)return null;
 const selectedRange=preset==='custom'||preset==='date'?range:reportPreset(preset,current);
 const {start,end}=selectedRange;
 const catalog=currencyCatalog(data.settings);
 const currency=data.settings?.home_currency||'USD';
 const overview=workspaceOverview(area,data,user,{start,end,current,currency});
 const period=overview?reportDates.formatRange(new Date(start),new Date(end)):'';
 const expenseCategories=area==='money'&&Number.isFinite(overview?.expenses)&&overview.expenses>0
  ?buildWorkspaceReport('expenses',data,user,{start,end,current,currency}).rows.filter(([, ,total])=>total>0).slice(0,5):[];
 const display=value=>formatMoney(value,currency,catalog);
 const metrics=overview&&(area==='money'
  ?[['Income',display(overview.income)],['Spent',display(overview.expenses)],['Income minus spending',display(overview.net)]]
  :[['Completed',reportCounts.format(overview.completed)],['Still open',reportCounts.format(overview.open)],['Overdue',reportCounts.format(overview.overdue)]]);
 return <div className="reports-workspace">
  <section className="card report-overview" aria-labelledby="report-overview-title">
   <div className="report-overview-header">
    <div><h2 id="report-overview-title">{area==='money'?'Money at a glance':'Tasks at a glance'}</h2>
     {overview&&<p>{period}</p>}
    </div>
    <label className="field"><span>Period</span><select aria-label="Overview period" value={preset} onChange={event=>{
     const next=event.target.value;
     setPreset(next);
     if(next==='date')setRange(reportPreset('today',current));
     if(next==='custom'&&overview)setRange(selectedRange);
    }}>
     {overviewPresets.map(([id,label])=><option key={id} value={id}>{label}</option>)}
    </select></label>
   </div>
   {choices.length>1&&<div className="segmented report-area" role="group" aria-label="Report area">
    {choices.map(([id,label])=><button type="button" key={id} aria-pressed={area===id} className={area===id?'selected':''} onClick={()=>setSelected(id)}>{label}</button>)}
   </div>}
   {preset==='date'&&<div className="report-filters">
    <label className="field"><span>Report date</span><input type="date" value={start} onChange={event=>setRange({start:event.target.value,end:event.target.value})}/></label>
   </div>}
   {preset==='custom'&&<div className="report-filters">
    <label className="field"><span>Start date</span><input type="date" value={start} max={end} onChange={event=>setRange({...range,start:event.target.value})}/></label>
    <label className="field"><span>End date</span><input type="date" value={end} min={start} onChange={event=>setRange({...range,end:event.target.value})}/></label>
   </div>}
   {overview?<><dl className="report-metrics">{metrics.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    {overview.hasActivity?<ReportSummary key={area} area={area} overview={overview} display={display} expenseCategories={expenseCategories}>
      {reportAPI&&daysUntil(end,start)<=365&&<ReportExplanation key={[start,end].join('|')} api={reportAPI} area={area} start={start} end={end} period={period}/>}
     </ReportSummary>
     :<p className="report-note">No {area==='money'?'income or expenses':'task activity'} recorded for this period.</p>}
   </>:<p className="report-note" role="alert">Choose an ordered date range of up to 3,660 days.</p>}
  </section>
  <details className="card report-details" onToggle={event=>{if(event.currentTarget.open)setDetailsOpened(true);}}>
   <summary>View detailed reports and export</summary>
   {detailsOpened&&<ReportDetails key={[area,preset,start,end].join('|')} data={data} user={user} current={current}
    reports={reports.filter(report=>report.area===area)} initialRange={overview?selectedRange:reportPreset('month',current)}
    initialPreset={overview?(preset==='date'?'custom':preset):'month'}
    onAddItem={onAddItem} busy={busy}/>}
  </details>
 </div>;
}
