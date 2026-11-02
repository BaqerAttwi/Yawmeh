export const APP_ACCESS = ['money', 'tasks', 'assistant'];
export const APP_LABELS = {money: 'Money', tasks: 'Tasks', assistant: 'AI assistant'};

export function hasAccess(user, app) {
  return !!user && (user.role === 'admin' || (user.permissions || []).includes(app));
}

export function visibleData(data, user) {
  return {
    ...data,
    entries: hasAccess(user, 'money') ? data.entries : [],
    items: hasAccess(user, 'money') ? data.items : [],
    budgets: hasAccess(user, 'money') ? data.budgets : [],
    subscriptions: hasAccess(user, 'money') ? data.subscriptions : [],
    tasks: hasAccess(user, 'tasks') ? data.tasks : [],
    cancelled_tasks: hasAccess(user,'tasks') ? data.cancelled_tasks||[] : [],
    day_plans: hasAccess(user,'tasks') ? data.day_plans||[] : [],
    inbox: hasAccess(user,'tasks') ? data.inbox||[] : [],
    subtasks: hasAccess(user,'tasks') ? data.subtasks||[] : [],
    goals: hasAccess(user,'money') ? data.goals||[] : [],
    goal_moves: hasAccess(user,'money') ? data.goal_moves||[] : [],
  };
}
