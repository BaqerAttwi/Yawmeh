import React,{createContext,useContext} from 'react';
import {ResponsiveContainer,Tooltip} from 'recharts';

// Adapted from the shadcn/ui Chart component for Yawmeh's CSS tokens.
const emptyConfig={};
const ChartContext=createContext(emptyConfig);

export function ChartContainer({config=emptyConfig,containerRef,children,...props}){
 return <ChartContext.Provider value={config}>
  <div data-slot="chart" ref={containerRef} {...props}>
   <ResponsiveContainer width="100%" height="100%" minWidth={0}>{children}</ResponsiveContainer>
  </div>
 </ChartContext.Provider>;
}

export const ChartTooltip=Tooltip;

export function ChartTooltipContent({active,payload,label,format,formatLabel}){
 const config=useContext(ChartContext);
 if(!active||!payload?.length)return null;
 return <div className="finance-tooltip" data-slot="chart-tooltip" role="status" dir="auto">
  {label!==undefined&&<strong>{formatLabel?formatLabel(label):label}</strong>}
  {payload.map(item=>{
   const series=config[item.dataKey];
   const color=item.dataKey==='expenses'&&item.payload?.over?'var(--danger)':
    item.payload?.color||item.payload?.fill||series?.color||item.color;
   return <div className="finance-tooltip-row" key={item.dataKey||item.name}>
    <span className="finance-tooltip-label">
     <span className="finance-tooltip-indicator" data-indicator={series?.indicator||'dot'}
      style={{'--indicator-color':color}} aria-hidden="true"/>
     {series?.label||item.name}
    </span>
    <bdi>{format(item.payload?.amount??item.value)}</bdi>
   </div>;
  })}
 </div>;
}
