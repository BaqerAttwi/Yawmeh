import React,{useMemo,useState} from 'react';
import {CalendarDays,Plus} from 'lucide-react';
import {monthlyMoney} from '../../../../shared/monthly-money.js';
import {formatMoney} from '../../../../shared/currency.js';
import './monthly-money.css';

const shortMonth=new Intl.DateTimeFormat('en',{month:'short',timeZone:'UTC'});
const fullMonth=new Intl.DateTimeFormat('en',{month:'long',year:'numeric',timeZone:'UTC'});
const compactMoney=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:1});
const date=month=>new Date(month.start+'T00:00:00Z');
const metrics=[['expenses','Expenses'],['savings','Saved from income'],['limit','Monthly limit']];
const display=value=>value===null?'No limit':Number.isFinite(value)?formatMoney(value):'Unavailable';

export function MonthlyMoney({data,current,end,onSetLimit,onManage}){
  const months=useMemo(()=>monthlyMoney(data,current,end),[data.entries,data.budgets,current,end]);
  const [selected,setSelected]=useState(null);
  const month=months.find(item=>item.key===selected)||months.at(-1);
  const peak=Math.max(100,...months.flatMap(item=>metrics.map(([key])=>item[key]).filter(Number.isFinite)));
  const unit=10**Math.floor(Math.log10(peak));
  const ceiling=unit*[1,2,2.5,5,10].find(step=>step*unit>=peak);
  const height=value=>Number.isFinite(value)?`${value/ceiling*100}%`:'0%';
  const monthName=fullMonth.format(date(month));
  const remaining=month.limit===null?null:month.limit-month.expenses;
  return <section className="card monthly-money" aria-labelledby="monthly-money-title">
    <header className="monthly-money-header">
      <div><h2 id="monthly-money-title">Monthly money</h2><p>Expenses, savings and spending limits in USD</p></div>
      <div className="monthly-money-range"><CalendarDays size={17} aria-hidden="true"/>{shortMonth.format(date(months[0]))}–{shortMonth.format(date(months.at(-1)))}</div>
    </header>
    <ul className="monthly-money-key" aria-label="Chart legend">{metrics.map(([key,label])=><li key={key}><span className={key} aria-hidden="true"/>{label}</li>)}</ul>
    <div className="monthly-money-plot">
      <div className="monthly-money-axis" aria-hidden="true">{[1,.75,.5,.25,0].map(tick=><span key={tick}>{compactMoney.format(ceiling*tick/100)}</span>)}</div>
      <div className="monthly-money-columns" role="group" aria-label="Select a month">
        <div className="monthly-money-grid" aria-hidden="true">{[0,1,2,3,4].map(line=><span key={line}/>)}</div>
        {months.map(item=><button key={item.key} type="button" className="monthly-money-column" aria-pressed={item.key===month.key} onClick={()=>setSelected(item.key)} aria-label={`${fullMonth.format(date(item))}. Expenses ${display(item.expenses)}. Saved from income ${display(item.savings)}. Monthly limit ${display(item.limit)}.`}>
          <span className="monthly-money-bars" aria-hidden="true">
            <span className="expenses" style={{height:height(item.expenses)}}/>
            <span className="savings" style={{height:height(item.savings)}}/>
            {item.limit!==null&&<span className="limit" style={{bottom:height(item.limit)}}/>}
          </span>
          <span className="monthly-money-month">{shortMonth.format(date(item))}</span>
        </button>)}
      </div>
    </div>
    <div className="monthly-money-detail" aria-live="polite">
      <div className="monthly-money-detail-head">
        <div><h3>{monthName}</h3>{Number.isFinite(remaining)&&<p className={remaining<0?'monthly-money-over':''}>{formatMoney(Math.abs(remaining))} {remaining<0?'over the limit':'left to spend'}</p>}</div>
        {month.budget?<button type="button" className="secondary" onClick={onManage}>Manage budgets</button>:<button type="button" className="primary" onClick={()=>onSetLimit({title:monthName+' spending limit',start:month.start,end:month.end})}><Plus size={15}/>Set monthly limit</button>}
      </div>
      <dl>{metrics.map(([key,label])=><div key={key}><dt>{label}</dt><dd>{display(month[key])}</dd></div>)}</dl>
    </div>
    <p className="monthly-money-note">The chart groups records by calendar month. Each limit uses the latest budget for that full month. Converted amounts use saved transaction rates.</p>
  </section>;
}
