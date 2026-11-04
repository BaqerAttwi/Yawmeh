import {hasAccess} from './access.js';

export function gettingStartedSteps(user) {
 const steps=[{id:'settings',page:'settings',title:'Make this space yours',instruction:'Click Settings in the sidebar.',explanation:'Check your name and reminder email. If you track money, review your currencies and exchange rates before adding transactions.'}];
 if(hasAccess(user,'tasks'))steps.push({id:'tasks',page:'tasks',title:'Start with one small task',instruction:'Click Tasks in the sidebar.',explanation:'Choose Add task, give it a clear name, and pick a due date. Start with one thing you can finish today. Time, reminders and repeat schedules are optional.'});
 if(hasAccess(user,'money'))steps.push({id:'money',page:'money',title:'Give your money a starting point',instruction:'Click Money in the sidebar.',explanation:'Record income and choose how much goes to savings. Then record purchases as expenses. Use Savings → Add existing savings for money you already saved. Check the currency and date each time.'});
 steps.push({id:'overview',page:'overview',title:'Come back here each day',instruction:'Click Overview in the sidebar.',explanation:'Today brings your next steps together. Choose a small priority, check what is due, and return to your plan as the day changes. Your companion is here whenever you need help.'});
 return steps;
}
