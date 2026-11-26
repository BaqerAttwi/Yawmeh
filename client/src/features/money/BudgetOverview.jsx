import React from 'react';
import {cents,periodSummary} from '../../../../shared/domain.js';
import {formatMoney} from '../../../../shared/currency.js';
import {CardTitle} from '../../components/ui.jsx';

export function BudgetOverview({data,start,end,onManage}){
  const budgets=data.budgets.filter(budget=>budget.start<=end&&budget.end>=start);
  return <section className="card budget-overview" aria-label="Budget overview">
    <CardTitle title="Budgets" subtitle="Budgets that overlap the selected dates" action={<button className="secondary" onClick={onManage}>Manage</button>}/>
    <div className="budget-overview-list">
      {budgets.length===0&&<p>No budgets for these dates.</p>}
      {budgets.map(budget=>{
        const limit=cents(budget.amount);
        const spent=periodSummary(data,budget.start,budget.end).spent;
        const ratio=limit>0?spent/limit:0;
        const known=Number.isFinite(ratio);
        return <div className="budget-overview-row" key={budget.id}>
          <div><span>{budget.title}</span><span>{formatMoney(spent)} / {formatMoney(limit)}</span></div>
          {known&&<div className="progress-track" role="img" aria-label={Math.round(ratio*100)+'% of budget used'}><div className={ratio>1?'over':ratio>=.8?'near':undefined} style={{width:Math.min(100,ratio*100)+'%'}}/></div>}
        </div>;
      })}
    </div>
  </section>;
}
