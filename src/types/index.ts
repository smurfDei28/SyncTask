export interface User { id: string; name: string; email: string; avatar?: string }
export interface Project { id: string; name: string; description: string; deadline: string; memberIds: string[] }
export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'completed';
export interface ChecklistItem { id: string; title: string; completed: boolean }
export interface Task {
 id: string; projectId: string; title: string; description: string; assignedTo: string;
 deadline: string; status: TaskStatus; dependsOnTaskId?: string; checklist: ChecklistItem[];
}
export type MemberRole = 'owner' | 'editor' | 'viewer';
export interface ProjectMember { name: string; role: MemberRole }
export interface SharedProject extends Project {
  ownerId: string;
  members: Record<string, ProjectMember>;
  taskIds: string[];
  revision: number;
  joinInviteId: string;
}
export interface Invitation {
  id: string; projectId: string; projectName: string;
  role: 'editor' | 'viewer'; expiresAt: number; acceptedBy: string;
}
