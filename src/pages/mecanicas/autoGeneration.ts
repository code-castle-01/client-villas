import dayjs, { type Dayjs } from "dayjs";
import type { DirectoryMember } from "../../api/groupDirectory";

const INACTIVE_GROUP_NAME = "HNOS. INACTIVOS";
const WEEKEND_DAY_VALUES = new Set([0, 6]);
const AUDIO_VIDEO_SEQUENCE_NAMES = [
  "Jorge Castillo",
  "Pedro Luna",
  "Henry Trejo",
  "Barreto Joel",
  "Edgar Hernandez",
  "Alexander Perez",
  "Harol Hernández",
  "Maurisio Sabas",
];

export const AUTO_GENERATION_WEEKDAY_OPTIONS = [
  { label: "Domingo", value: 0 },
  { label: "Lunes", value: 1 },
  { label: "Martes", value: 2 },
  { label: "Miércoles", value: 3 },
  { label: "Jueves", value: 4 },
  { label: "Viernes", value: 5 },
  { label: "Sábado", value: 6 },
] as const;

type MemberOption = {
  id: number;
  nombre: string;
};

type MemberUsageStats = {
  totalCount: number;
  previousMonthCount: number;
  plannedCount: number;
  lastAssignedAt: number;
};

type RoleDescriptor = {
  label: string;
  getValue: (assignment?: MechanicsAssignmentRecord) => number | undefined;
  setValue: (payload: MecanicaPayload, value: number | null) => void;
};

export interface MechanicsAssignmentRecord {
  key?: string;
  documentId?: string;
  dateValue: string;
  accommodators: {
    dentroId?: number;
    dentro?: string;
    lobbyId?: number;
    lobby?: string;
    rejaId?: number;
    reja?: string;
  };
  microphone: {
    micro1Id?: number;
    micro1?: string;
    micro2Id?: number;
    micro2?: string;
    plataformaId?: number;
    plataforma?: string;
  };
  audioVideoId?: number;
  audioVideo?: string;
  audioVideoAuxiliarId?: number;
  audioVideoAuxiliar?: string;
  cleaning: string[];
  hospitality: string[];
}

export type MecanicaPayload = {
  fecha: string;
  acomodadorDentro: number | null;
  acomodadorLobby: number | null;
  acomodadorReja: number | null;
  micro1: number | null;
  micro2: number | null;
  plataforma: number | null;
  audioVideo: number | null;
  audioVideoAuxiliar: number | null;
  limpieza: string[];
  hospitalidad: string[];
};

export type AutoGenerationPlanItem = {
  mode: "create" | "update";
  dateValue: string;
  payload: MecanicaPayload;
  targetId?: string;
};

export type AutoGenerationPlan = {
  operations: AutoGenerationPlanItem[];
  warnings: string[];
  skippedCount: number;
};

const AUTO_ROLE_DESCRIPTORS: RoleDescriptor[] = [
  {
    label: "Dentro",
    getValue: (assignment) => assignment?.accommodators.dentroId,
    setValue: (payload, value) => {
      payload.acomodadorDentro = value;
    },
  },
  {
    label: "Lobby",
    getValue: (assignment) => assignment?.accommodators.lobbyId,
    setValue: (payload, value) => {
      payload.acomodadorLobby = value;
    },
  },
  {
    label: "Reja",
    getValue: (assignment) => assignment?.accommodators.rejaId,
    setValue: (payload, value) => {
      payload.acomodadorReja = value;
    },
  },
  {
    label: "Micrófono 1",
    getValue: (assignment) => assignment?.microphone.micro1Id,
    setValue: (payload, value) => {
      payload.micro1 = value;
    },
  },
  {
    label: "Micrófono 2",
    getValue: (assignment) => assignment?.microphone.micro2Id,
    setValue: (payload, value) => {
      payload.micro2 = value;
    },
  },
  {
    label: "Plataforma",
    getValue: (assignment) => assignment?.microphone.plataformaId,
    setValue: (payload, value) => {
      payload.plataforma = value;
    },
  },
];

const normalizeText = (value?: string | null) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const hasNumericId = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value);

const normalizeStringArray = (values?: string[]) =>
  (values ?? []).map((value) => String(value).trim()).filter(Boolean);

const sortAssignments = (assignments: MechanicsAssignmentRecord[]) =>
  [...assignments].sort((left, right) =>
    left.dateValue.localeCompare(right.dateValue),
  );

const isMaleMember = (member: DirectoryMember) => {
  if (member.genero) {
    return member.genero === "hombre";
  }

  return (member.roles ?? []).includes("varon");
};

const isInactiveMember = (member: DirectoryMember) =>
  member.grupos.some(
    (group) => normalizeText(group.nombre) === normalizeText(INACTIVE_GROUP_NAME),
  );

const buildAssignableMemberPool = (members: DirectoryMember[]): MemberOption[] =>
  members
    .filter(isMaleMember)
    .filter((member) => !isInactiveMember(member))
    .map((member) => ({
      id: member.id,
      nombre: member.nombre.trim(),
    }))
    .filter((member) => member.nombre)
    .sort((left, right) => left.nombre.localeCompare(right.nombre, "es"));

const createEmptyStats = (): MemberUsageStats => ({
  totalCount: 0,
  previousMonthCount: 0,
  plannedCount: 0,
  lastAssignedAt: 0,
});

const getOrCreateStats = (
  statsMap: Map<number, MemberUsageStats>,
  memberId: number,
) => {
  const existing = statsMap.get(memberId);
  if (existing) {
    return existing;
  }

  const created = createEmptyStats();
  statsMap.set(memberId, created);
  return created;
};

const registerHistoricalUsage = (
  statsMap: Map<number, MemberUsageStats>,
  memberId: number,
  dateValue: string,
  isPreviousMonth: boolean,
) => {
  const stats = getOrCreateStats(statsMap, memberId);
  stats.totalCount += 1;
  if (isPreviousMonth) {
    stats.previousMonthCount += 1;
  }
  stats.lastAssignedAt = Math.max(stats.lastAssignedAt, dayjs(dateValue).valueOf());
};

const registerPlannedUsage = (
  statsMap: Map<number, MemberUsageStats>,
  memberId: number,
  dateValue: string,
) => {
  const stats = getOrCreateStats(statsMap, memberId);
  stats.totalCount += 1;
  stats.plannedCount += 1;
  stats.lastAssignedAt = Math.max(stats.lastAssignedAt, dayjs(dateValue).valueOf());
};

const compareCandidates = (
  left: MemberOption,
  right: MemberOption,
  statsMap: Map<number, MemberUsageStats>,
) => {
  const leftStats = statsMap.get(left.id) ?? createEmptyStats();
  const rightStats = statsMap.get(right.id) ?? createEmptyStats();

  if (leftStats.previousMonthCount !== rightStats.previousMonthCount) {
    return leftStats.previousMonthCount - rightStats.previousMonthCount;
  }

  if (leftStats.plannedCount !== rightStats.plannedCount) {
    return leftStats.plannedCount - rightStats.plannedCount;
  }

  if (leftStats.lastAssignedAt !== rightStats.lastAssignedAt) {
    return leftStats.lastAssignedAt - rightStats.lastAssignedAt;
  }

  if (leftStats.totalCount !== rightStats.totalCount) {
    return leftStats.totalCount - rightStats.totalCount;
  }

  return left.nombre.localeCompare(right.nombre, "es");
};

const pickNextCandidate = (
  memberPool: MemberOption[],
  usedIds: Set<number>,
  statsMap: Map<number, MemberUsageStats>,
) =>
  memberPool
    .filter((member) => !usedIds.has(member.id))
    .sort((left, right) => compareCandidates(left, right, statsMap))[0];

const resolveNextSequenceValue = (
  sequence: string[],
  currentValue?: string | null,
) => {
  if (!sequence.length) {
    return null;
  }

  const normalizedCurrent = normalizeText(currentValue);
  const currentIndex = sequence.findIndex(
    (value) => normalizeText(value) === normalizedCurrent,
  );

  if (currentIndex === -1) {
    return sequence[0];
  }

  return sequence[(currentIndex + 1) % sequence.length];
};

const resolveNextAudioSequenceId = (
  sequenceIds: number[],
  currentId?: number | null,
) => {
  if (!sequenceIds.length) {
    return null;
  }

  if (!hasNumericId(currentId)) {
    return sequenceIds[0];
  }

  const currentIndex = sequenceIds.indexOf(currentId);
  if (currentIndex === -1) {
    return sequenceIds[0];
  }

  return sequenceIds[(currentIndex + 1) % sequenceIds.length];
};

const buildAudioSequence = (members: DirectoryMember[]) => {
  const membersByName = new Map(
    members
      .map((member) => [normalizeText(member.nombre), member] as const)
      .filter((entry) => entry[1]?.nombre),
  );

  const sequenceIds: number[] = [];
  const missingNames: string[] = [];

  AUDIO_VIDEO_SEQUENCE_NAMES.forEach((name) => {
    const match = membersByName.get(normalizeText(name));
    if (!match) {
      missingNames.push(name);
      return;
    }

    sequenceIds.push(match.id);
  });

  return {
    sequenceIds,
    missingNames,
  };
};

const findLastSequenceValue = (
  assignments: MechanicsAssignmentRecord[],
  selector: (assignment: MechanicsAssignmentRecord) => string[],
) => {
  for (let index = assignments.length - 1; index >= 0; index -= 1) {
    const values = normalizeStringArray(selector(assignments[index]));
    if (values.length) {
      return values[values.length - 1];
    }
  }

  return null;
};

const findLastAudioSequenceId = (
  assignments: MechanicsAssignmentRecord[],
  sequenceIds: number[],
) => {
  if (!sequenceIds.length) {
    return null;
  }

  for (let index = assignments.length - 1; index >= 0; index -= 1) {
    const currentId = assignments[index].audioVideoId;
    if (hasNumericId(currentId) && sequenceIds.includes(currentId)) {
      return currentId;
    }
  }

  return null;
};

const buildPreviousMonthWindow = (targetDate: Dayjs) => {
  const previousMonthStart = targetDate.startOf("month").subtract(1, "month");
  return {
    month: previousMonthStart.month(),
    year: previousMonthStart.year(),
  };
};

const isInSameCalendarMonth = (dateValue: string, month: number, year: number) => {
  const parsed = dayjs(dateValue);
  return parsed.month() === month && parsed.year() === year;
};

const buildExistingAssignmentsByDate = (
  assignments: MechanicsAssignmentRecord[],
  warnings: Set<string>,
) => {
  const assignmentsByDate = new Map<string, MechanicsAssignmentRecord>();

  sortAssignments(assignments).forEach((assignment) => {
    if (assignmentsByDate.has(assignment.dateValue)) {
      warnings.add(
        `Se detectaron varias asignaciones el ${assignment.dateValue}; se usará solo la primera para autocompletar.`,
      );
      return;
    }

    assignmentsByDate.set(assignment.dateValue, assignment);
  });

  return assignmentsByDate;
};

const arraysMatch = (left: string[], right: string[]) => {
  const normalizedLeft = normalizeStringArray(left);
  const normalizedRight = normalizeStringArray(right);

  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }

  return normalizedLeft.every(
    (value, index) => normalizeText(value) === normalizeText(normalizedRight[index]),
  );
};

const hasAssignmentChanges = (
  assignment: MechanicsAssignmentRecord,
  payload: MecanicaPayload,
) =>
  assignment.accommodators.dentroId !== payload.acomodadorDentro ||
  assignment.accommodators.lobbyId !== payload.acomodadorLobby ||
  assignment.accommodators.rejaId !== payload.acomodadorReja ||
  assignment.microphone.micro1Id !== payload.micro1 ||
  assignment.microphone.micro2Id !== payload.micro2 ||
  assignment.microphone.plataformaId !== payload.plataforma ||
  (assignment.audioVideoId ?? null) !== payload.audioVideo ||
  (assignment.audioVideoAuxiliarId ?? null) !== payload.audioVideoAuxiliar ||
  !arraysMatch(assignment.cleaning, payload.limpieza) ||
  !arraysMatch(assignment.hospitality, payload.hospitalidad);

export const buildWeekdayDatesInRange = (
  start: Dayjs,
  end: Dayjs,
  weekdays: number[],
) => {
  if (!start?.isValid() || !end?.isValid()) {
    return [];
  }

  const orderedWeekdays = [...new Set(weekdays)].sort((left, right) => left - right);
  if (!orderedWeekdays.length) {
    return [];
  }

  const targetDays = new Set(orderedWeekdays);
  const rangeStart = start.startOf("day");
  const rangeEnd = end.startOf("day");

  if (rangeEnd.isBefore(rangeStart, "day")) {
    return [];
  }

  const dates: string[] = [];
  let cursor = rangeStart;

  while (cursor.isBefore(rangeEnd, "day") || cursor.isSame(rangeEnd, "day")) {
    if (targetDays.has(cursor.day())) {
      dates.push(cursor.format("YYYY-MM-DD"));
    }

    cursor = cursor.add(1, "day");
  }

  return dates;
};

export const resolveAutoGenerationMonthRange = (
  assignments: MechanicsAssignmentRecord[],
  activeMonthKey?: string | null,
  fallbackDate: Dayjs = dayjs(),
) => {
  const monthIndex =
    typeof activeMonthKey === "string" && !Number.isNaN(Number(activeMonthKey))
      ? Number(activeMonthKey)
      : fallbackDate.month();

  const existingInMonth = assignments.find(
    (assignment) => dayjs(assignment.dateValue).month() === monthIndex,
  );
  const year = existingInMonth
    ? dayjs(existingInMonth.dateValue).year()
    : fallbackDate.year();

  const monthStart = dayjs().year(year).month(monthIndex).startOf("month");

  return {
    start: monthStart,
    end: monthStart.endOf("month"),
  };
};

export const inferAutoGenerationWeekdays = (
  assignments: MechanicsAssignmentRecord[],
  monthStart: Dayjs,
) => {
  const targetMonthDays = assignments
    .filter((assignment) =>
      isInSameCalendarMonth(
        assignment.dateValue,
        monthStart.month(),
        monthStart.year(),
      ),
    )
    .map((assignment) => dayjs(assignment.dateValue).day());

  if (targetMonthDays.length) {
    return [...new Set(targetMonthDays)].sort((left, right) => left - right);
  }

  const previousMonth = monthStart.subtract(1, "month");
  const previousMonthDays = assignments
    .filter((assignment) =>
      isInSameCalendarMonth(
        assignment.dateValue,
        previousMonth.month(),
        previousMonth.year(),
      ),
    )
    .map((assignment) => dayjs(assignment.dateValue).day());

  return [...new Set(previousMonthDays)].sort((left, right) => left - right);
};

export const buildMecanicaAutoGenerationPlan = ({
  assignments,
  members,
  groupSequence,
  targetDates,
}: {
  assignments: MechanicsAssignmentRecord[];
  members: DirectoryMember[];
  groupSequence: string[];
  targetDates: string[];
}): AutoGenerationPlan => {
  const normalizedTargetDates = [...new Set(targetDates)].sort();
  if (!normalizedTargetDates.length) {
    return {
      operations: [],
      warnings: [],
      skippedCount: 0,
    };
  }

  const warnings = new Set<string>();
  const sortedAssignments = sortAssignments(assignments);
  const assignmentsByDate = buildExistingAssignmentsByDate(assignments, warnings);
  const firstTargetDate = dayjs(normalizedTargetDates[0]);
  const previousMonthWindow = buildPreviousMonthWindow(firstTargetDate);
  const priorAssignments = sortedAssignments.filter((assignment) =>
    dayjs(assignment.dateValue).isBefore(firstTargetDate, "day"),
  );

  const roleStats = new Map<number, MemberUsageStats>();
  priorAssignments.forEach((assignment) => {
    AUTO_ROLE_DESCRIPTORS.forEach((descriptor) => {
      const memberId = descriptor.getValue(assignment);
      if (!hasNumericId(memberId)) {
        return;
      }

      registerHistoricalUsage(
        roleStats,
        memberId,
        assignment.dateValue,
        isInSameCalendarMonth(
          assignment.dateValue,
          previousMonthWindow.month,
          previousMonthWindow.year,
        ),
      );
    });
  });

  const assignableMembers = buildAssignableMemberPool(members);
  if (!assignableMembers.length) {
    warnings.add(
      "No hay hermanos activos disponibles para acomodadores y micrófonos; solo se crearán las fechas y secuencias posibles.",
    );
  }

  if (!groupSequence.length) {
    warnings.add(
      "No hay grupos activos configurados para completar limpieza y hospitalidad.",
    );
  }

  const { sequenceIds: audioSequenceIds, missingNames } = buildAudioSequence(members);
  if (missingNames.length) {
    warnings.add(
      `No se encontraron en el directorio estos hermanos de Audio y Video: ${missingNames.join(", ")}.`,
    );
  }

  if (!audioSequenceIds.length) {
    warnings.add(
      "No se pudo armar la secuencia de Audio y Video; el principal quedará vacío donde no exista uno manual.",
    );
  }

  let nextCleaningGroup = resolveNextSequenceValue(
    groupSequence,
    findLastSequenceValue(priorAssignments, (assignment) => assignment.cleaning),
  );
  let nextHospitalityGroup = resolveNextSequenceValue(
    groupSequence,
    findLastSequenceValue(priorAssignments, (assignment) => assignment.hospitality),
  );
  let nextAudioVideoId = resolveNextAudioSequenceId(
    audioSequenceIds,
    findLastAudioSequenceId(priorAssignments, audioSequenceIds),
  );

  const operations: AutoGenerationPlanItem[] = [];
  let skippedCount = 0;

  normalizedTargetDates.forEach((dateValue) => {
    const existingAssignment = assignmentsByDate.get(dateValue);
    const isWeekendMeeting = WEEKEND_DAY_VALUES.has(dayjs(dateValue).day());

    const payload: MecanicaPayload = {
      fecha: dateValue,
      acomodadorDentro: existingAssignment?.accommodators.dentroId ?? null,
      acomodadorLobby: existingAssignment?.accommodators.lobbyId ?? null,
      acomodadorReja: existingAssignment?.accommodators.rejaId ?? null,
      micro1: existingAssignment?.microphone.micro1Id ?? null,
      micro2: existingAssignment?.microphone.micro2Id ?? null,
      plataforma: existingAssignment?.microphone.plataformaId ?? null,
      audioVideo: existingAssignment?.audioVideoId ?? null,
      audioVideoAuxiliar: existingAssignment?.audioVideoAuxiliarId ?? null,
      limpieza: normalizeStringArray(existingAssignment?.cleaning),
      hospitalidad: normalizeStringArray(existingAssignment?.hospitality),
    };

    if (payload.limpieza.length) {
      nextCleaningGroup = resolveNextSequenceValue(
        groupSequence,
        payload.limpieza[payload.limpieza.length - 1],
      );
    } else if (groupSequence.length) {
      const cleaningGroup = nextCleaningGroup ?? groupSequence[0];
      payload.limpieza = cleaningGroup ? [cleaningGroup] : [];
      nextCleaningGroup = resolveNextSequenceValue(groupSequence, cleaningGroup);
    }

    if (isWeekendMeeting) {
      if (payload.hospitalidad.length) {
        nextHospitalityGroup = resolveNextSequenceValue(
          groupSequence,
          payload.hospitalidad[payload.hospitalidad.length - 1],
        );
      } else if (groupSequence.length) {
        const hospitalityGroup = nextHospitalityGroup ?? groupSequence[0];
        payload.hospitalidad = hospitalityGroup ? [hospitalityGroup] : [];
        nextHospitalityGroup = resolveNextSequenceValue(
          groupSequence,
          hospitalityGroup,
        );
      }
    }

    if (hasNumericId(payload.audioVideo)) {
      const resolvedNextAudio = resolveNextAudioSequenceId(
        audioSequenceIds,
        payload.audioVideo,
      );
      if (resolvedNextAudio) {
        nextAudioVideoId = resolvedNextAudio;
      }
    } else if (audioSequenceIds.length) {
      const audioVideoId = nextAudioVideoId ?? audioSequenceIds[0];
      payload.audioVideo = audioVideoId;
      nextAudioVideoId = resolveNextAudioSequenceId(audioSequenceIds, audioVideoId);
    }

    const usedIds = new Set<number>();
    if (hasNumericId(payload.audioVideo)) {
      usedIds.add(payload.audioVideo);
    }
    if (hasNumericId(payload.audioVideoAuxiliar)) {
      usedIds.add(payload.audioVideoAuxiliar);
    }

    AUTO_ROLE_DESCRIPTORS.forEach((descriptor) => {
      const preservedValue = descriptor.getValue(existingAssignment);

      if (hasNumericId(preservedValue)) {
        descriptor.setValue(payload, preservedValue);
        usedIds.add(preservedValue);
        registerPlannedUsage(roleStats, preservedValue, dateValue);
        return;
      }

      const candidate = pickNextCandidate(assignableMembers, usedIds, roleStats);
      if (!candidate) {
        descriptor.setValue(payload, null);
        warnings.add(
          `No se pudo completar ${descriptor.label} para ${dateValue} por falta de hermanos disponibles.`,
        );
        return;
      }

      descriptor.setValue(payload, candidate.id);
      usedIds.add(candidate.id);
      registerPlannedUsage(roleStats, candidate.id, dateValue);
    });

    if (!existingAssignment) {
      operations.push({
        mode: "create",
        dateValue,
        payload,
      });
      return;
    }

    if (hasAssignmentChanges(existingAssignment, payload)) {
      operations.push({
        mode: "update",
        dateValue,
        targetId: existingAssignment.documentId ?? existingAssignment.key,
        payload,
      });
      return;
    }

    skippedCount += 1;
  });

  return {
    operations,
    warnings: [...warnings],
    skippedCount,
  };
};
