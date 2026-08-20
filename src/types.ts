// Tipos compartidos entre cliente y servidor. No importar Prisma acá:
// este archivo se usa desde Client Components.

export type RosterStudent = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  present: boolean;
  attendanceId: string | null;
  time: string | null;
};

export type ScheduleSummary = {
  id: string;
  name: string | null;
  startTime: string;
  endTime: string;
  days: number[];
};

export type RosterResponse = {
  schedule: ScheduleSummary | null;
  date: string;
  roster: RosterStudent[];
};

export type ScheduleListItem = {
  id: string;
  name: string | null;
  startTime: string;
  endTime: string;
  days: { id: string; scheduleId: string; dayOfWeek: number }[];
  _count: { students: number };
};

export type StudentListItem = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OrientadorListItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  students: StudentListItem[];
};
