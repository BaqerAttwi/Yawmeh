import React,{useLayoutEffect,useRef,useState,useSyncExternalStore} from 'react';
import {Bar,CartesianGrid,ComposedChart,Line,Pie,PieChart,Rectangle,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';

const grid='var(--border)';
const tick={fill:'var(--text-muted)',fontSize:11};
const compact=new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1});
export const moneyAxis=value=>compact.format(value/100);
const media=()=>window.matchMedia('(prefers-reduced-motion: reduce)');
function subscribeMotion(update){
 const query=media();
 query.addEventListener('change',update);
 return()=>query.removeEventListener('change',update);
}
function useChart(){
 const ref=useRef(null),[rtl,setRtl]=useState(false);
 const reduced=useSyncExternalStore(subscribeMotion,()=>media().matches,()=>true);
 useLayoutEffect(()=>{
  const element=ref.current;
  const update=()=>setRtl(getComputedStyle(element).direction==='rtl');
  update();
  const observer=new MutationObserver(update);
  for(let node=element;node;node=node.parentElement)observer.observe(node,{attributes:true,attributeFilter:['dir']});
  return()=>observer.disconnect();
 },[]);
 return {ref,rtl,motion:{isAnimationActive:!reduced,animationDuration:480,animationEasing:'ease-out'}};
}

function ChartTooltip({active,payload,label,format,formatLabel}){
 if(!active||!payload?.length)return null;
 return <div className="finance-tooltip" role="status">
  {label!==undefined&&<strong>{formatLabel?formatLabel(label):label}</strong>}
  {payload.map(item=><div key={item.dataKey||item.name}><span>{item.name}</span><bdi>{format(item.payload?.amount??item.value)}</bdi></div>)}
 </div>;
}

function LimitMark({cx,cy,value}){
 if(!Number.isFinite(value)||!Number.isFinite(cx)||!Number.isFinite(cy))return null;
 return <line x1={cx-12} x2={cx+12} y1={cy} y2={cy} stroke="var(--budget-limit)" strokeWidth={2} strokeDasharray="4 3"/>;
}

export function PeriodChart({data,series,format,axis=moneyAxis,periodLabel,tooltipLabel,limitLabel,onSelect,externalLabels=false,label,height=210,domain,axisWidth=40}){
 const {ref,rtl,motion}=useChart();
 return <div ref={ref} className="finance-chart" style={{height}} role="group" aria-label={label} data-rtl={rtl}>
  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
   <ComposedChart data={data} margin={{top:10,right:0,left:0,bottom:3}} barGap={3} maxBarSize={22} onClick={onSelect?state=>{if(state?.activeLabel!==undefined)onSelect(state.activeLabel);}:undefined}>
    <CartesianGrid vertical={false} stroke={grid}/>
    <XAxis dataKey="key" reversed={rtl} tick={externalLabels?false:tick} height={externalLabels?0:25} tickLine={false} axisLine={false} tickFormatter={periodLabel} interval={externalLabels?0:'preserveStartEnd'}/>
    <YAxis orientation={rtl?'right':'left'} width={axisWidth} domain={domain||[0,'auto']} allowDecimals tick={tick} tickLine={false} axisLine={false} tickFormatter={axis}/>
    <Tooltip content={<ChartTooltip format={format} formatLabel={tooltipLabel||periodLabel}/>} cursor={{fill:'var(--surface-2)',fillOpacity:.6}} isAnimationActive={false} reverseDirection={{x:rtl,y:false}}/>
    {series.map(({key,name,color})=><Bar key={key} dataKey={key} name={name} fill={color}
      shape={key==='expenses'?props=><Rectangle {...props} fill={props.payload.over?'var(--danger)':color} radius={[3,3,0,0]}/>:undefined}
      radius={[3,3,0,0]} {...motion}/>)}
    {limitLabel&&<Line dataKey="limit" name={limitLabel} stroke="none" dot={<LimitMark/>} activeDot={false} isAnimationActive={false}/>}
   </ComposedChart>
  </ResponsiveContainer>
 </div>;
}

export function ValueChart({data,format,axis=moneyAxis,label,scale}){
 const {ref,rtl,motion}=useChart();
 const rows=data.filter(item=>Number.isFinite(item.value));
 const values=rows.map(item=>item.value);
 const maximum=Math.max(1,scale||0,...values);
 const minimum=Math.min(0,...values);
 return <div ref={ref} className="finance-chart finance-comparison" style={{height:rows.length?Math.max(100,rows.length*28+28):undefined}} role="group" aria-label={label} data-rtl={rtl}>
  {rows.length?<ResponsiveContainer width="100%" height="100%" minWidth={0}>
   <ComposedChart data={rows} layout="vertical" margin={{top:3,right:10,left:10,bottom:0}} maxBarSize={12}>
    <CartesianGrid horizontal={false} stroke={grid}/>
    <XAxis type="number" reversed={rtl} domain={[minimum,maximum]} tick={tick} tickLine={false} axisLine={false} tickFormatter={axis}/>
    <YAxis type="category" dataKey="name" orientation={rtl?'right':'left'} width={100} tick={tick} tickLine={false} axisLine={false}
     tickFormatter={value=>value.length>14?value.slice(0,13)+'…':value}/>
    <Tooltip content={<ChartTooltip format={format}/>} cursor={{fill:'var(--surface-2)',fillOpacity:.6}} isAnimationActive={false} reverseDirection={{x:rtl,y:false}}/>
    <Bar dataKey="value" name={label} shape={props=><Rectangle {...props} fill={props.payload.color} radius={rtl?[3,0,0,3]:[0,3,3,0]}/>} {...motion}/>
   </ComposedChart>
  </ResponsiveContainer>:<p className="muted">No values available to chart.</p>}
 </div>;
}

export function RingChart({value,total,name,color,format}){
 const {ref,rtl,motion}=useChart();
 const displayed=Math.min(Math.max(value,0),total);
 const slices=total>0
  ?[{name,value:displayed,amount:value,fill:color},{name:'Remaining',value:total-displayed,fill:'var(--surface-2)'}]
  :[{name:'Remaining',value:1,fill:'var(--surface-2)'}];
 return <div className="finance-ring" ref={ref}>
  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
   <PieChart>
    <Pie data={slices}
     dataKey="value" stroke="none" innerRadius="78%" outerRadius="94%" startAngle={90} endAngle={rtl?450:-270} {...motion}/>
    {total>0&&<Tooltip content={<ChartTooltip format={format}/>} isAnimationActive={false}/>}
   </PieChart>
  </ResponsiveContainer>
 </div>;
}
