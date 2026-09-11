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
  requiresLocation: boolean;
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
  formacion: string | null;
  graduacion: string | null;
  evaluationDate: string | null;
  dni: string | null;
  birthDate: string | null;
  orientador: { id: string; firstName: string; lastName: string } | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminListItem = {
  id: string;
  username: string;
  displayName: string;
  slug: string;
  role: "ADMIN" | "SUPER_ADMIN";
  active: boolean;
  approved: boolean;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: string;
};

export type SchoolListItem = {
  id: string;
  displayName: string;
  slug: string;
};

export type ItineranciaCategory = "EVALUACION" | "SEMINARIO" | "CURSO" | "OTRO";

export type ItineranciaActivityListItem = {
  id: string;
  title: string;
  description: string | null;
  category: ItineranciaCategory;
  date: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
  _count: { studentRegistrations: number };
};

export type ItineranciaPerson = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
};

export type ItineranciaPublicActivity = {
  id: string;
  title: string;
  description: string | null;
  category: ItineranciaCategory;
  date: string;
  startTime: string;
  endTime: string;
  registeredStudentIds: string[];
};

export type ItineranciaPublicResponse = {
  activities: ItineranciaPublicActivity[];
  students: ItineranciaPerson[];
};

export type ItineranciaAttendanceStudent = ItineranciaPerson & {
  attended: boolean;
};

export type ItineranciaAttendanceActivity = {
  id: string;
  title: string;
  category: ItineranciaCategory;
  date: string;
  startTime: string;
  endTime: string;
  students: ItineranciaAttendanceStudent[];
};

export type ItineranciaAttendanceResponse = {
  activities: ItineranciaAttendanceActivity[];
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
