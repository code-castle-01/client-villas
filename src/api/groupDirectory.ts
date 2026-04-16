import { getAllCollection } from "./client";

type RawNamedRelation =
  | number
  | { id?: number; nombre?: string }
  | { data?: { id?: number; attributes?: { nombre?: string } } }
  | null
  | undefined;

type RawGroupRelation =
  | { data?: Array<{ id: number; attributes?: { nombre?: string } }> }
  | Array<{ id: number; nombre?: string }>
  | null
  | undefined;

type RawUserRelation =
  | {
      data?: {
        id?: number;
        attributes?: { email?: string; username?: string };
      };
    }
  | { id?: number; email?: string; username?: string }
  | null
  | undefined;

type RawGroup = {
  id: number;
  documentId?: string;
  nombre: string;
  superintendente?: RawNamedRelation;
  auxiliar?: RawNamedRelation;
};

type RawMember = {
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
  genero?: "hombre" | "mujer";
  nombramientos?: unknown;
  categoria?: string;
  usuario?: RawUserRelation;
  grupos?: RawGroupRelation;
};

export type DirectoryLinkedGroup = {
  id: number;
  nombre: string;
};

export type DirectoryMember = {
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
  genero?: "hombre" | "mujer";
  nombramientos: string[];
  usuarioId?: number;
  usuarioEmail?: string;
  usuarioUsername?: string;
  grupos: DirectoryLinkedGroup[];
};

export type DirectoryGroupBase = {
  id: number;
  documentId?: string;
  nombre: string;
  superintendenteId?: number;
  superintendenteNombre?: string;
  auxiliarId?: number;
  auxiliarNombre?: string;
};

export type DirectoryGroup = DirectoryGroupBase & {
  miembros: DirectoryMember[];
};

const hasNestedRelation = (
  relation?: RawNamedRelation
): relation is { data?: { id?: number; attributes?: { nombre?: string } } } =>
  Boolean(relation && typeof relation === "object" && "data" in relation);

const getRelationId = (relation?: RawNamedRelation) => {
  if (typeof relation === "number") {
    return relation;
  }

  return hasNestedRelation(relation)
    ? (relation.data?.id ?? undefined)
    : relation?.id;
};

const getRelationName = (relation?: RawNamedRelation) => {
  if (!relation || typeof relation === "number") {
    return undefined;
  }

  if (hasNestedRelation(relation)) {
    return relation.data?.attributes?.nombre;
  }

  return relation.nombre;
};

const normalizeLinkedGroups = (groups?: RawGroupRelation): DirectoryLinkedGroup[] =>
  (groups as { data?: Array<{ id: number; attributes?: { nombre?: string } }> })?.data?.map(
    (group) => ({
      id: group.id,
      nombre: group.attributes?.nombre ?? "",
    })
  ) ??
  (groups as Array<{ id: number; nombre?: string }>)?.map((group) => ({
    id: group.id,
    nombre: group.nombre ?? "",
  })) ??
  [];

const normalizeNombramientos = (value: unknown, categoria?: string): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  return categoria ? [categoria] : [];
};

const normalizeUser = (user?: RawUserRelation) => ({
  usuarioId:
    (user as { data?: { id?: number } })?.data?.id ??
    (user as { id?: number })?.id,
  usuarioEmail:
    (user as { data?: { attributes?: { email?: string } } })?.data?.attributes
      ?.email ?? (user as { email?: string })?.email,
  usuarioUsername:
    (user as { data?: { attributes?: { username?: string } } })?.data?.attributes
      ?.username ?? (user as { username?: string })?.username,
});

const normalizeMember = (member: RawMember): DirectoryMember => ({
  id: member.id,
  documentId: member.documentId,
  nombre: member.nombre,
  nombres: member.nombres,
  apellidos: member.apellidos,
  telefono: member.telefono,
  celular: member.celular,
  direccion: member.direccion,
  fechaNacimiento: member.fechaNacimiento,
  fechaInmersion: member.fechaInmersion,
  genero: member.genero,
  nombramientos: normalizeNombramientos(member.nombramientos, member.categoria),
  grupos: normalizeLinkedGroups(member.grupos),
  ...normalizeUser(member.usuario),
});

const normalizeGroup = (group: RawGroup): DirectoryGroupBase => ({
  id: group.id,
  documentId: group.documentId,
  nombre: group.nombre,
  superintendenteId: getRelationId(group.superintendente),
  superintendenteNombre: getRelationName(group.superintendente),
  auxiliarId: getRelationId(group.auxiliar),
  auxiliarNombre: getRelationName(group.auxiliar),
});

export const attachMembersToGroups = (
  groups: DirectoryGroupBase[],
  members: DirectoryMember[]
): DirectoryGroup[] =>
  groups.map((group) => ({
    ...group,
    miembros: members.filter((member) =>
      member.grupos.some((linkedGroup) => linkedGroup.id === group.id)
    ),
  }));

export const fetchGroupDirectory = async (): Promise<{
  grupos: DirectoryGroup[];
  miembros: DirectoryMember[];
}> => {
  const [rawGroups, rawMembers] = await Promise.all([
    getAllCollection<RawGroup>("grupos", {
      populate: ["superintendente", "auxiliar"],
      "pagination[pageSize]": 100,
    }),
    getAllCollection<RawMember>("miembros", {
      populate: ["usuario", "grupos"],
      "pagination[pageSize]": 100,
    }),
  ]);

  const miembros = rawMembers.map(normalizeMember);
  const grupos = attachMembersToGroups(rawGroups.map(normalizeGroup), miembros);

  return { grupos, miembros };
};
