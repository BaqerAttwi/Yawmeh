import React from 'react';
import {Leaf} from 'lucide-react';

export function Stat({icon:Icon,label,value,foot,color}){return <section className="stat-card"><div><span>{label}</span><span className={'stat-icon '+color}><Icon size={17}/></span></div><h2>{value}</h2><p>{foot}</p></section>;}
export function CardTitle({title,subtitle,action}){return <div className="card-heading"><div><h3>{title}</h3>{subtitle&&<p>{subtitle}</p>}</div>{action}</div>;}
export function Empty({text}){return <div className="empty"><Leaf size={24}/><p>{text}</p></div>;}
export function Donut({percent,center,label}){return <div className="donut" role="img" aria-label={`${center} ${label}`} style={{'--percent':Math.min(Math.max(percent,0),100)+'%','--ring':percent>100?'#cb7861':'#538b70'}}><div><strong>{center}</strong><small>{label}</small></div></div>;}
export function Field({label,...props}){return <label className="field"><span>{label}</span><input {...props}/></label>;}
