export type ActionTask = { id: string; title: string; lifeItemId: string; day: string; minutes: number; priority: boolean; done: boolean; createdAt: string; sourceNoteId?: string; sourceBlockId?: string };
export type ActionBoard = { version: 1; tasks: ActionTask[]; weeks: Record<string, string> };
export const emptyActionBoard = (): ActionBoard => ({ version: 1, tasks: [], weeks: {} });
export function isDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number), date = new Date(y, m - 1, d);
  return y >= 1900 && y <= 2200 && date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}
export function validateBoard(board: ActionBoard) {
  if (board.version !== 1 || !Array.isArray(board.tasks) || !board.weeks || typeof board.weeks !== 'object') throw new Error('This daily plan could not be read.');
  for (const [week, intention] of Object.entries(board.weeks)) {
    if (!isDay(week) || typeof intention !== 'string') throw new Error('A weekly outcome needs a valid date and text.');
  }
  const ids = new Set<string>(), priorities = new Map<string, number>();
  for (const task of board.tasks) {
    if (!task.id || ids.has(task.id) || !task.title.trim() || typeof task.lifeItemId !== 'string' || typeof task.done !== 'boolean' || typeof task.priority !== 'boolean') throw new Error('Every action needs a unique ID and a title.');
    ids.add(task.id);
    if (task.day && !isDay(task.day)) throw new Error('Use a real date in YYYY-MM-DD format, or leave it unscheduled.');
    if (!Number.isInteger(task.minutes) || task.minutes < 0 || task.minutes > 1440) throw new Error('Estimate between 0 and 1,440 minutes. Use 0 for no estimate.');
    if (task.priority && !task.done && task.day) priorities.set(task.day, (priorities.get(task.day) ?? 0) + 1);
  }
  if ([...priorities.values()].some(count => count > 3)) throw new Error('Keep each day to three priorities. Unpin one before adding another.');
  return board;
}
export function dayTasks(tasks: ActionTask[], day: string) {
  return tasks.filter(task => task.day === day).sort((a, b) => Number(a.done) - Number(b.done) || Number(b.priority) - Number(a.priority) || a.createdAt.localeCompare(b.createdAt));
}
export function unfinishedBefore(tasks: ActionTask[], day: string) { return tasks.filter(task => !task.done && task.day && task.day < day).sort((a, b) => a.day.localeCompare(b.day)); }
export function estimateLabel(minutes: number) { return minutes >= 60 ? `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}` : `${minutes}m`; }
export function experienceStage(progress: number) { return progress >= 100 ? 'Done' : progress >= 75 ? 'Booked' : progress > 0 ? 'Planning' : 'Someday'; }
export function moveTask(task: ActionTask, day: string): ActionTask { return { ...task, day, priority: day === task.day ? task.priority : false }; }
