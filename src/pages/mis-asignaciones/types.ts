import type { Dayjs } from "dayjs";

export type CurrentUser = {
  id: number;
  email?: string;
  username?: string;
};

export type RelationSummary = {
  id: number;
  nombre: string;
} | null;

export type UserRelation =
  | { id?: number; email?: string; username?: string }
  | { data?: { id?: number; email?: string; username?: string } }
  | null
  | undefined;

export type GroupSummary = {
  id: number;
  nombre: string;
};

export type MiembroRow = {
  id: number;
  documentId?: string;
  nombre: string;
  nombres?: string;
  apellidos?: string;
  telefono?: string;
  celular?: string;
  direccion?: string;
  fechaNacimiento?: string;
  fechaInmersion?: string;
  genero?: "hombre" | "mujer" | "";
  nombramientos?: string[];
  grupos?: GroupSummary[];
  usuario?: UserRelation;
};

export type ProfileUser = {
  id: number;
  username: string;
  email: string;
  firstname?: string;
  lastname?: string;
  role?: {
    id: number;
    name: string;
    type: string;
  } | null;
};

export type ProfileMember = {
  id: number;
  documentId?: string;
  nombre: string;
  nombres?: string;
  apellidos?: string;
  telefono?: string;
  celular?: string;
  direccion?: string;
  fechaNacimiento?: string;
  fechaInmersion?: string;
  genero?: "hombre" | "mujer" | "";
  nombramientos?: string[];
  grupos?: GroupSummary[];
} | null;

export type ProfileResponse = {
  user: ProfileUser;
  member: ProfileMember;
};

export type ReunionRow = {
  id: number;
  fecha: string;
  presidente?: RelationSummary;
  lector?: RelationSummary;
  oracion?: RelationSummary;
};

export type ConferenciaRow = {
  id: number;
  fecha: string;
  orador: string;
  cong: string;
  cancion: number;
  tema?: { id: number; titulo: string } | null;
  auxiliar?: RelationSummary;
};

export type MecanicaRow = {
  id: number;
  fecha: string;
  limpieza?: string[];
  hospitalidad?: string[];
  acomodadorDentro?: RelationSummary;
  acomodadorLobby?: RelationSummary;
  acomodadorReja?: RelationSummary;
  micro1?: RelationSummary;
  micro2?: RelationSummary;
  plataforma?: RelationSummary;
  audioVideo?: RelationSummary;
  audioVideoAuxiliar?: RelationSummary;
};

export type EscuelaRelation =
  | { id?: number; nombre?: string }
  | { data?: { id?: number; attributes?: { nombre?: string } } }
  | null
  | undefined;

export type EscuelaRow = {
  id: number;
  fecha: string;
  interventionNumber: number;
  presentationLocation: string;
  encargado?: EscuelaRelation;
  ayudante?: EscuelaRelation;
};

export type VmAssignmentRole =
  | "president"
  | "counselor"
  | "prayer_open"
  | "prayer_close"
  | "student"
  | "assistant"
  | "cbs_conductor"
  | "cbs_reader"
  | "speaker";

export type VmAssignmentAssignee = {
  id: number;
  fullName: string;
};

export type VmAssignmentRow = {
  id: number;
  partOrder: number;
  role: VmAssignmentRole;
  room?: "MAIN" | "AUX";
  meetingDate?: string;
  weekStart?: string;
  weekEnd?: string;
  assignees: VmAssignmentAssignee[];
};

export type VmSettings = {
  id: number;
  congregationName?: string;
  meetingDay?:
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday";
  defaultRooms?: string[];
};

export type VisitaRow = {
  id: number;
  documentId?: string;
  fecha: string;
  tema?: string;
  completada: boolean;
  tipoRegistro?: "visita" | "s4";
  mesServicio?: string | null;
  participoMinisterio?: boolean;
  cursosBiblicos?: number;
  horas?: string;
  comentarios?: string;
  precursorAuxiliar?: boolean;
  miembro?: RelationSummary;
  acompanante?: RelationSummary;
};

export type PresidenciaSingle = {
  fecha?: string;
  orador?: string;
  congregacion?: string;
  numeroCancion?: number;
  presidente?:
    | RelationSummary
    | { data?: { id?: number; attributes?: { nombre?: string } } };
  conductorAtalaya?:
    | RelationSummary
    | { data?: { id?: number; attributes?: { nombre?: string } } };
  discursoTema?:
    | { id?: number; titulo?: string }
    | { data?: { id?: number; attributes?: { titulo?: string } } };
  proximoTema?:
    | { id?: number; titulo?: string }
    | { data?: { id?: number; attributes?: { titulo?: string } } };
};

export type AssignmentCategory =
  | "reunion"
  | "conferencia"
  | "escuela"
  | "mecanica"
  | "pastoreo"
  | "presidencia";

export type AssignmentItem = {
  id: string;
  date: string;
  title: string;
  category: AssignmentCategory;
  label: string;
  details: string[];
  status?: "pendiente" | "completada" | "programada";
};

export type GroupedAssignmentItems = {
  date: string;
  items: AssignmentItem[];
};

export type PersonalAppointment = {
  id: string;
  documentId?: string;
  date: string;
  title: string;
  description: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type GroupedPersonalAppointments = {
  date: string;
  items: PersonalAppointment[];
};

export type PersonalAppointmentRow = {
  id: number;
  documentId?: string;
  fecha: string;
  titulo: string;
  descripcion: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ProfileFormValues = {
  username: string;
  email: string;
  nombres: string;
  apellidos: string;
  telefono?: string;
  celular?: string;
  direccion?: string;
  genero?: "hombre" | "mujer";
  grupo?: number;
  fechaNacimiento?: Dayjs | null;
  fechaInmersion?: Dayjs | null;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

export type PersonalAppointmentFormValues = {
  date: Dayjs | null;
  title: string;
  description: string;
};
