import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  SearchOutlined,
  TableOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Collapse,
  DatePicker,
  Divider,
  Drawer,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Progress,
  Radio,
  Select,
  Space,
  Table,
  Steps,
  Tabs,
  Tag,
  Timeline,
  Typography,
  App as AntdApp,
} from "antd";
import dayjs from "dayjs";
import { toPng } from "html-to-image";
import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  api,
  createEntry,
  deleteEntry,
  getCollection,
  getSingle,
  updateEntry,
  updateSingle,
} from "../../api/client";
import { ColumnsType } from "antd/es/table";
import useMediaQuery from "../../hooks/useMediaQuery";
import { ColorModeContext } from "../../contexts/color-mode";
import { useDirectory } from "../../contexts/directory";
import { useIsAdminApp } from "../../hooks/useIsAdminApp";
import s140TemplateUrl from "../../assets/img/S-140_S.docx";
import SelectMiembrosCongregacion from "../../components/select-miembros-congregacion";
import "./styles.css";

type VmWeek = {
  id: number;
  documentId?: string;
  congregationName?: string;
  weekStart?: string;
  weekEnd?: string;
  sourceUrl?: string;
  sourceText?: string;
  parsed?: any;
  status?: "draft" | "ready" | "published";
  notes?: string;
};

type VmPerson = {
  id: number;
  documentId?: string;
  fullName: string;
  active?: boolean;
  roles?: string[];
};

type VmMember = {
  id: number;
  fullName: string;
  genero?: string;
  nombramientos: string[];
};

type VmAssignment = {
  id: number;
  documentId?: string;
  partOrder: number;
  role: string;
  room?: "MAIN" | "AUX";
  assignees?: Array<{ id: number; fullName: string; memberId?: number }>;
};

type VmSettings = {
  id?: number;
  congregationName?: string;
  meetingDay?: string;
  defaultRooms?: string[];
  docTemplate?: { id: number; url?: string; name?: string };
};

type MemberSelectOption = { value: number; label: string };
type MemberSelectGroup = { label: string; options: MemberSelectOption[] };

const vmRoleLabels: Record<string, string> = {
  president: "Presidente",
  counselor: "Consejero",
  prayer_open: "Oración de apertura",
  prayer_close: "Oración de cierre",
  cbs_conductor: "Conductor CBS",
  cbs_reader: "Lector CBS",
};

const vmRolesList = Object.keys(vmRoleLabels);

export interface MeetingAssignment {
  id: number;
  documentId?: string;
  managerId: number;
  assistantId?: number;
  manager: string;
  assistant?: string;
  date: string;
  intervention_number: number;
  presentation_location: string;
}

type CongregationMember = {
  id: number;
  fullName: string;
  groupNames: string[];
};

type AssignmentHistoryRow = {
  id: number;
  fullName: string;
  groupNames: string[];
  intervention3: Array<{
    hall: string;
    date: string;
    role: "Encargado" | "Ayudante";
  }>;
  intervention4: Array<{
    hall: string;
    date: string;
    role: "Encargado" | "Ayudante";
  }>;
  intervention5: Array<{
    hall: string;
    date: string;
    role: "Encargado" | "Ayudante";
  }>;
  intervention6: Array<{
    hall: string;
    date: string;
    role: "Encargado" | "Ayudante";
  }>;
  intervention7: Array<{
    hall: string;
    date: string;
    role: "Encargado" | "Ayudante";
  }>;
  completedCount: number;
  progress: number;
  lastAssignmentDate?: string;
  maleAssignments: {
    treasuresDiscourse: Array<{ date: string; label: string }>;
    treasuresGems: Array<{ date: string; label: string }>;
    bookReader: Array<{ date: string; label: string }>;
    bookConductor: Array<{ date: string; label: string }>;
  };
  maleAssignmentsCount: number;
};

type ParticipantTimelineItem = {
  key: string;
  date: string;
  color: "blue" | "green" | "gold" | "purple";
  title: string;
  tags: string[];
  primaryText: string;
  secondaryText: string;
};

type AssignmentMemberSummary =
  | { id?: number; nombre?: string }
  | { data?: { id?: number; attributes?: { nombre?: string } } }
  | null
  | undefined;

const hasAssignmentMemberData = (
  member?: AssignmentMemberSummary,
): member is { data?: { id?: number; attributes?: { nombre?: string } } } =>
  Boolean(member && typeof member === "object" && "data" in member);

type AssignmentResponse = {
  documentId?: string;
  encargado?: AssignmentMemberSummary;
  ayudante?: AssignmentMemberSummary;
  fecha: string;
  interventionNumber: number;
  presentationLocation: string;
};

type VmHistoryAssignment = {
  id: number;
  partOrder: number;
  role: string;
  room?: "MAIN" | "AUX";
  weekStart?: string;
  assignees: Array<{ id: number; fullName: string }>;
};

const getAssignmentMemberId = (member?: AssignmentMemberSummary) => {
  if (!member) return 0;
  if (hasAssignmentMemberData(member)) {
    return member.data?.id ?? 0;
  }
  return member.id ?? 0;
};

const getAssignmentMemberName = (member?: AssignmentMemberSummary) => {
  if (!member) return "";
  if (hasAssignmentMemberData(member)) {
    return member.data?.attributes?.nombre ?? "";
  }
  return member.nombre ?? "";
};

const mapAssignment = (
  assignment: AssignmentResponse & { id: number },
): MeetingAssignment => ({
  id: assignment.id,
  documentId: assignment.documentId,
  managerId: getAssignmentMemberId(assignment.encargado),
  assistantId: getAssignmentMemberId(assignment.ayudante) || undefined,
  manager: getAssignmentMemberName(assignment.encargado),
  assistant: getAssignmentMemberName(assignment.ayudante) || undefined,
  date: dayjs(assignment.fecha).format("DD-MM-YYYY"),
  intervention_number: assignment.interventionNumber,
  presentation_location: assignment.presentationLocation,
});

const isSchoolPartOrder = (value: number) => value >= 3 && value <= 7;

const mapPresentationLocationToVmRoom = (value?: string): "MAIN" | "AUX" =>
  value === "auxiliary_hall" ? "AUX" : "MAIN";

const isAssignmentWithinWeek = (
  assignment: MeetingAssignment,
  week?: VmWeek | null,
) => {
  if (!week?.weekStart) return false;

  const [day, month, year] = assignment.date.split("-");
  const assignmentDate =
    day && month && year ? dayjs(`${year}-${month}-${day}`) : dayjs("invalid");
  const weekStart = dayjs(week.weekStart);
  const weekEnd = dayjs(week.weekEnd ?? week.weekStart);

  if (!assignmentDate.isValid() || !weekStart.isValid() || !weekEnd.isValid()) {
    return false;
  }

  return (
    !assignmentDate.isBefore(weekStart, "day") &&
    !assignmentDate.isAfter(weekEnd, "day")
  );
};

const assignmentDateToTimestamp = (value: string) => {
  const [day, month, year] = value.split("-");
  const parsed =
    day && month && year ? dayjs(`${year}-${month}-${day}`) : dayjs("invalid");
  return parsed.isValid() ? parsed.valueOf() : 0;
};

const formatIsoDateToDisplay = (value?: string) => {
  if (!value) return "Sin fecha";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD-MM-YYYY") : value;
};

const sortHistoryItemsByDateDesc = <
  T extends {
    date: string;
  },
>(
  items: T[],
) =>
  items
    .slice()
    .sort(
      (a, b) =>
        assignmentDateToTimestamp(b.date) - assignmentDateToTimestamp(a.date),
    );

export const MeetingAssignmentUI: React.FC = () => {
  const isSmallScreen = useMediaQuery("(max-width: 768px)");
  const isDesktop = useMediaQuery("(min-width: 769px)");
  const { mode } = useContext(ColorModeContext);
  const isAdminApp = useIsAdminApp();
  const isReadOnly = !isAdminApp;
  const { notification } = AntdApp.useApp();
  const {
    miembros: directoryMembers,
    loaded: directoryLoaded,
  } = useDirectory();

  const [assignments, setAssignments] = useState<MeetingAssignment[]>([]);
  const [congregationMembers, setCongregationMembers] = useState<
    CongregationMember[]
  >([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [interventionNumber, setInterventionNumber] = useState<number | null>(
    null,
  );
  const [editingAssignment, setEditingAssignment] =
    useState<MeetingAssignment | null>(null);
  const [viewMode, setViewMode] = useState<boolean>(isSmallScreen);
  const [selectedCardsDate, setSelectedCardsDate] = useState<string>("all");

  const [vmLoading, setVmLoading] = useState(false);
  const [vmWeeks, setVmWeeks] = useState<VmWeek[]>([]);
  const [vmPeople, setVmPeople] = useState<VmPerson[]>([]);
  const [vmMembers, setVmMembers] = useState<VmMember[]>([]);
  const [vmAssignments, setVmAssignments] = useState<VmAssignment[]>([]);
  const [historyVmAssignments, setHistoryVmAssignments] = useState<
    VmHistoryAssignment[]
  >([]);
  const [draftAssignments, setDraftAssignments] = useState<
    Record<string, number[]>
  >({});
  const [vmSettings, setVmSettings] = useState<VmSettings | null>(null);
  const [selectedWeekId, setSelectedWeekId] = useState<string | number | null>(
    null,
  );
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [weekModalOpen, setWeekModalOpen] = useState(false);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [importingWeekFromUrl, setImportingWeekFromUrl] = useState(false);
  const [parsingWeek, setParsingWeek] = useState(false);
  const [weekForm] = Form.useForm();
  const [settingsForm] = Form.useForm();
  const [vmPersonIdByMemberId, setVmPersonIdByMemberId] = useState<
    Record<number, number>
  >({});
  const [memberIdByVmPersonId, setMemberIdByVmPersonId] = useState<
    Record<number, number>
  >({});
  const [s140Step, setS140Step] = useState(0);
  const [historySearch, setHistorySearch] = useState("");
  const [selectedHistoryParticipant, setSelectedHistoryParticipant] =
    useState<AssignmentHistoryRow | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const data = await getCollection<AssignmentResponse>("escuela-asignacions", {
        "pagination[pageSize]": 1000,
      });

      const mapped = data.map(mapAssignment);

      if (mounted) {
        setAssignments(mapped);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const members = directoryMembers
      .map((member) => ({
        id: member.id,
        fullName: getMemberFullName(member),
        groupNames: member.grupos.map((group) => group.nombre).filter(Boolean),
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "es"));

    setCongregationMembers(members);

    const mappedMembers: VmMember[] = directoryMembers.map((member) => ({
      id: member.id,
      fullName: getMemberFullName(member),
      genero: member.genero,
      nombramientos: normalizeNombramientos(member.nombramientos),
    }));

    setVmMembers(mappedMembers.filter((member) => !isNoBautizado(member)));
  }, [directoryMembers]);

  const notifySuccess = (message: string, description?: string) => {
    notification.success({
      message,
      description,
      placement: "topRight",
    });
  };

  const notifyError = (message: string, description?: string) => {
    notification.error({
      message,
      description,
      placement: "topRight",
    });
  };

  const normalizeAssignees = (
    raw: any,
  ): Array<{ id: number; fullName: string }> => {
    const items = raw?.data ?? raw ?? [];
    if (!Array.isArray(items)) return [];
    return items.map((person) => ({
      id: person.id,
      fullName: person.attributes?.fullName ?? person.fullName ?? "",
    }));
  };

  const normalizeWeekSummary = (raw: any) => {
    const item = raw?.data ?? raw;
    if (!item) return undefined;
    return {
      id: item.id,
      documentId: item.documentId,
      weekStart: item.attributes?.weekStart ?? item.weekStart,
    };
  };

  const normalizeNombramientos = (input?: string[] | string | null) => {
    if (!input) return [];
    const list = Array.isArray(input) ? input : [input];
    return list
      .filter(Boolean)
      .map((item) => String(item).trim().toLowerCase().replace(/\s+/g, "_"));
  };

  const normalizeNameKey = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const getMemberFullName = (member: any) => {
    if (member.nombre) return member.nombre;
    const nombres = member.nombres ?? "";
    const apellidos = member.apellidos ?? "";
    return `${nombres} ${apellidos}`.trim() || "Sin nombre";
  };

  const isMaleMember = (member: VmMember) => {
    const genero = member.genero?.toLowerCase();
    return genero === "hombre" || genero === "varon" || genero === "masculino";
  };

  const isNoBautizado = (member: VmMember) =>
    member.nombramientos.includes("publicador_no_bautizado") ||
    member.nombramientos.includes("no_bautizado");

  const hasNombramiento = (member: VmMember, nombramiento: string) =>
    member.nombramientos.includes(nombramiento);

  const normalizeDocTemplate = (raw: any) => {
    const item = raw?.data ?? raw;
    if (!item) return undefined;
    if (typeof item === "number") {
      return { id: item };
    }
    return {
      id: item.id,
      url: item.attributes?.url ?? item.url,
      name: item.attributes?.name ?? item.name,
    };
  };

  const loadVmAssignments = async (weekRef: string | number) => {
    const useDocumentId = typeof weekRef === "string";
    const data = await getCollection<any>("vm-assignments", {
      populate: ["assignees"],
      [useDocumentId
        ? "filters[week][documentId][$eq]"
        : "filters[week][id][$eq]"]: weekRef,
      "pagination[pageSize]": 200,
    });
    const mapped: VmAssignment[] = data.map((assignment) => ({
      id: assignment.id,
      documentId: assignment.documentId,
      partOrder: assignment.partOrder,
      role: assignment.role,
      room: assignment.room,
      assignees: normalizeAssignees(assignment.assignees),
    }));
    setVmAssignments(mapped);
    setMemberIdByVmPersonId((prev) => {
      const updated = { ...prev };
      mapped.forEach((assignment) => {
        assignment.assignees?.forEach((assignee) => {
          if (updated[assignee.id]) return;
          const matchedMember = vmMembers.find(
            (member) =>
              normalizeNameKey(member.fullName) ===
              normalizeNameKey(assignee.fullName),
          );
          if (matchedMember) {
            updated[assignee.id] = matchedMember.id;
          }
        });
      });
      return updated;
    });
    setDraftAssignments({});
  };

  const loadHistoryVmAssignments = async () => {
    const data = await getCollection<any>("vm-assignments", {
      populate: ["assignees", "week"],
      "pagination[pageSize]": 1000,
      sort: "id:desc",
    });

    const mapped: VmHistoryAssignment[] = data.map((assignment) => {
      const week = normalizeWeekSummary(assignment.week);
      return {
        id: assignment.id,
        partOrder: assignment.partOrder,
        role: assignment.role,
        room: assignment.room,
        weekStart: week?.weekStart,
        assignees: normalizeAssignees(assignment.assignees),
      };
    });

    setHistoryVmAssignments(mapped);
  };

  const loadVmBase = async () => {
    setVmLoading(true);
    try {
      const [weeksData, peopleData, settingsData] =
        await Promise.all([
          getCollection<VmWeek>("vm-weeks", {
            "pagination[pageSize]": 200,
            sort: "weekStart:desc",
          }),
          getCollection<VmPerson>("vm-people", {
            "pagination[pageSize]": 500,
            sort: "fullName:asc",
          }),
          getSingle<VmSettings>("vm-setting", {
            populate: ["docTemplate"],
          }),
        ]);

      setVmWeeks(weeksData);
      setVmPeople(peopleData);

      const normalizedSettings = settingsData
        ? {
            ...settingsData,
            docTemplate: normalizeDocTemplate(settingsData.docTemplate),
          }
        : null;
      setVmSettings(normalizedSettings);

      if (normalizedSettings) {
        settingsForm.setFieldsValue({
          congregationName: normalizedSettings.congregationName ?? "",
          meetingDay: normalizedSettings.meetingDay ?? "monday",
          defaultRooms: normalizedSettings.defaultRooms ?? ["MAIN", "AUX"],
        });
      }

      if (!selectedWeekId && weeksData.length) {
        setSelectedWeekId(weeksData[0].documentId ?? weeksData[0].id);
      }

      await loadHistoryVmAssignments();
    } catch (error) {
      notifyError("No se pudo cargar el módulo S-140", "Revisa el servidor.");
    } finally {
      setVmLoading(false);
    }
  };

  useEffect(() => {
    if (!directoryLoaded) return;
    void loadVmBase();
  }, [directoryLoaded]);

  useEffect(() => {
    if (!vmMembers.length || !vmPeople.length) return;

    const personByMember: Record<number, number> = {};
    const memberByPerson: Record<number, number> = {};

    const peopleByName = new Map(
      vmPeople.map((person) => [normalizeNameKey(person.fullName), person.id]),
    );

    vmMembers.forEach((member) => {
      const personId = peopleByName.get(normalizeNameKey(member.fullName));
      if (personId) {
        personByMember[member.id] = personId;
        memberByPerson[personId] = member.id;
      }
    });

    setVmPersonIdByMemberId((prev) => ({ ...prev, ...personByMember }));
    setMemberIdByVmPersonId((prev) => ({ ...prev, ...memberByPerson }));
  }, [vmMembers, vmPeople]);

  useEffect(() => {
    if (!selectedWeekId) return;
    const currentWeek = vmWeeks.find(
      (week) =>
        week.documentId === selectedWeekId || week.id === selectedWeekId,
    );
    setSourceUrl(currentWeek?.sourceUrl ?? "");
    setSourceText(currentWeek?.sourceText ?? "");
    const weekRef =
      currentWeek?.documentId ?? currentWeek?.id ?? selectedWeekId;
    loadVmAssignments(weekRef).catch(() => {
      notifyError("No se pudieron cargar las asignaciones de la semana.");
    });
  }, [selectedWeekId, vmWeeks]);

  useEffect(() => {
    if (!Object.keys(memberIdByVmPersonId).length) return;
    setVmPersonIdByMemberId((prev) => {
      const updated = { ...prev };
      Object.entries(memberIdByVmPersonId).forEach(([personId, memberId]) => {
        updated[Number(memberId)] = Number(personId);
      });
      return updated;
    });
  }, [memberIdByVmPersonId]);

  useEffect(() => {}, [assignments]);

  const openModal = (assignment: MeetingAssignment | null = null) => {
    if (isReadOnly) return;
    setEditingAssignment(assignment);
    setIsModalOpen(true);
    if (assignment) {
      form.setFieldsValue({
        ...assignment,
        manager: assignment.managerId,
        assistant: assignment.assistantId,
        date: dayjs(assignment.date, "DD-MM-YYYY"),
      });
      setInterventionNumber(assignment.intervention_number);
    } else {
      form.resetFields();
      setInterventionNumber(null);
    }
  };

  const handleSave = async (values: any) => {
    if (isReadOnly) return;
    // Check if manager and assistant are the same (when not intervention 3)
    if (
      values.intervention_number !== 3 &&
      values.manager === values.assistant
    ) {
      form.setFields([
        {
          name: "assistant",
          errors: [
            "El ayudante no puede ser la misma persona que el Encargado",
          ],
        },
      ]);
      return; // Prevent saving
    }

    // If intervention_number is 3, remove assistant from values
    if (values.intervention_number === 3) {
      delete values.assistant;
    }

    const payload = {
      encargado: values.manager,
      ayudante: values.intervention_number === 3 ? null : values.assistant,
      fecha: values.date.format("YYYY-MM-DD"),
      interventionNumber: values.intervention_number,
      presentationLocation: values.presentation_location,
    };

    if (editingAssignment) {
      await updateEntry(
        "escuela-asignacions",
        editingAssignment.documentId ?? editingAssignment.id,
        payload,
      );
    } else {
      await createEntry("escuela-asignacions", payload);
    }

    const data = await getCollection<AssignmentResponse>(
      "escuela-asignacions",
      {
        "pagination[pageSize]": 1000,
      },
    );

    const mapped = data.map(mapAssignment);

    setAssignments(mapped);

    setIsModalOpen(false);
    setEditingAssignment(null);
  };

  const handleDelete = async (id: number) => {
    if (isReadOnly) return;
    const targetId =
      assignments.find((assignment) => assignment.id === id)?.documentId ?? id;
    await deleteEntry("escuela-asignacions", targetId);
    setAssignments(assignments.filter((a) => a.id !== id));
  };

  const selectedWeek =
    vmWeeks.find(
      (week) =>
        week.documentId === selectedWeekId || week.id === selectedWeekId,
    ) || null;

  const parsedParts = useMemo(() => {
    const parts = (selectedWeek?.parsed?.parts ?? []) as Array<any>;
    return [...parts].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [selectedWeek?.parsed]);

  const schoolDerivedAssignments = useMemo<VmAssignment[]>(() => {
    if (!selectedWeek) return [];

    const derived = new Map<string, VmAssignment>();

    assignments
      .filter(
        (assignment) =>
          isSchoolPartOrder(assignment.intervention_number) &&
          isAssignmentWithinWeek(assignment, selectedWeek),
      )
      .forEach((assignment) => {
        const room = mapPresentationLocationToVmRoom(
          assignment.presentation_location,
        );
        const assignees = [
          assignment.managerId && assignment.manager
            ? {
                id: assignment.managerId,
                memberId: assignment.managerId,
                fullName: assignment.manager,
              }
            : null,
          assignment.assistantId && assignment.assistant
            ? {
                id: assignment.assistantId,
                memberId: assignment.assistantId,
                fullName: assignment.assistant,
              }
            : null,
        ].filter(
          (
            assignee,
          ): assignee is { id: number; fullName: string; memberId: number } =>
            Boolean(assignee?.id && assignee.fullName),
        );

        if (!assignees.length) return;

        derived.set(`${assignment.intervention_number}:${room}`, {
          id: -assignment.id,
          partOrder: assignment.intervention_number,
          role: "student",
          room,
          assignees,
        });
      });

    return Array.from(derived.values());
  }, [assignments, selectedWeek]);

  const maleMembers = useMemo(
    () => vmMembers.filter(isMaleMember),
    [vmMembers],
  );
  const femaleMembers = useMemo(
    () => vmMembers.filter((member) => !isMaleMember(member)),
    [vmMembers],
  );

  const groupedMaleOptions = useMemo(() => {
    const groups: Record<string, Array<{ value: number; label: string }>> = {
      anciano: [],
      siervo_ministerial: [],
      publicador: [],
    };

    maleMembers.forEach((member) => {
      let bucket: keyof typeof groups | null = null;
      if (hasNombramiento(member, "anciano")) {
        bucket = "anciano";
      } else if (hasNombramiento(member, "siervo_ministerial")) {
        bucket = "siervo_ministerial";
      } else {
        bucket = "publicador";
      }
      groups[bucket].push({ value: member.id, label: member.fullName });
    });

    return [
      { label: "Ancianos", options: groups.anciano },
      { label: "Siervo Ministerial", options: groups.siervo_ministerial },
      { label: "Publicadores", options: groups.publicador },
    ].filter((group) => group.options.length > 0);
  }, [maleMembers]);

  const groupedLeadershipOptions = useMemo(
    () =>
      groupedMaleOptions.filter(
        (group) =>
          group.label === "Ancianos" || group.label === "Siervo Ministerial",
      ),
    [groupedMaleOptions],
  );

  const groupedMixedOptions = useMemo(() => {
    const womenOptions = femaleMembers.map((member) => ({
      value: member.id,
      label: member.fullName,
    }));
    return [
      ...groupedMaleOptions,
      { label: "Hermanas", options: womenOptions },
    ].filter((group) => group.options.length > 0);
  }, [groupedMaleOptions, femaleMembers]);

  const buildOptionsWithAssignment = (
    baseOptions: MemberSelectGroup[],
    assignment?: VmAssignment,
  ) => {
    if (!assignment?.assignees?.length) return baseOptions;

    const existingValues = new Set(
      baseOptions.flatMap((group) =>
        group.options.map((option) => option.value),
      ),
    );

    const missingOptions = assignment.assignees
      .map((assignee) => ({
        value: assignee.memberId ?? memberIdByVmPersonId[assignee.id],
        label: assignee.fullName,
      }))
      .filter(
        (option): option is MemberSelectOption =>
          Boolean(option.value && option.label) &&
          !existingValues.has(option.value),
      );

    if (!missingOptions.length) return baseOptions;

    return [
      ...baseOptions,
      {
        label: "Asignados",
        options: missingOptions,
      },
    ];
  };

  const resolveMemberIdsFromAssignment = (assignment?: VmAssignment) => {
    if (!assignment?.assignees?.length) return [];
    return assignment.assignees
      .map((assignee) => assignee.memberId ?? memberIdByVmPersonId[assignee.id])
      .filter(Boolean) as number[];
  };

  const draftKeyForRole = (role: string) => `role:${role}`;
  const draftKeyForPart = (order: number, room: string) =>
    `part:${order}:${room}`;

  const findEffectiveAssignment = (
    predicate: (assignment: VmAssignment) => boolean,
  ) => findAssignment(predicate) ?? schoolDerivedAssignments.find(predicate);

  const ensureVmPersonIdForMember = async (memberId: number) => {
    const cached = vmPersonIdByMemberId[memberId];
    if (cached) return cached;

    const member = vmMembers.find((item) => item.id === memberId);
    if (!member) return null;

    const existing = vmPeople.find(
      (person) =>
        person.fullName.trim().toLowerCase() ===
        member.fullName.trim().toLowerCase(),
    );
    if (existing) {
      setVmPersonIdByMemberId((prev) => ({ ...prev, [memberId]: existing.id }));
      setMemberIdByVmPersonId((prev) => ({ ...prev, [existing.id]: memberId }));
      return existing.id;
    }

    const created = await createEntry<VmPerson>("vm-people", {
      fullName: member.fullName,
      active: true,
      roles: [],
    });

    setVmPeople((prev) => [...prev, created]);
    setVmPersonIdByMemberId((prev) => ({ ...prev, [memberId]: created.id }));
    setMemberIdByVmPersonId((prev) => ({ ...prev, [created.id]: memberId }));
    return created.id;
  };

  const resolveVmPersonIds = async (memberIds: number[]) => {
    const resolved: number[] = [];
    for (const memberId of memberIds) {
      const personId = await ensureVmPersonIdForMember(memberId);
      if (personId) resolved.push(personId);
    }
    return resolved;
  };

  const openWeekModal = (week?: VmWeek | null) => {
    if (isReadOnly) return;
    setWeekModalOpen(true);
    if (week) {
      weekForm.setFieldsValue({
        congregationName:
          week.congregationName ?? vmSettings?.congregationName ?? "",
        weekStart: week.weekStart ? dayjs(week.weekStart) : null,
        weekEnd: week.weekEnd ? dayjs(week.weekEnd) : null,
        sourceUrl: week.sourceUrl ?? "",
        status: week.status ?? "draft",
        notes: week.notes ?? "",
      });
      weekForm.setFieldValue("id", week.documentId ?? week.id);
    } else {
      weekForm.resetFields();
      weekForm.setFieldsValue({
        congregationName: vmSettings?.congregationName ?? "",
        sourceUrl: sourceUrl.trim(),
        status: "draft",
      });
    }
  };

  const handleSaveWeek = async (values: any) => {
    if (isReadOnly) return;
    const payload = {
      congregationName: values.congregationName,
      weekStart: values.weekStart.format("YYYY-MM-DD"),
      weekEnd: values.weekEnd.format("YYYY-MM-DD"),
      sourceUrl: values.sourceUrl?.trim() ?? "",
      status: values.status,
      notes: values.notes ?? "",
    };

    try {
      if (values.id) {
        await updateEntry("vm-weeks", values.id, payload);
      } else {
        const created = await createEntry<VmWeek>("vm-weeks", payload);
        setSelectedWeekId(created.documentId ?? created.id);
      }

      await loadVmBase();
      notifySuccess("Semana guardada");
      setWeekModalOpen(false);
    } catch (error) {
      notifyError(
        "No se pudo guardar la semana",
        "Revisa los datos ingresados.",
      );
    }
  };

  const handleSaveSettings = async (values: any) => {
    if (isReadOnly) return;
    try {
      const payload = {
        congregationName: values.congregationName,
        meetingDay: values.meetingDay,
        defaultRooms: values.defaultRooms ?? ["MAIN", "AUX"],
        docTemplate: vmSettings?.docTemplate?.id ?? undefined,
      };
      const updated = await updateSingle<VmSettings>("vm-setting", payload);
      const normalized = {
        ...updated,
        docTemplate: normalizeDocTemplate(updated.docTemplate),
      };
      setVmSettings(normalized);
      notifySuccess("Configuración guardada");
    } catch (error) {
      notifyError(
        "No se pudo guardar la configuración",
        "Revisa los campos obligatorios.",
      );
    }
  };

  const handleUploadTemplate = async () => {
    if (isReadOnly) return;
    setUploadingTemplate(true);
    try {
      const response = await fetch(s140TemplateUrl);
      const blob = await response.blob();
      const file = new File([blob], "S-140_S.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const formData = new FormData();
      formData.append("files", file);

      const uploadResponse = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const uploadedFile = Array.isArray(uploadResponse.data)
        ? uploadResponse.data[0]
        : uploadResponse.data;

      const settingsPayload = {
        congregationName:
          settingsForm.getFieldValue("congregationName") ||
          vmSettings?.congregationName ||
          "",
        meetingDay:
          settingsForm.getFieldValue("meetingDay") ||
          vmSettings?.meetingDay ||
          "monday",
        defaultRooms: settingsForm.getFieldValue("defaultRooms") ||
          vmSettings?.defaultRooms || ["MAIN", "AUX"],
        docTemplate: uploadedFile?.id,
      };

      const updated = await updateSingle<VmSettings>(
        "vm-setting",
        settingsPayload,
      );
      const normalized = {
        ...updated,
        docTemplate: normalizeDocTemplate(updated.docTemplate),
      };
      setVmSettings(normalized);
      notifySuccess("Plantilla S-140 cargada");
    } catch (error) {
      const message =
        (error as any)?.response?.data?.error?.message ??
        (error as any)?.response?.data?.message;
      notifyError(
        "No se pudo subir la plantilla",
        message ||
          "Verifica que el backend acepte archivos y que tengas permisos.",
      );
    } finally {
      setUploadingTemplate(false);
    }
  };

  const handleParseWeek = async () => {
    if (!selectedWeekId) return;
    if (!sourceText.trim()) {
      notifyError("Pega el texto de la semana para analizar.");
      return;
    }
    setParsingWeek(true);
    try {
      const weekRef =
        selectedWeek?.documentId ?? selectedWeek?.id ?? selectedWeekId;
      const { data } = await api.post(`/vm-weeks/${weekRef}/parse`, {
        sourceUrl,
        sourceText,
      });

      setVmWeeks((prev) =>
        prev.map((week) =>
          week.id === selectedWeekId || week.documentId === selectedWeekId
            ? {
                ...week,
                parsed: data?.parsed ?? data?.data?.parsed,
                sourceUrl: sourceUrl.trim() || week.sourceUrl,
                sourceText,
                status: "ready",
              }
            : week,
        ),
      );
      notifySuccess("Semana interpretada");
    } catch (error) {
      const message =
        (error as any)?.response?.data?.error?.message ??
        (error as any)?.response?.data?.message;
      notifyError(
        "No se pudo interpretar la semana",
        "Revisa el texto pegado.",
      );
      if (message) {
        notifyError("Detalle del parser", message);
      }
    } finally {
      setParsingWeek(false);
    }
  };

  const handleImportWeekFromUrl = async () => {
    if (!selectedWeekId) return;
    if (!sourceUrl.trim()) {
      notifyError("Pega el enlace oficial de wol.jw.org para importar.");
      return;
    }

    setImportingWeekFromUrl(true);
    try {
      const weekRef =
        selectedWeek?.documentId ?? selectedWeek?.id ?? selectedWeekId;
      const { data } = await api.post(`/vm-weeks/${weekRef}/import-from-url`, {
        sourceUrl,
      });

      const importedSourceUrl = data?.sourceUrl ?? sourceUrl.trim();
      const importedSourceText = data?.sourceText ?? "";
      const importedParsed = data?.parsed ?? null;

      setSourceUrl(importedSourceUrl);
      setSourceText(importedSourceText);
      setVmWeeks((prev) =>
        prev.map((week) =>
          week.id === selectedWeekId || week.documentId === selectedWeekId
            ? {
                ...week,
                sourceUrl: importedSourceUrl,
                sourceText: importedSourceText,
                parsed: importedParsed,
                status: "ready",
              }
            : week,
        ),
      );
      notifySuccess("Contenido importado desde WOL");
    } catch (error) {
      const message =
        (error as any)?.response?.data?.error?.message ??
        (error as any)?.response?.data?.message;
      notifyError(
        "No se pudo importar desde la URL",
        message || "Revisa que el enlace sea oficial y que la página exista.",
      );
    } finally {
      setImportingWeekFromUrl(false);
    }
  };

  const handleExportDocx = async () => {
    if (!selectedWeekId) return;
    setExportingDocx(true);
    try {
      const weekRef =
        selectedWeek?.documentId ?? selectedWeek?.id ?? selectedWeekId;
      const response = await api.post(
        `/vm-weeks/${weekRef}/export/s140-docx`,
        null,
        {
          responseType: "blob",
        },
      );

      const contentDisposition = response.headers["content-disposition"];
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] ?? `S-140-${selectedWeekId}.docx`;
      const issues = response.headers["x-vm-validation-issues"];

      if (issues) {
        notification.warning({
          message: "Advertencias al generar",
          description: String(issues),
          placement: "topRight",
          duration: 6,
        });
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);
      notifySuccess("S-140 generado");
    } catch (error) {
      const message =
        (error as any)?.response?.data?.error?.message ??
        (error as any)?.response?.data?.message;
      notifyError(
        "No se pudo generar el S-140",
        message || "Verifica la plantilla configurada en VM Settings.",
      );
    } finally {
      setExportingDocx(false);
    }
  };

  const findAssignment = (predicate: (assignment: VmAssignment) => boolean) =>
    vmAssignments.find(predicate);

  const upsertAssignment = async (
    existing: VmAssignment | undefined,
    payload: any,
  ) => {
    const weekRef =
      payload?.week ??
      selectedWeek?.documentId ??
      selectedWeek?.id ??
      selectedWeekId ??
      null;

    try {
      const assignmentId = existing?.documentId ?? existing?.id;

      if (payload.assignees?.length) {
        if (existing && assignmentId) {
          try {
            await updateEntry("vm-assignments", assignmentId as any, payload);
          } catch (error: any) {
            if (error?.response?.status === 404) {
              await createEntry("vm-assignments", payload);
            } else {
              throw error;
            }
          }
        } else {
          await createEntry("vm-assignments", payload);
        }
      } else if (existing && assignmentId) {
        try {
          await deleteEntry("vm-assignments", assignmentId as any);
        } catch (error: any) {
          if (error?.response?.status !== 404) {
            throw error;
          }
        }
      }

      if (weekRef) {
        await loadVmAssignments(weekRef);
      }
      await loadHistoryVmAssignments();
    } catch (error: any) {
      const serverMessage =
        error?.response?.data?.error?.message ??
        error?.response?.data?.message ??
        "No se pudo guardar la asignación.";
      notifyError("Error al guardar asignación", serverMessage);
    }
  };

  const handleRoleAssignmentChange = async (
    role: string,
    memberIds: number[],
  ) => {
    if (!selectedWeekId) return;
    setDraftAssignments((prev) => ({
      ...prev,
      [draftKeyForRole(role)]: memberIds,
    }));
    const existing = findAssignment(
      (assignment) => assignment.role === role && assignment.partOrder === 0,
    );
    const assigneeIds = await resolveVmPersonIds(memberIds);
    const weekRef =
      selectedWeek?.documentId ?? selectedWeek?.id ?? selectedWeekId;
    await upsertAssignment(existing, {
      week: weekRef,
      partOrder: 0,
      room: "MAIN",
      role,
      assignees: assigneeIds,
    });
  };

  const handlePartAssignmentChange = async (
    order: number,
    room: "MAIN" | "AUX",
    memberIds: number[],
  ) => {
    if (!selectedWeekId) return;
    setDraftAssignments((prev) => ({
      ...prev,
      [draftKeyForPart(order, room)]: memberIds,
    }));
    const existing = findAssignment(
      (assignment) =>
        assignment.partOrder === order && assignment.room === room,
    );
    const assigneeIds = await resolveVmPersonIds(memberIds);
    const weekRef =
      selectedWeek?.documentId ?? selectedWeek?.id ?? selectedWeekId;
    await upsertAssignment(existing, {
      week: weekRef,
      partOrder: order,
      room,
      role: "student",
      assignees: assigneeIds,
    });
  };

  const baseColumns: ColumnsType<MeetingAssignment> = [
    {
      fixed: true,
      width: 120,
      title: "Nombre",
      dataIndex: "manager",
      key: "manager",
      sorter: (a: MeetingAssignment, b: MeetingAssignment) =>
        a.manager.localeCompare(b.manager), // Función para ordenar alfabéticamente
      filterDropdown: ({
        setSelectedKeys,
        selectedKeys,
        confirm,
        clearFilters,
      }: any) => (
        <div className="p-2">
          <Input
            placeholder="Buscar por nombre"
            value={selectedKeys[0]}
            onChange={(e) =>
              setSelectedKeys(e.target.value ? [e.target.value] : [])
            }
            onPressEnter={confirm} // Confirma la búsqueda al presionar Enter
            className="mb-2"
          />
          <Space>
            <Button
              type="primary"
              onClick={confirm}
              icon={<SearchOutlined />}
              size="small"
              className="w-28"
            >
              Buscar
            </Button>
            <Button onClick={clearFilters} size="small" className="w-28">
              Resetear
            </Button>
          </Space>
        </div>
      ),
      onFilter: (value: any, record: any) =>
        record.manager.toLowerCase().includes(value.toLowerCase()), // Función de búsqueda
    },
    {
      width: 120,
      title: "Ayudante",
      dataIndex: "assistant",
      key: "assistant",
      sorter: (a: MeetingAssignment, b: MeetingAssignment) =>
        (a.assistant || "").localeCompare(b.assistant || ""),
      render: (value: string) => value || "N/A",
    },
    {
      width: 100,
      title: "Fecha",
      dataIndex: "date",
      key: "date",
      align: "center",
    },
    {
      width: 40,
      title: "N°",
      dataIndex: "intervention_number",
      key: "intervention_number",
    },
    {
      width: 100,
      title: "Lugar",
      dataIndex: "presentation_location",
      key: "presentation_location",
      render: (value: string) => {
        switch (value) {
          case "main_hall":
            return "Sala principal";
          case "auxiliary_hall":
            return "Sala auxiliar";
          default:
            return value;
        }
      },
    },
  ];
  const tableColumns: ColumnsType<MeetingAssignment> = isAdminApp
    ? [
        ...baseColumns,
        {
          width: 100,
          align: "center",
          title: "Menu",
          key: "menu",
          render: (_: any, record: MeetingAssignment) => (
            <Space size="middle">
              <Button
                size="small"
                shape="circle"
                type="primary"
                ghost
                onClick={() => openModal(record)}
                icon={<EditOutlined />}
              />
              <Popconfirm
                title="¿Estás seguro de eliminar esta asignación?"
                onConfirm={() => handleDelete(record.id)}
                okText="Sí"
                cancelText="No"
              >
                <Button
                  size="small"
                  shape="circle"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Popconfirm>
            </Space>
          ),
        },
      ]
    : baseColumns;

  const toggleViewMode = () => setViewMode(!viewMode);

  const assignmentHistoryRows = useMemo<AssignmentHistoryRow[]>(() => {
    const initialMap = new Map<number, AssignmentHistoryRow>();

    congregationMembers.forEach((member) => {
      initialMap.set(member.id, {
        id: member.id,
        fullName: member.fullName,
        groupNames: member.groupNames,
        intervention3: [],
        intervention4: [],
        intervention5: [],
        intervention6: [],
        intervention7: [],
        completedCount: 0,
        progress: 0,
        lastAssignmentDate: undefined,
        maleAssignments: {
          treasuresDiscourse: [],
          treasuresGems: [],
          bookReader: [],
          bookConductor: [],
        },
        maleAssignmentsCount: 0,
      });
    });

    const memberIdByNormalizedName = new Map(
      congregationMembers.map((member) => [
        normalizeNameKey(member.fullName),
        member.id,
      ]),
    );

    const hallLabel = (value: string) => {
      if (value === "main_hall") return "Sala A";
      if (value === "auxiliary_hall") return "Sala B";
      return value;
    };

    const appendAssignment = (
      personId: number | undefined,
      role: "Encargado" | "Ayudante",
      assignment: MeetingAssignment,
    ) => {
      if (!personId) return;
      const row = initialMap.get(personId);
      if (!row) return;

      const key = `intervention${assignment.intervention_number}` as
        | "intervention3"
        | "intervention4"
        | "intervention5"
        | "intervention6"
        | "intervention7";

      if (!(key in row)) return;

      row[key].push({
        hall: hallLabel(assignment.presentation_location),
        date: assignment.date,
        role,
      });

      if (
        !row.lastAssignmentDate ||
        dayjs(assignment.date, "DD-MM-YYYY").isAfter(
          dayjs(row.lastAssignmentDate, "DD-MM-YYYY"),
        )
      ) {
        row.lastAssignmentDate = assignment.date;
      }
    };

    assignments.forEach((assignment) => {
      appendAssignment(assignment.managerId, "Encargado", assignment);
      appendAssignment(assignment.assistantId, "Ayudante", assignment);
    });

    const resolveMaleAssignmentKey = (
      assignment: VmHistoryAssignment,
    ): keyof AssignmentHistoryRow["maleAssignments"] | null => {
      if (assignment.role === "student" && assignment.partOrder === 1) {
        return "treasuresDiscourse";
      }
      if (assignment.role === "student" && assignment.partOrder === 2) {
        return "treasuresGems";
      }
      if (assignment.role === "cbs_reader") {
        return "bookReader";
      }
      if (assignment.role === "cbs_conductor") {
        return "bookConductor";
      }
      return null;
    };

    const maleAssignmentLabel: Record<
      keyof AssignmentHistoryRow["maleAssignments"],
      string
    > = {
      treasuresDiscourse: "Tesoros · Discurso",
      treasuresGems: "Tesoros · Perlas escondidas",
      bookReader: "Libro · Lector",
      bookConductor: "Libro · Conductor",
    };

    historyVmAssignments.forEach((assignment) => {
      const targetKey = resolveMaleAssignmentKey(assignment);
      if (!targetKey) return;

      assignment.assignees.forEach((assignee) => {
        const memberId = memberIdByNormalizedName.get(
          normalizeNameKey(assignee.fullName),
        );
        if (!memberId) return;

        const row = initialMap.get(memberId);
        if (!row) return;

        row.maleAssignments[targetKey].push({
          date: formatIsoDateToDisplay(assignment.weekStart),
          label: maleAssignmentLabel[targetKey],
        });
      });
    });

    return Array.from(initialMap.values())
      .map((row) => {
        const completedCount = [3, 4, 5, 6, 7].filter((number) => {
          const key = `intervention${number}` as
            | "intervention3"
            | "intervention4"
            | "intervention5"
            | "intervention6"
            | "intervention7";
          return row[key].length > 0;
        }).length;

        return {
          ...row,
          completedCount,
          progress: Math.round((completedCount / 5) * 100),
          maleAssignmentsCount: Object.values(row.maleAssignments).reduce(
            (total, items) => total + items.length,
            0,
          ),
        };
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [assignments, congregationMembers, historyVmAssignments]);

  const maleHistorySections: Array<{
    key: keyof AssignmentHistoryRow["maleAssignments"];
    title: string;
  }> = [
    { key: "treasuresDiscourse", title: "1. Tesoros (Discurso)" },
    { key: "treasuresGems", title: "2. Tesoros (Perlas escondidas)" },
    { key: "bookReader", title: "Libro (Lector)" },
    { key: "bookConductor", title: "Libro (Conductor)" },
  ];

  const renderHistoryCell = (items: AssignmentHistoryRow["intervention3"]) => {
    if (!items.length) {
      return <Typography.Text type="secondary">-</Typography.Text>;
    }

    const visibleItems = sortHistoryItemsByDateDesc(items).slice(0, 2);

    return (
      <Space direction="vertical" size={4}>
        {visibleItems.map((item, index) => (
          <Tag
            key={`${item.date}-${item.hall}-${item.role}-${index}`}
            color="blue"
            className="escuela-history-tag"
          >
            {item.date} · {item.hall} · {item.role}
          </Tag>
        ))}
      </Space>
    );
  };

  const buildParticipantTimeline = (
    record: AssignmentHistoryRow,
  ): ParticipantTimelineItem[] => {
    const hallLabel = (value: string) => {
      if (value === "main_hall") return "Sala principal";
      if (value === "auxiliary_hall") return "Sala B";
      return value;
    };
    const maleAssignmentLabelByKey: Record<
      keyof AssignmentHistoryRow["maleAssignments"],
      string
    > = {
      treasuresDiscourse: "Tesoros (Discurso)",
      treasuresGems: "Tesoros (Perlas escondidas)",
      bookReader: "Libro (Lector)",
      bookConductor: "Libro (Conductor)",
    };

    const resolveMaleAssignmentKey = (
      assignment: VmHistoryAssignment,
    ): keyof AssignmentHistoryRow["maleAssignments"] | null => {
      if (assignment.role === "student" && assignment.partOrder === 1) {
        return "treasuresDiscourse";
      }
      if (assignment.role === "student" && assignment.partOrder === 2) {
        return "treasuresGems";
      }
      if (assignment.role === "cbs_reader") {
        return "bookReader";
      }
      if (assignment.role === "cbs_conductor") {
        return "bookConductor";
      }
      return null;
    };

    const memberNameKey = normalizeNameKey(record.fullName);

    const schoolTimelineItems = assignments.flatMap((assignment) => {
      const items: ParticipantTimelineItem[] = [];

      if (assignment.managerId === record.id) {
        items.push({
          key: `${assignment.id}-manager`,
          date: assignment.date,
          color: "blue",
          title: `Intervención #${assignment.intervention_number}`,
          tags: [assignment.date, "Encargado"],
          primaryText: hallLabel(assignment.presentation_location),
          secondaryText: `Ayudante: ${assignment.assistant || "N/A"}`,
        });
      }

      if (assignment.assistantId === record.id) {
        items.push({
          key: `${assignment.id}-assistant`,
          date: assignment.date,
          color: "green",
          title: `Intervención #${assignment.intervention_number}`,
          tags: [assignment.date, "Ayudante"],
          primaryText: hallLabel(assignment.presentation_location),
          secondaryText: `Encargado: ${assignment.manager || "N/A"}`,
        });
      }

      return items;
    });

    const maleTimelineItems = historyVmAssignments.flatMap((assignment) => {
      const targetKey = resolveMaleAssignmentKey(assignment);
      if (!targetKey) return [];

      const isParticipantAssigned = assignment.assignees.some(
        (assignee) => normalizeNameKey(assignee.fullName) === memberNameKey,
      );

      if (!isParticipantAssigned) return [];

      const displayDate = formatIsoDateToDisplay(assignment.weekStart);
      const isBookAssignment =
        targetKey === "bookReader" || targetKey === "bookConductor";
      const color: ParticipantTimelineItem["color"] = isBookAssignment
        ? "purple"
        : "gold";

      return [
        {
          key: `vm-${assignment.id}-${targetKey}`,
          date: displayDate,
          color,
          title: maleAssignmentLabelByKey[targetKey],
          tags: [displayDate],
          primaryText: isBookAssignment
            ? "Estudio bíblico de la congregación"
            : `Parte ${assignment.partOrder}`,
          secondaryText: isBookAssignment
            ? "Asignación de libro"
            : "Asignación de tesoros",
        },
      ];
    });

    return [...schoolTimelineItems, ...maleTimelineItems].sort((a, b) => {
      const byDate =
        assignmentDateToTimestamp(b.date) - assignmentDateToTimestamp(a.date);
      if (byDate !== 0) return byDate;
      return a.title.localeCompare(b.title);
    });
  };

  const renderMaleAssignmentsHistory = (record: AssignmentHistoryRow) => (
    <div className="escuela-history-expand">
      {maleHistorySections.map((section) => {
        const items = record.maleAssignments[section.key];
        return (
          <div key={section.key} className="escuela-history-expand__section">
            <Space align="center" size={8}>
              <Typography.Text strong>{section.title}</Typography.Text>
              <Tag color={items.length ? "blue" : "default"}>
                {items.length}
              </Tag>
            </Space>
            {items.length ? (
              <Space wrap size={[6, 6]}>
                {items.map((item, index) => (
                  <Tag
                    key={`${section.key}-${item.date}-${index}`}
                    color="geekblue"
                  >
                    {item.date}
                  </Tag>
                ))}
              </Space>
            ) : (
              <Typography.Text type="secondary">
                Sin asignaciones registradas.
              </Typography.Text>
            )}
          </div>
        );
      })}
    </div>
  );

  const historyColumns: ColumnsType<AssignmentHistoryRow> = [
    {
      title: "Persona",
      dataIndex: "fullName",
      key: "fullName",
      fixed: "left",
      width: 240,
      sorter: (a, b) => a.fullName.localeCompare(b.fullName),
      render: (value: string, record) => (
        <div>
          <Typography.Text strong>{value}</Typography.Text>
          <div className="escuela-history-person-meta">
            {record.completedCount} de 5 intervenciones
          </div>
        </div>
      ),
    },
    {
      title: "Interv. 3",
      dataIndex: "intervention3",
      key: "intervention3",
      width: 180,
      render: renderHistoryCell,
    },
    {
      title: "Interv. 4",
      dataIndex: "intervention4",
      key: "intervention4",
      width: 180,
      render: renderHistoryCell,
    },
    {
      title: "Interv. 5",
      dataIndex: "intervention5",
      key: "intervention5",
      width: 180,
      render: renderHistoryCell,
    },
    {
      title: "Interv. 6",
      dataIndex: "intervention6",
      key: "intervention6",
      width: 180,
      render: renderHistoryCell,
    },
    {
      title: "Interv. 7",
      dataIndex: "intervention7",
      key: "intervention7",
      width: 180,
      render: renderHistoryCell,
    },
    {
      title: "Última fecha",
      dataIndex: "lastAssignmentDate",
      key: "lastAssignmentDate",
      width: 140,
      render: (value?: string) =>
        value || (
          <Typography.Text type="secondary">Sin asignaciones</Typography.Text>
        ),
    },
    {
      title: "Detalle",
      key: "detail",
      width: 88,
      align: "center",
      render: (_, record) => (
        <Button
          size="small"
          shape="circle"
          type="primary"
          ghost
          icon={<EyeOutlined />}
          onClick={() => setSelectedHistoryParticipant(record)}
          aria-label={`Ver detalle de ${record.fullName}`}
        />
      ),
    },
  ];

  const groupedHistory = useMemo(() => {
    const normalizedSearch = normalizeNameKey(historySearch);
    const groups = new Map<string, AssignmentHistoryRow[]>();

    assignmentHistoryRows.forEach((row) => {
      if (
        normalizedSearch &&
        !normalizeNameKey(row.fullName).includes(normalizedSearch)
      ) {
        return;
      }

      const groupNames = row.groupNames.length ? row.groupNames : ["Sin grupo"];
      groupNames.forEach((groupName) => {
        const current = groups.get(groupName) ?? [];
        current.push(row);
        groups.set(groupName, current);
      });
    });

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b, "es"))
      .map(([groupName, rows]) => ({
        groupName,
        rows: rows.sort((a, b) => a.fullName.localeCompare(b.fullName, "es")),
      }));
  }, [assignmentHistoryRows, historySearch]);

  const selectedHistoryTimeline = useMemo(
    () =>
      selectedHistoryParticipant
        ? buildParticipantTimeline(selectedHistoryParticipant)
        : [],
    [selectedHistoryParticipant, assignments],
  );

  const handleDownloadImage = async (assignment: MeetingAssignment) => {
    const node = document.getElementById(`asignacion-${assignment.id}`);
    if (node) {
      const dataUrl = await toPng(node);
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `asignacion-${assignment.manager}.png`;
      link.click();
    }
  };

  const assignmentDateOptions = useMemo(() => {
    const uniqueDates = Array.from(
      new Set(assignments.map((item) => item.date)),
    );
    return uniqueDates.sort(
      (a, b) => assignmentDateToTimestamp(a) - assignmentDateToTimestamp(b),
    );
  }, [assignments]);

  const activeCardsDate = assignmentDateOptions.includes(selectedCardsDate)
    ? selectedCardsDate
    : "all";

  const groupedCardAssignments = useMemo(() => {
    const filteredAssignments =
      activeCardsDate === "all"
        ? assignments
        : assignments.filter(
            (assignment) => assignment.date === activeCardsDate,
          );

    const groups = new Map<string, MeetingAssignment[]>();

    filteredAssignments
      .slice()
      .sort((a, b) => {
        const byDate =
          assignmentDateToTimestamp(a.date) - assignmentDateToTimestamp(b.date);
        if (byDate !== 0) return byDate;
        return a.intervention_number - b.intervention_number;
      })
      .forEach((assignment) => {
        const current = groups.get(assignment.date) ?? [];
        current.push(assignment);
        groups.set(assignment.date, current);
      });

    return Array.from(groups.entries()).map(([date, items]) => ({
      date,
      items,
      halls: [
        {
          key: "main_hall",
          title: "Sala principal",
          color: "blue" as const,
          items: items.filter(
            (assignment) => assignment.presentation_location === "main_hall",
          ),
        },
        {
          key: "auxiliary_hall",
          title: "Sala auxiliar",
          color: "gold" as const,
          items: items.filter(
            (assignment) =>
              assignment.presentation_location === "auxiliary_hall",
          ),
        },
      ].filter((hall) => hall.items.length > 0),
    }));
  }, [activeCardsDate, assignments]);

  const renderAssignmentCard = (assignment: MeetingAssignment) => (
    <Card
      size="small"
      key={assignment.id}
      actions={
        isAdminApp
          ? [
              <Button
                key="edit"
                size="small"
                type="primary"
                ghost
                onClick={() => openModal(assignment)}
                icon={<EditOutlined />}
              />,
              <Popconfirm
                key="delete"
                title="¿Estás seguro de eliminar esta asignación?"
                onConfirm={() => handleDelete(assignment.id)}
                okText="Sí"
                cancelText="No"
              >
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>,
              <Button
                size="small"
                key="download"
                type="primary"
                onClick={() => handleDownloadImage(assignment)}
                icon={<DownloadOutlined />}
              />,
            ]
          : [
              <Button
                size="small"
                key="download"
                type="primary"
                onClick={() => handleDownloadImage(assignment)}
                icon={<DownloadOutlined />}
              />,
            ]
      }
    >
      <Flex
        justify="space-between"
        vertical
        gap={4}
        id={`asignacion-${assignment.id}`}
        style={{
          backgroundColor: mode === "dark" ? "#141414" : "#fff",
        }}
        className="p-2"
      >
        <Flex gap={4} align="center" vertical>
          <b>ASIGNACIÓN PARA LA REUNION</b>
          <b>VIDA Y MINISTERIO CRISTIANOS</b>
        </Flex>
        <Flex gap={4} align="baseline">
          <b>Nombre: </b>
          <span className="text-xl">{assignment.manager}</span>
        </Flex>
        <Flex gap={4} align="baseline">
          <b>Ayudante: </b>
          <span className="text-xl">{assignment.assistant || "N/A"}</span>
        </Flex>
        <Flex gap={4} align="baseline">
          <b>Fecha: </b>
          <span className="text-xl">{assignment.date}</span>
        </Flex>
        <Flex gap={4} align="baseline">
          <b>Intervención núm.: </b>
          <span className="text-xl">#{assignment.intervention_number}</span>
        </Flex>
        <Flex gap={4} align="baseline">
          <b>Se presentará en: </b>
          <span className="text-xl">
            {assignment.presentation_location === "main_hall"
              ? "Sala principal"
              : "Sala auxiliar"}
          </span>
        </Flex>

        <div className="text-[12px] w-[300px] mt-[12px] break-words">
          <b>Nota al estudiante:</b> En la Guia de actividades encontrarå la
          información que necesita para su intervención. Repase también las
          indicaciones que se describen en las Instrucciones para la reunión
          Vida y Ministerio Cristianos (S-38).
        </div>
      </Flex>
    </Card>
  );

  const assignmentsContent = (
    <>
      <Flex
        gap={12}
        align="center"
        justify="space-between"
        className="mb-4"
        wrap="wrap"
      >
        <Flex gap={12} align="center" wrap="wrap">
          <Button
            ghost
            type="primary"
            onClick={toggleViewMode}
            icon={
              viewMode === isDesktop ? (
                <UnorderedListOutlined />
              ) : (
                <TableOutlined />
              )
            }
          >
            {viewMode === isDesktop ? "Tabla" : "Tarjetas"}
          </Button>

          {viewMode && (
            <div className="escuela-cards-filter">
              <Typography.Text className="escuela-label">Fecha</Typography.Text>
              <Select
                value={activeCardsDate}
                onChange={setSelectedCardsDate}
                style={{ minWidth: 220 }}
                options={[
                  { value: "all", label: "Todas las fechas" },
                  ...assignmentDateOptions.map((date) => ({
                    value: date,
                    label: date,
                  })),
                ]}
              />
            </div>
          )}
        </Flex>

        {isAdminApp && (
          <Button type="primary" onClick={() => openModal()}>
            Nueva Asignación
          </Button>
        )}
      </Flex>

      {!assignments.length ? (
        <Empty />
      ) : viewMode ? (
        <div className="escuela-card-groups">
          {groupedCardAssignments.map((group) => (
            <section key={group.date} className="escuela-card-group">
              <Flex
                align="center"
                justify="space-between"
                wrap="wrap"
                gap={8}
                className="escuela-card-group__header"
              >
                <Typography.Title
                  level={5}
                  className="escuela-card-group__title"
                >
                  {group.date}
                </Typography.Title>
                <Tag color="blue">
                  {group.items.length} asignación
                  {group.items.length !== 1 ? "es" : ""}
                </Tag>
              </Flex>

              <div className="escuela-card-halls">
                <Collapse
                  className="escuela-card-halls__collapse"
                  defaultActiveKey={group.halls.map((hall) => hall.key)}
                  items={group.halls.map((hall) => ({
                    key: hall.key,
                    label: (
                      <Flex
                        align="center"
                        justify="space-between"
                        wrap="wrap"
                        gap={8}
                        className="escuela-card-halls__label"
                      >
                        <Space size={8}>
                          <Typography.Text strong>{hall.title}</Typography.Text>
                          <Tag color={hall.color}>
                            {hall.items.length} asignación
                            {hall.items.length !== 1 ? "es" : ""}
                          </Tag>
                        </Space>
                      </Flex>
                    ),
                    children: (
                      <div className="escuela-card-grid">
                        {hall.items.map(renderAssignmentCard)}
                      </div>
                    ),
                  }))}
                />
              </div>
            </section>
          ))}

          {!groupedCardAssignments.length && (
            <Empty description="No hay asignaciones para la fecha seleccionada." />
          )}
        </div>
      ) : (
        // Agrupar por manager para evitar filas repetidas cuando una misma persona tiene varias asignaciones
        (() => {
          type GroupRow = {
            key: string;
            managerId: number;
            manager: string;
            assignments: MeetingAssignment[];
          };

          const grouped: GroupRow[] = [];
          const mapBy = new Map<number | string, GroupRow>();
          assignments.forEach((a) => {
            const key = a.managerId ?? (a.manager || "unknown");
            const mapKey = typeof key === "number" ? key : String(key);
            const existing = mapBy.get(mapKey as any);
            if (existing) {
              existing.assignments.push(a);
            } else {
              const row: GroupRow = {
                key: String(mapKey),
                managerId: a.managerId,
                manager: a.manager,
                assignments: [a],
              };
              mapBy.set(mapKey as any, row);
              grouped.push(row);
            }
          });

          const innerColumns: ColumnsType<MeetingAssignment> =
            // Reuse tableColumns but quitar la columna `manager` (nombre)
            tableColumns.filter(
              (c) => c.key !== "manager",
            ) as ColumnsType<MeetingAssignment>;

          const groupColumns: ColumnsType<GroupRow> = [
            {
              title: "Nombre",
              dataIndex: "manager",
              key: "manager",
              render: (value: string, record: GroupRow) => (
                <div>
                  <div style={{ fontWeight: 600 }}>{value}</div>
                  <div
                    style={{ fontSize: 12, color: "var(--muted-color, #888)" }}
                  >
                    {record.assignments.length} asignación
                    {record.assignments.length !== 1 ? "es" : ""}
                  </div>
                </div>
              ),
            },
          ];

          return (
            <Table
              size="small"
              columns={groupColumns}
              dataSource={grouped}
              rowKey={(r: GroupRow) => r.key}
              expandable={{
                expandedRowRender: (record: GroupRow) => (
                  <Table
                    size="small"
                    columns={innerColumns}
                    dataSource={record.assignments}
                    rowKey="id"
                    pagination={false}
                  />
                ),
                rowExpandable: (record) => record.assignments.length > 0,
              }}
              pagination={false}
            />
          );
        })()
      )}

      {isAdminApp && (
        <Modal
          title={editingAssignment ? "Editar Asignación" : "Agregar Asignación"}
          open={isModalOpen}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingAssignment(null);
          }}
          footer={null}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
            onValuesChange={(changedValues, allValues) => {
              // If intervention number is 3, we don't need to validate assistant
              if (allValues.intervention_number === 3) return;

              // Validate that manager and assistant are not the same
              if (changedValues.manager || changedValues.assistant) {
                const { manager, assistant } = allValues;
                if (manager && assistant && manager === assistant) {
                  form.setFields([
                    {
                      name: "assistant",
                      errors: [
                        "El ayudante no puede ser la misma persona que el Encargado",
                      ],
                    },
                  ]);
                } else {
                  form.setFields([
                    {
                      name: "assistant",
                      errors: [],
                    },
                  ]);
                }
              }
            }}
          >
            <Form.Item
              name="date"
              label="Fecha"
              rules={[
                { required: true, message: "Por favor, seleccione la fecha" },
              ]}
            >
              <DatePicker format="DD-MM-YYYY" />
            </Form.Item>
            <Form.Item
              name="intervention_number"
              label="Intervención núm."
              rules={[
                {
                  required: true,
                  message: "Por favor, ingrese el número de intervención",
                },
              ]}
            >
              <Radio.Group
                onChange={(e) => setInterventionNumber(e.target.value)}
                options={[
                  {
                    value: 3,
                    label: <span className="text-xl"> 3️⃣</span>,
                  },
                  {
                    value: 4,
                    label: <span className="text-xl"> 4️⃣</span>,
                  },
                  {
                    value: 5,
                    label: <span className="text-xl"> 5️⃣</span>,
                  },
                  {
                    value: 6,
                    label: <span className="text-xl"> 6️⃣</span>,
                  },
                  {
                    value: 7,
                    label: <span className="text-xl"> 7️⃣</span>,
                  },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="manager"
              label="Nombre"
              rules={[
                { required: true, message: "Por favor, ingrese el nombre" },
              ]}
            >
              <SelectMiembrosCongregacion />
            </Form.Item>
            {interventionNumber !== 3 && (
              <Form.Item
                name="assistant"
                label="Ayudante"
              >
                <SelectMiembrosCongregacion />
              </Form.Item>
            )}

            <Form.Item
              name="presentation_location"
              label="Se presentará en"
              rules={[
                {
                  required: true,
                  message:
                    "Por favor, seleccione la ubicación de la presentación",
                },
              ]}
            >
              <Radio.Group>
                <Radio value="main_hall">Sala principal</Radio>
                <Radio value="auxiliary_hall">Sala auxiliar</Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">
                {editingAssignment ? "Guardar Cambios" : "Agregar Asignación"}
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      )}
    </>
  );

  const statusColors: Record<string, string> = {
    draft: "default",
    ready: "green",
    published: "blue",
  };

  const steps = [
    { title: "Contenido" },
    { title: "Tesoros (1-3)" },
    { title: "Maestros (4-7)" },
    { title: "Vida cristiana (8-10)" },
  ];

  const vmContent = (
    <div className="escuela-s140">
      <div className="escuela-s140__header">
        <div>
          <Typography.Title level={4} className="escuela-s140__title">
            Vida y Ministerio - S-140
          </Typography.Title>
          <Typography.Text type="secondary">
            Pega el texto semanal, asigna responsables y genera el S-140.
          </Typography.Text>
        </div>
        <Space wrap>
          <Button onClick={loadVmBase} disabled={vmLoading}>
            Recargar
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExportDocx}
            loading={exportingDocx}
            disabled={!selectedWeekId}
          >
            Descargar S-140
          </Button>
        </Space>
      </div>

      <Form
        form={settingsForm}
        layout="vertical"
        onFinish={handleSaveSettings}
        className="escuela-config-form"
      >
        <div className="escuela-card-grid">
          <Card className="escuela-card">
            <Typography.Title level={5} className="escuela-card__title">
              Configuración de congregación
            </Typography.Title>
            <Typography.Text type="secondary">
              Define la congregación y el día de reunión.
            </Typography.Text>

            <Divider />

            <div className="escuela-grid escuela-grid--two">
              <Form.Item
                name="congregationName"
                label="Congregación"
                rules={[{ required: true, message: "Ingresa el nombre." }]}
              >
                <Input
                  placeholder="Nombre de la congregación"
                  disabled={isReadOnly}
                />
              </Form.Item>
              <Form.Item
                name="meetingDay"
                label="Día de reunión"
                rules={[{ required: true, message: "Selecciona un día." }]}
              >
                <Select
                  placeholder="Selecciona un día"
                  disabled={isReadOnly}
                  options={[
                    { value: "monday", label: "Lunes" },
                    { value: "tuesday", label: "Martes" },
                    { value: "wednesday", label: "Miércoles" },
                    { value: "thursday", label: "Jueves" },
                    { value: "friday", label: "Viernes" },
                    { value: "saturday", label: "Sábado" },
                    { value: "sunday", label: "Domingo" },
                  ]}
                />
              </Form.Item>
            </div>

            <Divider />
            <div>
              <Typography.Text strong>Plantilla actual:</Typography.Text>
              <div className="escuela-template__name">
                {vmSettings?.docTemplate?.name ? (
                  <Tag color="green">{vmSettings.docTemplate.name}</Tag>
                ) : (
                  <Tag color="default">Sin plantilla cargada</Tag>
                )}
              </div>
            </div>
          </Card>

          <Card className="escuela-card">
            <Flex align="center" justify="space-between" wrap="wrap" gap={12}>
              <div>
                <Typography.Title level={5} className="escuela-card__title">
                  Plantilla y salas
                </Typography.Title>
                <Typography.Text type="secondary">
                  Carga la plantilla S-140 y define las salas por defecto.
                </Typography.Text>
              </div>
              <Button
                type="primary"
                ghost
                onClick={handleUploadTemplate}
                loading={uploadingTemplate}
                disabled={isReadOnly}
              >
                Subir plantilla S-140
              </Button>
            </Flex>

            <Divider />

            <Form.Item name="defaultRooms" label="Salas por defecto">
              <Select
                mode="multiple"
                placeholder="Salas"
                disabled={isReadOnly}
                options={[
                  { value: "MAIN", label: "Sala principal" },
                  { value: "AUX", label: "Sala auxiliar" },
                ]}
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" disabled={isReadOnly}>
                Guardar configuración
              </Button>
            </Form.Item>

            <Typography.Text type="secondary">
              Se usará el archivo del proyecto: S-140_S.docx
            </Typography.Text>
          </Card>
        </div>
      </Form>

      <Card className="escuela-card">
        <Flex align="center" justify="space-between" wrap="wrap" gap={12}>
          <div>
            <Typography.Title level={5} className="escuela-card__title">
              Semana
            </Typography.Title>
            <Typography.Text type="secondary">
              Selecciona o crea la semana de trabajo.
            </Typography.Text>
          </div>
          <Space>
            <Button
              type="primary"
              onClick={() => openWeekModal(null)}
              disabled={isReadOnly}
            >
              Nueva semana
            </Button>
            <Button
              onClick={() => openWeekModal(selectedWeek)}
              disabled={isReadOnly || !selectedWeek}
            >
              Editar semana
            </Button>
          </Space>
        </Flex>

        <Divider />

        <Flex wrap="wrap" gap={12} align="center">
          <Select
            style={{ minWidth: 280 }}
            placeholder="Selecciona una semana"
            value={selectedWeekId ?? undefined}
            onChange={(value) => setSelectedWeekId(value)}
            loading={vmLoading}
            options={vmWeeks.map((week) => ({
              label: `${week.weekStart ?? "?"} - ${week.weekEnd ?? "?"}`,
              value: week.documentId ?? week.id,
            }))}
          />
          {selectedWeek?.status && (
            <Tag color={statusColors[selectedWeek.status] || "default"}>
              {selectedWeek.status}
            </Tag>
          )}
          {selectedWeek?.congregationName && (
            <Tag color="blue">{selectedWeek.congregationName}</Tag>
          )}
        </Flex>
      </Card>

      <Steps
        current={s140Step}
        onChange={(index) => setS140Step(index)}
        items={steps}
        className="escuela-steps"
      />

      {selectedWeek ? (
        <>
          {s140Step === 0 && (
            <>
              <Card className="escuela-card">
                <Typography.Title level={5} className="escuela-card__title">
                  Entrada de contenido
                </Typography.Title>
                <Typography.Text type="secondary">
                  Importa una semana específica desde wol.jw.org o pega el texto
                  manualmente.
                </Typography.Text>

                <Flex vertical gap={12} className="escuela-textarea">
                  <Input
                    value={sourceUrl}
                    onChange={(event) => setSourceUrl(event.target.value)}
                    placeholder="https://wol.jw.org/es/wol/d/r4/lp-s/202026087"
                    disabled={isReadOnly}
                  />
                  <Flex justify="flex-end">
                    <Button
                      onClick={handleImportWeekFromUrl}
                      loading={importingWeekFromUrl}
                      disabled={isReadOnly}
                    >
                      Importar desde URL
                    </Button>
                  </Flex>

                  <Input.TextArea
                    rows={6}
                    value={sourceText}
                    onChange={(event) => setSourceText(event.target.value)}
                    placeholder="Pega aquí el texto de la semana..."
                    disabled={isReadOnly}
                  />
                </Flex>

                <Flex justify="flex-end">
                  <Button
                    type="primary"
                    onClick={handleParseWeek}
                    loading={parsingWeek}
                    disabled={isReadOnly}
                  >
                    Interpretar / Parsear
                  </Button>
                </Flex>
              </Card>

              <Card className="escuela-card">
                <Flex
                  align="center"
                  justify="space-between"
                  wrap="wrap"
                  gap={12}
                >
                  <Typography.Title level={5} className="escuela-card__title">
                    Agenda detectada
                  </Typography.Title>
                  {selectedWeek?.parsed && <Tag color="green">Listo</Tag>}
                </Flex>

                {selectedWeek?.parsed ? (
                  <div className="escuela-parsed">
                    <div className="escuela-parsed__meta">
                      <div>
                        <span className="escuela-parsed__label">Semana</span>
                        <strong>
                          {selectedWeek.parsed?.dateLabel ?? "Sin etiqueta"}
                        </strong>
                      </div>
                      <div>
                        <span className="escuela-parsed__label">
                          Lectura bíblica
                        </span>
                        <strong>
                          {selectedWeek.parsed?.bibleReading ?? "N/A"}
                        </strong>
                      </div>
                      <div>
                        <span className="escuela-parsed__label">Canciones</span>
                        <strong>
                          {selectedWeek.parsed?.songs?.open ?? "-"} /{" "}
                          {selectedWeek.parsed?.songs?.middle ?? "-"} /{" "}
                          {selectedWeek.parsed?.songs?.close ?? "-"}
                        </strong>
                      </div>
                    </div>

                    <div className="escuela-parsed__parts">
                      {Array.from({ length: 10 }).map((_, index) => {
                        const order = index + 1;
                        const part =
                          parsedParts.find((item) => item.order === order) ??
                          {};
                        return (
                          <div key={order} className="escuela-part">
                            <div className="escuela-part__header">
                              <span>Parte {order}</span>
                              <span>{part.minutes ?? "-"} min</span>
                            </div>
                            <div className="escuela-part__title">
                              {part.title ?? "Sin título"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <Empty description="Aún no se ha interpretado la semana." />
                )}
              </Card>
            </>
          )}

          {s140Step > 0 && (
            <Card className="escuela-card">
              <Flex align="center" justify="space-between" wrap="wrap" gap={12}>
                <Typography.Title level={5} className="escuela-card__title">
                  Asignaciones
                </Typography.Title>
              </Flex>
              <Typography.Text type="secondary">
                Selección agrupada por categorías: Ancianos, Siervo Ministerial,
                Publicadores y Hermanas. (Se excluyen los no bautizados).
              </Typography.Text>

              {s140Step === 1 && (
                <>
                  <Divider>Roles generales</Divider>
                  <div className="escuela-grid escuela-grid--three">
                    {vmRolesList.map((role) => {
                      const assignment = findAssignment(
                        (entry) => entry.role === role && entry.partOrder === 0,
                      );
                      const selectedValue =
                        draftAssignments[draftKeyForRole(role)]?.[0] ??
                        resolveMemberIdsFromAssignment(assignment)[0];
                      return (
                        <div key={role}>
                          <Typography.Text className="escuela-label">
                            {vmRoleLabels[role] ?? role}
                          </Typography.Text>
                          <Select
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            placeholder="Selecciona una persona"
                            value={selectedValue}
                            disabled={isReadOnly}
                            options={groupedMaleOptions}
                            dropdownStyle={{ minWidth: 300 }}
                            style={{ width: "100%" }}
                            onChange={(value) =>
                              handleRoleAssignmentChange(
                                role,
                                value ? [value] : [],
                              )
                            }
                            filterOption={(input, option) =>
                              String(option?.label ?? "")
                                .toLowerCase()
                                .includes(input.toLowerCase())
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              <Divider>
                {s140Step === 1
                  ? "Partes 1-3"
                  : s140Step === 2
                  ? "Partes 4-7"
                  : "Partes 8-10"}
              </Divider>

              <div className="escuela-parts-grid">
                {Array.from({ length: 10 }).map((_, index) => {
                  const order = index + 1;
                  const inRange =
                    (s140Step === 1 && order <= 3) ||
                    (s140Step === 2 && order >= 4 && order <= 7) ||
                    (s140Step === 3 && order >= 8);
                  if (!inRange) return null;

                  const part =
                    parsedParts.find((item) => item.order === order) ?? {};
                  const mainAssignment = findEffectiveAssignment(
                    (entry) =>
                      entry.partOrder === order && entry.room === "MAIN",
                  );
                  const auxAssignment = findEffectiveAssignment(
                    (entry) =>
                      entry.partOrder === order && entry.room === "AUX",
                  );
                  const mainValue =
                    draftAssignments[draftKeyForPart(order, "MAIN")] ??
                    resolveMemberIdsFromAssignment(mainAssignment);
                  const auxValue =
                    draftAssignments[draftKeyForPart(order, "AUX")] ??
                    resolveMemberIdsFromAssignment(auxAssignment);
                  const optionsForPart =
                    order === 1 || order === 2
                      ? groupedLeadershipOptions
                      : order === 3
                      ? groupedMaleOptions
                      : order >= 4 && order <= 7
                      ? groupedMixedOptions
                      : groupedLeadershipOptions;
                  const mainOptions = buildOptionsWithAssignment(
                    optionsForPart,
                    mainAssignment,
                  );
                  const auxOptions = buildOptionsWithAssignment(
                    optionsForPart,
                    auxAssignment,
                  );

                  return (
                    <div key={order} className="escuela-part-row">
                      <div className="escuela-part-row__info">
                        <strong>Parte {order}</strong>
                        <span>{part.title ?? "Sin título"}</span>
                        <small>{part.minutes ?? "-"} min</small>
                      </div>
                      <div className="escuela-part-row__selects">
                        <div>
                          <Typography.Text className="escuela-label">
                            Sala principal
                          </Typography.Text>
                          <Select
                            mode="multiple"
                            showSearch
                            optionFilterProp="label"
                            placeholder="Selecciona responsables"
                            value={mainValue}
                            disabled={isReadOnly}
                            options={mainOptions}
                            dropdownStyle={{ minWidth: 320 }}
                            style={{ width: "100%" }}
                            onChange={(values) =>
                              handlePartAssignmentChange(
                                order,
                                "MAIN",
                                values as number[],
                              )
                            }
                            filterOption={(input, option) =>
                              String(option?.label ?? "")
                                .toLowerCase()
                                .includes(input.toLowerCase())
                            }
                          />
                        </div>
                        <div>
                          <Typography.Text className="escuela-label">
                            Sala auxiliar
                          </Typography.Text>
                          <Select
                            mode="multiple"
                            showSearch
                            optionFilterProp="label"
                            placeholder="Selecciona responsables"
                            value={auxValue}
                            disabled={isReadOnly}
                            options={auxOptions}
                            dropdownStyle={{ minWidth: 320 }}
                            style={{ width: "100%" }}
                            onChange={(values) =>
                              handlePartAssignmentChange(
                                order,
                                "AUX",
                                values as number[],
                              )
                            }
                            filterOption={(input, option) =>
                              String(option?.label ?? "")
                                .toLowerCase()
                                .includes(input.toLowerCase())
                            }
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {s140Step === 3 && <Divider />}

              {s140Step === 3 && (
                <Flex
                  align="center"
                  justify="space-between"
                  wrap="wrap"
                  gap={12}
                >
                  <div>
                    <Typography.Title level={5} className="escuela-card__title">
                      Exportar S-140
                    </Typography.Title>
                    <Typography.Text type="secondary">
                      Descarga el documento final con la plantilla configurada.
                    </Typography.Text>
                  </div>
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    onClick={handleExportDocx}
                    loading={exportingDocx}
                  >
                    Descargar S-140
                  </Button>
                </Flex>
              )}
            </Card>
          )}

          <Flex
            justify="space-between"
            align="center"
            className="escuela-step-nav"
          >
            <Button
              disabled={s140Step === 0}
              onClick={() => setS140Step((prev) => Math.max(prev - 1, 0))}
            >
              Anterior
            </Button>
            <Button
              type="primary"
              disabled={s140Step === steps.length - 1}
              onClick={() =>
                setS140Step((prev) => Math.min(prev + 1, steps.length - 1))
              }
            >
              Siguiente
            </Button>
          </Flex>
        </>
      ) : (
        <Card className="escuela-card">
          <Empty description="Crea o selecciona una semana para continuar." />
        </Card>
      )}
    </div>
  );

  return (
    <div className="escuela-page">
      <Tabs
        className="escuela-tabs"
        items={[
          {
            key: "asignaciones",
            label: "Asignaciones",
            children: assignmentsContent,
          },
          {
            key: "s140",
            label: "S-140",
            children: vmContent,
          },
          {
            key: "historial",
            label: "Historial",
            children: (
              <Card>
                <Flex
                  justify="space-between"
                  align={isSmallScreen ? "flex-start" : "center"}
                  vertical={isSmallScreen}
                  gap={12}
                  className="mb-4"
                >
                  <div>
                    <Typography.Title level={4} style={{ margin: 0 }}>
                      Historial de Asignaciones
                    </Typography.Title>
                    <Typography.Text type="secondary">
                      Controla qué intervenciones ya presentó cada integrante y
                      su avance del ciclo.
                    </Typography.Text>
                  </div>
                  <Space
                    direction={isSmallScreen ? "vertical" : "horizontal"}
                    size={12}
                    style={{ width: isSmallScreen ? "100%" : "auto" }}
                  >
                    <Input
                      allowClear
                      value={historySearch}
                      onChange={(event) => setHistorySearch(event.target.value)}
                      placeholder="Buscar miembro"
                      style={{ width: isSmallScreen ? "100%" : 260 }}
                    />
                    <Tag color="geekblue">
                      {groupedHistory.reduce(
                        (total, group) => total + group.rows.length,
                        0,
                      )}{" "}
                      integrantes
                    </Tag>
                  </Space>
                </Flex>

                <Collapse
                  defaultActiveKey={groupedHistory.map(
                    (group) => group.groupName,
                  )}
                  items={groupedHistory.map((group) => ({
                    key: group.groupName,
                    label: (
                      <Space>
                        <Typography.Text strong>
                          {group.groupName}
                        </Typography.Text>
                        <Tag color="blue">{group.rows.length} integrantes</Tag>
                      </Space>
                    ),
                    children: (
                      <Table
                        rowKey="id"
                        columns={historyColumns}
                        dataSource={group.rows}
                        scroll={{ x: 1280 }}
                        pagination={{ pageSize: 20, showSizeChanger: false }}
                        expandable={{
                          expandedRowRender: renderMaleAssignmentsHistory,
                          rowExpandable: (record) =>
                            record.maleAssignmentsCount > 0,
                        }}
                      />
                    ),
                  }))}
                />
              </Card>
            ),
          },
        ]}
      />

      <Drawer
        title={
          selectedHistoryParticipant?.fullName ?? "Detalle de asignaciones"
        }
        placement="right"
        width={isSmallScreen ? "100%" : 660}
        open={Boolean(selectedHistoryParticipant)}
        onClose={() => setSelectedHistoryParticipant(null)}
      >
        {selectedHistoryParticipant && (
          <Flex vertical gap={16}>
            <div className="escuela-history-drawer__summary">
              <div>
                <Typography.Text className="escuela-label">
                  Progreso del ciclo
                </Typography.Text>
                <Progress
                  percent={selectedHistoryParticipant.progress}
                  size="small"
                />
              </div>
              <Space wrap size={[8, 8]}>
                <Tag color="blue">
                  {selectedHistoryParticipant.completedCount} de 5
                  intervenciones
                </Tag>
                <Tag color="default">
                  Última fecha:{" "}
                  {selectedHistoryParticipant.lastAssignmentDate ??
                    "Sin asignaciones"}
                </Tag>
              </Space>
            </div>

            <div className="escuela-history-drawer__timeline">
              <Typography.Title level={5} style={{ margin: 0 }}>
                Línea de tiempo
              </Typography.Title>
              <Typography.Text type="secondary">
                Fecha, intervención o privilegio, acompañante y sala cuando
                aplique.
              </Typography.Text>

              {selectedHistoryTimeline.length ? (
                <Timeline
                  items={selectedHistoryTimeline.map((item) => ({
                    color: item.color,
                    children: (
                      <div className="escuela-history-timeline-card">
                        <Space wrap size={[8, 8]}>
                          {item.tags.map((tag) => (
                            <Tag key={`${item.key}-${tag}`} color="processing">
                              {tag}
                            </Tag>
                          ))}
                        </Space>
                        <Typography.Text strong>{item.title}</Typography.Text>
                        <Typography.Text>{item.primaryText}</Typography.Text>
                        <Typography.Text type="secondary">
                          {item.secondaryText}
                        </Typography.Text>
                      </div>
                    ),
                  }))}
                />
              ) : (
                <Empty description="No hay asignaciones registradas para este participante." />
              )}
            </div>
          </Flex>
        )}
      </Drawer>

      <Modal
        title={weekForm.getFieldValue("id") ? "Editar semana" : "Nueva semana"}
        open={weekModalOpen}
        onCancel={() => setWeekModalOpen(false)}
        footer={null}
      >
        <Form form={weekForm} layout="vertical" onFinish={handleSaveWeek}>
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
          <Form.Item
            name="congregationName"
            label="Congregación"
            rules={[{ required: true, message: "Ingresa la congregación." }]}
          >
            <Input disabled={isReadOnly} />
          </Form.Item>
          <Form.Item
            name="weekStart"
            label="Inicio de semana"
            rules={[
              { required: true, message: "Selecciona la fecha de inicio." },
            ]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="weekEnd"
            label="Fin de semana"
            rules={[{ required: true, message: "Selecciona la fecha de fin." }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="sourceUrl" label="URL oficial (WOL)">
            <Input
              placeholder="https://wol.jw.org/es/wol/d/r4/lp-s/202026087"
              disabled={isReadOnly}
            />
          </Form.Item>
          <Form.Item name="status" label="Estado">
            <Select
              options={[
                { value: "draft", label: "Borrador" },
                { value: "ready", label: "Listo" },
                { value: "published", label: "Publicado" },
              ]}
            />
          </Form.Item>
          <Form.Item name="notes" label="Notas">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" disabled={isReadOnly}>
              Guardar semana
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
