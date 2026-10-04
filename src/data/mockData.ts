import { User, Project, Task } from '@/types';
export const members: User[] = [
 { id: 'u1', name: 'Ejay', email: 'ejay@student.edu' },
 { id: 'u2', name: 'Maria Santos', email: 'maria@student.edu' },
 { id: 'u3', name: 'Josh Reyes', email: 'josh@student.edu' },
 { id: 'u4', name: 'Ana Cruz', email: 'ana@student.edu' },
 { id: 'u5', name: 'Paolo Garcia', email: 'paolo@student.edu' },
];
export const currentUser = members[0];
export const projects: Project[] = [{
 id: 'p1', name: 'Mobile App Final Project',
 description: 'A shared workspace to help our student team plan, build, and deliver together.',
 deadline: '2026-10-30', memberIds: members.map(member => member.id),
}];
const titles = ['Define goals', 'Research user needs', 'Write user stories', 'Plan navigation',
 'Create wireframes', 'Choose colors', 'Design login', 'Design project cards', 'Set up Expo',
 'Configure TypeScript', 'Set up Router', 'Create user models', 'Create task models',
 'Prepare mock data', 'Build buttons', 'Build inputs', 'Build splash', 'Build login',
 'Database Setup', 'Connect Frontend', 'Testing', 'Build dashboard', 'Write documentation',
 'Prepare presentation', 'Final review'];
export const tasks: Task[] = titles.map((title, index) => ({
 id: 't' + (index + 1), projectId: 'p1', title, description: 'Complete and document: ' + title,
 assignedTo: members[index % members.length].id, deadline: '2026-10-30',
 status: index < 18 ? 'completed' : index === 19 || index === 20 ? 'blocked' : index === 18 || index === 21 || index === 22 ? 'in_progress' : 'todo',
 dependsOnTaskId: index === 19 ? 't19' : index === 20 ? 't20' : undefined,
 checklist: ['Plan', 'Implement', 'Review', 'Document'].map((title, itemIndex) => ({
  id: 't' + index + '-c' + itemIndex, title, completed: index < 18 || (index === 18 && itemIndex < 3),
 })),
}));
