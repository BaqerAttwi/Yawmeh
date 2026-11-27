import React from 'react';
import {RingChart} from './FinanceCharts.jsx';
import {Character} from '../features/assistant/Character.jsx';

export function Stat({icon:Icon,label,value,foot,color}){return <section className="stat-card"><div><span>{label}</span><span className={'stat-icon '+color}><Icon size={17}/></span></div><h2>{value}</h2><p>{foot}</p></section>;}
export function CardTitle({title,subtitle,action}){return <div className="card-heading"><div><h3>{title}</h3>{subtitle&&<p>{subtitle}</p>}</div>{action}</div>;}
export function Empty({text,children}){
 return <div className={children?'empty actionable-empty':'empty'}>
  {children&&<Character look="sage" className="empty-character"/>}
  <p>{text}</p>
  {children&&<div className="button-row">{children}</div>}
 </div>;
}
export function Donut({percent,center,label,tone='chart-1',accessibleLabel,value,total,format}){
 const progress=Math.min(Math.max(percent,0),100);
 return <div className="donut" role="img" aria-label={accessibleLabel||`${center} ${label}`}>
  <RingChart value={value??progress} total={total??100} name={label} color={`var(--${tone})`} format={format}/>
  <div className="donut-label"><strong>{center}</strong><small>{label}</small></div>
 </div>;
}
export function Field({label,...props}){return <label className="field"><span>{label}</span><input {...props}/></label>;}
