import React from 'react';
import {CreationGuide} from './CreationGuide.jsx';

export function DemoGuides({can}){
 return <section className="card demo-guides" aria-label="Video tutorials"><h2>Learn with short videos</h2><p>Real demo walkthroughs with English and Arabic captions. Watch, pause, then try it yourself.</p>{can('tasks')&&<div><h3>Create a task</h3><CreationGuide kind="task"/></div>}{can('money')&&<div><h3>Income, savings and expenses</h3><CreationGuide kind="money"/></div>}</section>;
}
