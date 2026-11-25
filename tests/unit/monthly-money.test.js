import test from 'node:test';
import assert from 'node:assert/strict';
import {monthlyMoney} from '../../shared/monthly-money.js';

test('monthly money separates expenses, savings and full-month limits',()=>{
  const entries=[
    {date:'2024-01-25',type:'income',amount:100,saved:20,currency:'USD'},
    {date:'2024-01-26',type:'withdrawal',amount:10,currency:'USD'},
    {date:'2024-02-09',type:'expense',amount:900000,currency:'LBP',exchange_rate:90000},
    {date:'2024-02-12',type:'expense',amount:20,currency:'USD',voided_on:'2024-02-13'},
    {date:'2024-02-15',type:'expense',amount:15,currency:'USD'},
    {date:'2024-02-28',type:'expense',amount:100,currency:'USD'},
  ];
  const budgets=[
    {id:'latest',start:'2024-02-01',end:'2024-02-29',amount:40},
    {id:'previous',start:'2024-02-01',end:'2024-02-29',amount:50},
    {id:'partial',start:'2024-01-01',end:'2024-01-30',amount:35},
  ];
  const months=monthlyMoney({entries,budgets},'2024-02-20','2024-03-01');
  assert.equal(months[0].key,'2023-09');
  const [january,february]=months.slice(-2);
  assert.deepEqual([january.expenses,january.savings,january.limit],[0,2000,null]);
  assert.deepEqual([february.expenses,february.savings,february.limit],[2500,0,4000]);
  assert.equal(february.end,'2024-02-29');
  const unavailable=monthlyMoney({entries:[{date:'2024-02-01',type:'expense',amount:25,currency:'EUR'}],budgets:[]},'2024-02-20').at(-1);
  assert.ok(Number.isNaN(unavailable.expenses));
});
