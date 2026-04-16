export type OrganigramaRoleKey =
  | "secretary"
  | "bodyCoordinator"
  | "serviceOverseer"
  | "accounts"
  | "digitalSupport"
  | "publicTalks"
  | "attendants"
  | "audioVideo"
  | "cleaning"
  | "publications"
  | "territories"
  | "watchtowerConductor"
  | "lifeMinistryOverseer"
  | "assistantCounselor";

export type OrganigramaMemberAssignment = {
  memberId?: number;
  auxiliaryMemberId?: number;
};

export type OrganigramaAssignments = Record<
  OrganigramaRoleKey,
  OrganigramaMemberAssignment
>;

export type OrganigramaRecord = {
  id: number;
  congregationName?: string;
  assignments?: Partial<OrganigramaAssignments>;
};

export type OrganigramaFormValues = {
  congregationName: string;
  assignments: OrganigramaAssignments;
};

export type OrganigramaRoleDefinition = {
  role: OrganigramaRoleKey;
  title: string;
  auxiliaryLabel: string;
};

export type OrganigramaBranchDefinition = {
  key: string;
  title: string;
  lead: OrganigramaRoleDefinition;
  children: OrganigramaRoleDefinition[];
};

export const DEFAULT_CONGREGATION_NAME = "Congregación Central";

const createEmptyAssignment = (): OrganigramaMemberAssignment => ({
  memberId: undefined,
  auxiliaryMemberId: undefined,
});

export const normalizeRoleAssignment = (
  value?: Partial<OrganigramaMemberAssignment> | null,
): OrganigramaMemberAssignment => ({
  memberId: typeof value?.memberId === "number" ? value.memberId : undefined,
  auxiliaryMemberId:
    typeof value?.auxiliaryMemberId === "number"
      ? value.auxiliaryMemberId
      : undefined,
});

export const normalizeAssignments = (
  value?: Partial<OrganigramaAssignments> | null,
): OrganigramaAssignments => ({
  secretary: normalizeRoleAssignment(value?.secretary),
  bodyCoordinator: normalizeRoleAssignment(value?.bodyCoordinator),
  serviceOverseer: normalizeRoleAssignment(value?.serviceOverseer),
  accounts: normalizeRoleAssignment(value?.accounts),
  digitalSupport: normalizeRoleAssignment(value?.digitalSupport),
  publicTalks: normalizeRoleAssignment(value?.publicTalks),
  attendants: normalizeRoleAssignment(value?.attendants),
  audioVideo: normalizeRoleAssignment(value?.audioVideo),
  cleaning: normalizeRoleAssignment(value?.cleaning),
  publications: normalizeRoleAssignment(value?.publications),
  territories: normalizeRoleAssignment(value?.territories),
  watchtowerConductor: normalizeRoleAssignment(value?.watchtowerConductor),
  lifeMinistryOverseer: normalizeRoleAssignment(value?.lifeMinistryOverseer),
  assistantCounselor: normalizeRoleAssignment(value?.assistantCounselor),
});

export const normalizeOrganigramaRecord = (
  record?: OrganigramaRecord | null,
): OrganigramaFormValues => ({
  congregationName: record?.congregationName?.trim() || DEFAULT_CONGREGATION_NAME,
  assignments: normalizeAssignments(record?.assignments),
});

export const normalizeOrganigramaValues = (
  values: OrganigramaFormValues,
): OrganigramaFormValues => ({
  congregationName: values.congregationName?.trim() || DEFAULT_CONGREGATION_NAME,
  assignments: normalizeAssignments(values.assignments),
});

export const committeeBranches: OrganigramaBranchDefinition[] = [
  {
    key: "secretary-branch",
    title: "Rama del secretario",
    lead: {
      role: "secretary",
      title: "Secretario",
      auxiliaryLabel: "Auxiliar del secretario",
    },
    children: [
      {
        role: "accounts",
        title: "Siervo de cuentas",
        auxiliaryLabel: "Auxiliar de cuentas",
      },
      {
        role: "digitalSupport",
        title: "Ayuda a usuarios de JW.ORG y JW HUB",
        auxiliaryLabel: "Auxiliar de soporte digital",
      },
    ],
  },
  {
    key: "coordination-branch",
    title: "Rama de coordinación",
    lead: {
      role: "bodyCoordinator",
      title: "Coordinador del cuerpo de ancianos",
      auxiliaryLabel: "Auxiliar de coordinación",
    },
    children: [
      {
        role: "publicTalks",
        title: "Coordinador de discursos públicos",
        auxiliaryLabel: "Auxiliar de discursos públicos",
      },
      {
        role: "attendants",
        title: "Coordinador de acomodadores",
        auxiliaryLabel: "Auxiliar de acomodadores",
      },
      {
        role: "audioVideo",
        title: "Coordinador de audio y video",
        auxiliaryLabel: "Auxiliar de audio y video",
      },
      {
        role: "cleaning",
        title: "Coordinador de limpieza",
        auxiliaryLabel: "Auxiliar de limpieza",
      },
    ],
  },
  {
    key: "service-branch",
    title: "Rama de servicio",
    lead: {
      role: "serviceOverseer",
      title: "Superintendente de servicio",
      auxiliaryLabel: "Auxiliar de servicio",
    },
    children: [
      {
        role: "publications",
        title: "Siervo de publicaciones",
        auxiliaryLabel: "Auxiliar de publicaciones",
      },
      {
        role: "territories",
        title: "Siervo de territorios",
        auxiliaryLabel: "Auxiliar de territorios",
      },
    ],
  },
];

export const otherAssignments: OrganigramaRoleDefinition[] = [
  {
    role: "watchtowerConductor",
    title: "Conductor de la Atalaya",
    auxiliaryLabel: "Auxiliar de la Atalaya",
  },
  {
    role: "lifeMinistryOverseer",
    title: "Superintendente de la reunión Vida y Ministerio",
    auxiliaryLabel: "Auxiliar de Vida y Ministerio",
  },
  {
    role: "assistantCounselor",
    title: "Consejero auxiliar",
    auxiliaryLabel: "Auxiliar del consejero",
  },
];

export const editableSections: Array<{
  key: string;
  title: string;
  fields: OrganigramaRoleDefinition[];
}> = [
  ...committeeBranches.map((branch) => ({
    key: branch.key,
    title: branch.title,
    fields: [branch.lead, ...branch.children],
  })),
  {
    key: "others",
    title: "Otros encargos",
    fields: otherAssignments,
  },
];
