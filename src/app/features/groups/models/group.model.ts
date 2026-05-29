export type GroupDay =
  | 'Lundi'
  | 'Mardi'
  | 'Mercredi'
  | 'Jeudi'
  | 'Vendredi'
  | 'Samedi';

export interface GroupSchedule {
  day: GroupDay;
  startTime: string;
  endTime: string;
}

export interface Group {
  id: number;
  name: string;
  subjectId: number;
  schoolLevelId: number;
  teacherId: number;
  room: string;
  maxStudents: number;
  studentIds: number[];
  schedules: GroupSchedule[];
  createdAt: string;
}

export type CreateGroupPayload = Omit<Group, 'id'>;
export type UpdateGroupPayload = Partial<CreateGroupPayload>;
