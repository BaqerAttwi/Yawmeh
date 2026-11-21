import React,{useMemo,useState} from 'react';
import {ChevronLeft,ChevronRight,Download,FileChartColumn,Sparkles} from 'lucide-react';
import {currencyCatalog,currencyLabel,formatMoney} from '../../../../shared/currency.js';
import {buildWorkspaceReport,reportPreset,reportsFor,validReportRange,workspaceReportCsv,workspaceOverview} from '../../../../shared/workspace-reports.js';
import {daysUntil} from '../../../../shared/domain.js';
import './reports.css';

const presets=[
 ['today','Today'],['week','Week to date'],['month','Month to date'],['last-month','Last month'],
 ['quarter','Quarter to date'],['year','Year to date'],['next-30','Next 30 days'],['custom','Custom dates'],
];
const areas=[['money','Money'],['tasks','Tasks']];
const convertedReports=['comparison','cash-flow','income','expenses','transactions'];
const pageSize=25;

function exportReport(report,name,start,end){
 const blob=new Blob(['\uFEFF',workspaceReportCsv(report)],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob);
 const link=document.createElement('a');
 link.href=url;
 link.download=`yawmeh-${name}-${start}-${end}.csv`;
 link.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function ReportTable({report,title,catalog}){
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
     return i===0?<th key={column.label} scope="row">{displayed}</th>:<td key={column.label} className={code?'report-number':undefined}>{displayed}</td>;
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

function ReportDetails({data,user,current,reports,initialRange,initialPreset}){
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
     <ReportTable key={[definition.id,start,end,currency].join('|')} report={report} title={definition.title} catalog={catalog}/>
    </>}
   </section>
 </div>;
}

function ReportHelp({api,area,start,end}){
 const [loading,setLoading]=useState(false);
 const [advice,setAdvice]=useState(null);
 const [error,setError]=useState('');
 async function getSummary(){
  setLoading(true);
  setError('');
  try{
   const result=await api('/companion/chat','POST',{question:'report',reportArea:area,language:'en',avatar:'sage',start,end});
   if(!result.summary||!result.recommendation)throw new Error('Could not read the AI summary. Try again.');
   setAdvice(result);
  }catch(error){setError(error.message);}
  finally{setLoading(false);}
 }
 return <section className="card report-help" aria-labelledby="report-help-title">
  <h2 id="report-help-title">Want help with this report?</h2>
  <p>Get a short summary and practical next steps. Google receives basic patterns from this report.</p>
  {!advice&&<button type="button" className="secondary" disabled={loading} onClick={getSummary}><Sparkles size={16} aria-hidden="true"/>{loading?'Summarizing…':'Get AI summary'}</button>}
  {error&&<p role="alert">{error}</p>}
  <div role="status">{advice&&<div className="report-help-answer">
   <h3>AI summary</h3><p>{advice.summary}</p>
   <h3>What to try next</h3><p>{advice.recommendation}</p>
  </div>}</div>
 </section>;
}

export function Reports({data,user,current,mode,api}){
 const reports=reportsFor(user);
 const choices=areas.filter(([id])=>reports.some(report=>report.area===id));
 const [selected,setSelected]=useState(choices[0]?.[0]);
 const [preset,setPreset]=useState('month');
 const [range,setRange]=useState(()=>reportPreset('month',current));
 const area=choices.some(([id])=>id===selected)?selected:choices[0]?.[0];
 if(!area)return null;
 const {start,end}=range;
 const catalog=currencyCatalog(data.settings);
 const currency=data.settings?.home_currency||'USD';
 const overview=workspaceOverview(area,data,user,{start,end,current,currency});
 const display=value=>formatMoney(value,currency,catalog);
 const metrics=overview&&(area==='money'
  ?[['Income',display(overview.income)],['Spent',display(overview.expenses)],['Income minus spending',display(overview.net)]]
  :[['Completed',overview.completed],['Still open',overview.open],['Overdue',overview.overdue]]);
 const summaryAvailable=mode==='live'&&overview?.hasActivity&&daysUntil(end,start)<=365;
 return <div className="reports-workspace">
  <section className="card report-overview" aria-labelledby="report-overview-title">
   <div className="report-overview-header">
    <div><h2 id="report-overview-title">{area==='money'?'Money at a glance':'Tasks at a glance'}</h2>
     {overview&&<p>{start===end?start:`${start} to ${end}`}</p>}
    </div>
    <label className="field"><span>Period</span><select aria-label="Overview period" value={preset} onChange={event=>{
     const period=event.target.value;
     setPreset(period);
     if(period!=='custom')setRange(reportPreset(period,current));
    }}>
     {[['week','This week'],['month','This month'],['last-month','Last month'],['custom','Custom dates']].map(([id,label])=><option key={id} value={id}>{label}</option>)}
    </select></label>
   </div>
   {choices.length>1&&<div className="segmented report-area" role="group" aria-label="Report area">
    {choices.map(([id,label])=><button type="button" key={id} aria-pressed={area===id} className={area===id?'selected':''} onClick={()=>setSelected(id)}>{label}</button>)}
   </div>}
   {preset==='custom'&&<div className="report-filters">
    <label className="field"><span>Start date</span><input type="date" value={start} max={end} onChange={event=>setRange({...range,start:event.target.value})}/></label>
    <label className="field"><span>End date</span><input type="date" value={end} min={start} onChange={event=>setRange({...range,end:event.target.value})}/></label>
   </div>}
   {overview?<><dl className="report-metrics">{metrics.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    {!overview.hasActivity&&<p className="report-note">No {area==='money'?'income or expenses':'task activity'} recorded for this period.</p>}
   </>:<p className="report-note" role="alert">Choose an ordered date range of up to 3,660 days.</p>}
  </section>
  {summaryAvailable&&<ReportHelp key={[area,start,end].join('|')} api={api} area={area} start={start} end={end}/>}
  <details className="card report-details">
   <summary>View detailed reports and export</summary>
   <ReportDetails key={[area,preset,start,end].join('|')} data={data} user={user} current={current}
    reports={reports.filter(report=>report.area===area)} initialRange={overview?range:reportPreset('month',current)} initialPreset={overview?preset:'month'}/>
  </details>
 </div>;
}
