import {today} from '../../../../shared/domain.js';
export function demoData(){
 const current=today(),month=current.slice(0,7),shift=n=>{const d=new Date(current+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
 return {settings:{name:'Alex',email:''},entries:[
 {id:1,type:'opening',title:'My existing savings',amount:2400,saved:0,date:month+'-01',category:'Savings',note:'Starting savings balance'},
 {id:2,type:'income',title:'Monthly salary',amount:1700,saved:700,date:month+'-01',category:'Work',note:''},
 {id:3,type:'income',title:'Website freelance project',amount:450,saved:150,date:month+'-01',category:'Freelance',note:''},
 {id:4,type:'expense',title:'Weekly groceries',amount:64.5,saved:0,date:current,category:'Groceries',note:'Fruit, vegetables and pantry essentials'},
 {id:5,type:'expense',title:'Morning coffee',amount:4.5,saved:0,date:current,category:'Food & drinks',note:''},
 {id:6,type:'expense',title:'Gym membership',amount:35,saved:0,date:current,category:'Health',note:''},
 {id:7,type:'expense',title:'New headphones',amount:89,saved:0,date:current,category:'Shopping',note:'One-time purchase for work'},
 {id:8,type:'expense',title:'Lunch with friends',amount:22,saved:0,date:current,category:'Food & drinks',note:''}],
 items:[{id:1,title:'Morning coffee',amount:4.5,category:'Food & drinks'},{id:2,title:'Lunch',amount:12,category:'Food & drinks'},{id:3,title:'Groceries',amount:40,category:'Groceries'},{id:4,title:'Transport',amount:5,category:'Transport'}],
 budgets:[{id:1,title:'Monthly spending',amount:700,start:month+'-01',end:new Date(Number(current.slice(0,4)),Number(current.slice(5,7)),0,12).toLocaleDateString('en-CA')}],
 subscriptions:[{id:1,title:'ChatGPT Plus',amount:20,cycle:'monthly',renewal:shift(3),category:'Learning',active:1},{id:2,title:'Gym membership',amount:35,cycle:'monthly',renewal:shift(6),category:'Health',active:1},{id:3,title:'Spotify',amount:10.99,cycle:'monthly',renewal:shift(12),category:'Entertainment',active:1}],
 tasks:[{id:1,title:'Finish the portfolio homepage',category:'Work',due:current,priority:'high',note:'Focus on the hero section and project cards.',reminder:null,completed:0},{id:2,title:'Go for a 30-minute walk',category:'Health',due:current,priority:'low',note:'',reminder:null,completed:0},{id:3,title:'Review this week’s spending',category:'Finance',due:current,priority:'medium',note:'',reminder:null,completed:0},{id:4,title:'Read 10 pages',category:'Learning',due:current,priority:'low',note:'',reminder:null,completed:1},{id:5,title:'Plan meals for the week',category:'Home',due:current,priority:'medium',note:'',reminder:null,completed:1}],connections:{email:false,ai:false}};
}
