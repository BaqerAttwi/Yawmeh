import React from 'react';
import {Plus,ShoppingBag} from 'lucide-react';
import {cents} from '../../../../shared/domain.js';
import {formatMoney} from '../../../../shared/currency.js';
import {CardTitle} from '../../components/ui.jsx';
import './saved-items.css';

export function SavedItems({items,categories,busy,needsRefresh,onAdd,onLog,onAdjust}){
 const groups=new Map(categories.map(category=>[category,[]]));
 for(const item of items){
  const category=item.category||'Other';
  if(!groups.has(category))groups.set(category,[]);
  groups.get(category).push(item);
 }
 return <section className="card">
  <CardTitle title="Your everyday essentials" subtitle="Log a purchase at its saved price or adjust the details first."
   action={<button type="button" data-tour="add-item" className="primary" disabled={busy} onClick={()=>onAdd()}><Plus size={15}/>New item</button>}/>
  {[...groups].map(([category,rows])=><section key={category} aria-label={category} className="saved-item-category">
   <div className="saved-item-category-heading"><h3>{category}</h3>
    <button type="button" className="secondary" aria-label={`Add item to ${category}`} disabled={busy} onClick={()=>onAdd(category)}><Plus size={15} aria-hidden="true"/>Add item</button>
   </div>
   {rows.length>0&&<div className="tile-grid">{rows.map(item=><div className="item-tile" key={item.id}>
    <ShoppingBag size={23}/><h3>{item.title}</h3><h2>{formatMoney(cents(item.amount))} <small>USD</small></h2>
    <div className="button-row">
     <button type="button" className="primary" aria-label={'Log '+item.title} disabled={busy||needsRefresh} onClick={()=>onLog(item)}><Plus size={15}/>Log purchase</button>
     <button type="button" className="text-button" aria-label={'Adjust '+item.title+' purchase'} disabled={busy} onClick={()=>onAdjust(item)}>Adjust purchase</button>
    </div>
   </div>)}</div>}
  </section>)}
 </section>;
}
