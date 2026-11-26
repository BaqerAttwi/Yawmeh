import React,{lazy,Suspense} from 'react';
import './finance-charts.css';

const PeriodView=lazy(()=>import('./RechartsViews.jsx').then(module=>({default:module.PeriodChart})));
const ValueView=lazy(()=>import('./RechartsViews.jsx').then(module=>({default:module.ValueChart})));
const RingView=lazy(()=>import('./RechartsViews.jsx').then(module=>({default:module.RingChart})));

export const periodAxisWidth=40;

export function PeriodChart(props){
 return <Suspense fallback={<div style={{height:props.height||210}}/>}>
  <PeriodView axisWidth={periodAxisWidth} {...props}/>
 </Suspense>;
}

export function ValueChart(props){
 return <Suspense fallback={<div style={{height:Math.max(100,props.data.length*28+28)}}/>}>
  <ValueView {...props}/>
 </Suspense>;
}

export function RingChart(props){
 return <Suspense fallback={<div className="finance-ring" aria-hidden="true"/>}><RingView {...props}/></Suspense>;
}
