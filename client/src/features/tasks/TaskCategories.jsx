import {formText} from '../../../../shared/companion-form-language.js';
import React from 'react';
import {Tag} from 'lucide-react';
import {taskCategorySummary} from '../../../../shared/domain.js';

export function TaskCategoryField({categories,value='Personal',language='en'}){
  const t=text=>formText(text,language);
  return <><label className="field"><span>{t("Task category")}</span><input name="category" list="task-category-options" defaultValue={value} required maxLength={80} placeholder={t("Choose a category or type a new one")}/><datalist id="task-category-options">{categories.map(category=><option key={category} value={category}/>)}</datalist></label><p className="form-hint">{t("Choose a suggestion or type your own, such as Fitness or Side project.")}</p></>;
}

export function TaskCategoryBreakdown({tasks,subtitle}){
  const rows=taskCategorySummary(tasks);
  return <section className="card category-summary"><div className="card-heading"><div><h3>A closer look by category</h3><p>{subtitle}</p></div><Tag size={18}/></div>{rows.length?<><div className="category-summary-legend"><span><i/>Completed</span><span><i/>Remaining</span></div><div className="table-wrap"><table><thead><tr><th>Category</th><th>Total</th><th>Completed</th><th>Remaining</th><th>Progress</th></tr></thead><tbody>{rows.map(row=><tr key={row.category}><td><span className="category-summary-name">{row.category}</span></td><td>{row.total}</td><td className="positive">{row.completed}</td><td>{row.pending}</td><td><div className="category-progress"><div role="progressbar" aria-label={row.category+' tasks completed'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={row.percent}><span style={{width:row.percent+'%'}}/></div><small>{row.percent}%</small></div></td></tr>)}</tbody></table></div></>:<div className="empty"><Tag size={23}/><p>No tasks in this period. Add a categorized task to start your summary.</p></div>}<div className="card-footer">{tasks.length} tasks across {rows.length} {rows.length===1?'category':'categories'} · Grouped by task due date</div></section>;
}
