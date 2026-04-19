import type { FormInstance } from "antd";
import dayjs from "dayjs";
import { getCollectionPage } from "../../api/client";
import { AUTH_STORAGE_EVENT } from "./constants";
import type {
  CurrentUser,
  EscuelaRelation,
  GroupedPersonalAppointments,
  MiembroRow,
  PersonalAppointment,
  PersonalAppointmentRow,
  PresidenciaSingle,
  ProfileFormValues,
  ProfileMember,
  ProfileResponse,
  ProfileUser,
  RelationSummary,
  UserRelation,
} from "./types";

const PERSONAL_APPOINTMENTS_STORAGE_PREFIX =
  "mis-asignaciones-personal-appointments";

export const parseCurrentUser = (): CurrentUser | null => {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw) as CurrentUser;
  } catch {
    return null;
  }
};

const hasNestedUser = (
  relation?: UserRelation
): relation is { data?: { id?: number; email?: string; username?: string } } =>
  Boolean(relation && typeof relation === "object" && "data" in relation);

export const getUserId = (relation?: UserRelation) =>
  hasNestedUser(relation) ? (relation.data?.id ?? 0) : (relation?.id ?? 0);

export const getUserEmail = (relation?: UserRelation) =>
  hasNestedUser(relation)
    ? (relation.data?.email ?? "")
    : (relation?.email ?? "");

export const getUserUsername = (relation?: UserRelation) =>
  hasNestedUser(relation)
    ? (relation.data?.username ?? "")
    : (relation?.username ?? "");

const hasNestedRelation = (
  relation?: EscuelaRelation | RelationSummary | PresidenciaSingle["presidente"]
): relation is { data?: { id?: number; attributes?: { nombre?: string } } } =>
  Boolean(relation && typeof relation === "object" && "data" in relation);

export const getRelationId = (relation?: EscuelaRelation | RelationSummary) => {
  if (!relation) return 0;
  if (hasNestedRelation(relation)) {
    return relation.data?.id ?? 0;
  }
  return relation.id ?? 0;
};

export const getRelationName = (
  relation: EscuelaRelation | RelationSummary,
  fallback = ""
) => {
  if (!relation) return fallback;
  if (hasNestedRelation(relation)) {
    return relation.data?.attributes?.nombre ?? fallback;
  }
  return relation.nombre ?? fallback;
};

const hasNestedTema = (
  tema?: PresidenciaSingle["discursoTema"] | PresidenciaSingle["proximoTema"]
): tema is { data?: { id?: number; attributes?: { titulo?: string } } } =>
  Boolean(tema && typeof tema === "object" && "data" in tema);

export const getTemaTitulo = (
  tema?: PresidenciaSingle["discursoTema"] | PresidenciaSingle["proximoTema"]
) => {
  if (!tema) return "";
  if (hasNestedTema(tema)) {
    return tema.data?.attributes?.titulo ?? "";
  }
  return tema.titulo ?? "";
};

export const fetchAllCollection = async <T,>(
  path: string,
  params?: Record<string, unknown>
): Promise<Array<T & { id: number }>> => {
  const items: Array<T & { id: number }> = [];
  let page = 1;
  let pageCount = 1;

  do {
    const { data, pagination } = await getCollectionPage<T>(path, {
      ...params,
      "pagination[page]": page,
      "pagination[pageSize]": 100,
    });

    items.push(...data);
    pageCount = pagination?.pageCount ?? page;
    page += 1;
  } while (page <= pageCount);

  return items;
};

export const toProfileMember = (
  member?: Partial<MiembroRow> | ProfileMember
): ProfileMember => {
  if (!member?.id) {
    return null;
  }

  const nombreCompleto =
    member.nombre?.trim() ||
    [member.nombres, member.apellidos].filter(Boolean).join(" ").trim() ||
    "Sin nombre";

  return {
    id: member.id,
    documentId: member.documentId,
    nombre: nombreCompleto,
    nombres: member.nombres ?? "",
    apellidos: member.apellidos ?? "",
    telefono: member.telefono ?? "",
    celular: member.celular ?? "",
    direccion: member.direccion ?? "",
    fechaNacimiento: member.fechaNacimiento ?? "",
    fechaInmersion: member.fechaInmersion ?? "",
    genero: member.genero ?? "",
    nombramientos: Array.isArray(member.nombramientos) ? member.nombramientos : [],
    grupos: Array.isArray(member.grupos)
      ? member.grupos.map((group) => ({
          id: group.id,
          nombre: group.nombre,
        }))
      : [],
  };
};

export const createFallbackProfile = (currentUser: CurrentUser): ProfileResponse => ({
  user: {
    id: currentUser.id,
    username: currentUser.username || "",
    email: currentUser.email || "",
  },
  member: null,
});

export const resolveProfileState = ({
  currentUser,
  profileData,
  miembros,
}: {
  currentUser: CurrentUser;
  profileData: ProfileResponse;
  miembros: MiembroRow[];
}) => {
  const fallbackProfile = createFallbackProfile(currentUser);
  const fallbackMember =
    miembros.find((item) => getUserId(item.usuario) === currentUser.id) ??
    miembros.find(
      (item) =>
        getUserEmail(item.usuario).toLowerCase() ===
        (currentUser.email ?? "").toLowerCase()
    ) ??
    miembros.find(
      (item) =>
        getUserUsername(item.usuario).toLowerCase() ===
        (currentUser.username ?? "").toLowerCase()
    ) ??
    null;
  const resolvedMember =
    toProfileMember(profileData.member) ?? toProfileMember(fallbackMember);

  return {
    profile: {
      user: profileData.user ?? fallbackProfile.user,
      member: resolvedMember,
    } satisfies ProfileResponse,
    member: resolvedMember,
  };
};

export const getDateKey = (
  value: { format: (pattern: string) => string } | string
) =>
  typeof value === "string"
    ? dayjs(value).format("YYYY-MM-DD")
    : value.format("YYYY-MM-DD");

export const getIsoWeekInfo = (value: dayjs.Dayjs) => {
  const date = value.toDate();
  const utcDate = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNumber = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );

  return {
    year: utcDate.getUTCFullYear(),
    week,
  };
};

export const monthTitle = (value: string) =>
  dayjs(value).locale("es").format("MMMM [de] YYYY");

export const normalizeNameKey = (value?: string) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const getProfileDisplayName = (profile: ProfileResponse | null) =>
  profile?.member?.nombre ||
  [profile?.user?.firstname, profile?.user?.lastname]
    .filter(Boolean)
    .join(" ")
    .trim() ||
  profile?.user?.username ||
  "Usuario";

export const getProfileFormValues = ({
  profile,
  currentUser,
  currentMember,
}: {
  profile: ProfileResponse | null;
  currentUser: CurrentUser | null;
  currentMember: ProfileMember;
}): ProfileFormValues | null => {
  const activeProfile =
    profile ?? (currentUser ? createFallbackProfile(currentUser) : null);

  if (!activeProfile) {
    return null;
  }

  const activeMember = activeProfile.member ?? currentMember;

  return {
    username: activeProfile.user.username,
    email: activeProfile.user.email,
    nombres: activeMember?.nombres || activeProfile.user.firstname || "",
    apellidos: activeMember?.apellidos || activeProfile.user.lastname || "",
    telefono: activeMember?.telefono || "",
    celular: activeMember?.celular || "",
    direccion: activeMember?.direccion || "",
    genero: activeMember?.genero || undefined,
    grupo: activeMember?.grupos?.[0]?.id,
    fechaNacimiento: activeMember?.fechaNacimiento
      ? dayjs(activeMember.fechaNacimiento)
      : null,
    fechaInmersion: activeMember?.fechaInmersion
      ? dayjs(activeMember.fechaInmersion)
      : null,
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  };
};

export const populateProfileForm = ({
  form,
  profile,
  currentUser,
  currentMember,
}: {
  form: FormInstance<ProfileFormValues>;
  profile: ProfileResponse | null;
  currentUser: CurrentUser | null;
  currentMember: ProfileMember;
}) => {
  const values = getProfileFormValues({
    profile,
    currentUser,
    currentMember,
  });

  if (!values) {
    return false;
  }

  form.setFieldsValue(values);
  return true;
};

export const syncStoredProfileUser = (user: ProfileUser) => {
  localStorage.setItem("user", JSON.stringify(user));
  window.dispatchEvent(new Event(AUTH_STORAGE_EVENT));
};

export const getProfileErrorMessage = (error: unknown) => {
  const response = (error as { response?: { data?: any } })?.response?.data;

  return (
    response?.error?.message ||
    response?.message?.[0]?.messages?.[0]?.message ||
    (error instanceof Error ? error.message : null) ||
    "No se pudo actualizar el perfil."
  );
};

export const sortPersonalAppointments = (appointments: PersonalAppointment[]) =>
  appointments
    .slice()
    .sort((a, b) =>
      a.date === b.date
        ? (a.createdAt ?? "").localeCompare(b.createdAt ?? "") ||
          a.title.localeCompare(b.title, "es")
        : a.date.localeCompare(b.date)
    );

export const createPersonalAppointmentId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `appointment-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const getPersonalAppointmentsStorageKey = (userId?: number | null) =>
  userId ? `${PERSONAL_APPOINTMENTS_STORAGE_PREFIX}-${userId}` : null;

export const readPersonalAppointments = (
  userId?: number | null
): PersonalAppointment[] => {
  const storageKey = getPersonalAppointmentsStorageKey(userId);

  if (!storageKey) {
    return [];
  }

  try {
    const raw = localStorage.getItem(storageKey);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as PersonalAppointment[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return sortPersonalAppointments(
      parsed
        .filter(
          (item): item is PersonalAppointment =>
            Boolean(
              item &&
                typeof item === "object" &&
                typeof item.id === "string" &&
                typeof item.date === "string" &&
                typeof item.title === "string" &&
                typeof item.description === "string"
            )
        )
        .map((item) => ({
          ...item,
          createdAt: item.createdAt ?? null,
          updatedAt: item.updatedAt ?? null,
        }))
    );
  } catch {
    return [];
  }
};

export const persistPersonalAppointments = (
  userId: number,
  appointments: PersonalAppointment[]
) => {
  const storageKey = getPersonalAppointmentsStorageKey(userId);

  if (!storageKey) {
    return;
  }

  localStorage.setItem(storageKey, JSON.stringify(appointments));
};

export const mapPersonalAppointment = (
  appointment: PersonalAppointmentRow
): PersonalAppointment => ({
  id: String(appointment.id),
  documentId: appointment.documentId,
  date: appointment.fecha,
  title: appointment.titulo,
  description: appointment.descripcion,
  createdAt: appointment.createdAt ?? null,
  updatedAt: appointment.updatedAt ?? null,
});

export const groupPersonalAppointmentsByDate = (
  appointments: PersonalAppointment[]
): GroupedPersonalAppointments[] => {
  const groups = new Map<string, PersonalAppointment[]>();

  appointments.forEach((appointment) => {
    const current = groups.get(appointment.date) ?? [];
    current.push(appointment);
    groups.set(appointment.date, current);
  });

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({
      date,
      items: sortPersonalAppointments(items),
    }));
};
