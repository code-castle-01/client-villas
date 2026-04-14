import {
  CalendarOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileTextOutlined,
  IdcardOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { List } from "@refinedev/antd";
import {
  Button,
  Checkbox,
  DatePicker,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Spin,
  Space,
  Table,
  Tag,
  Timeline,
  Tooltip,
  Typography,
  message,
} from "antd";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/es";
import React, { useEffect, useMemo, useState } from "react";
import SelectSiervos from "../../components/select-siervos";
import {
  S21MonthRow,
  S21PdfData,
  S21PdfDownloadButton,
  S4PdfData,
  S4PdfDownloadButton,
} from "../../components/PastoreoPublisherFormsPDF";
import {
  api,
  createEntry,
  getCollection,
  updateEntry,
} from "../../api/client";
import useMediaQuery from "../../hooks/useMediaQuery";
import { useIsAdminApp } from "../../hooks/useIsAdminApp";
import "./styles.css";

dayjs.locale("es");

type MemberSummary = {
  id: number;
  nombre: string;
};

interface VisitRecord {
  id: number;
  documentId?: string;
  miembroId: number;
  miembro: string;
  fecha: string;
  tema: string;
  acompananteId?: number;
  acompanante: string;
  completada: boolean;
  tipoRegistro: "visita" | "s4";
  mesServicio?: string;
  participoMinisterio: boolean;
  cursosBiblicos: number;
  horas: string;
  comentarios: string;
  precursorAuxiliar: boolean;
}

interface Grupo {
  id: number;
  nombre: string;
  miembros: MemberSummary[];
  superintendenteNombre?: string;
  auxiliarNombre?: string;
}

type GrupoBase = Omit<Grupo, "miembros">;

type RawRelation =
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

type RawVisita = {
  id: number;
  documentId?: string;
  miembro?: RawRelation;
  acompanante?: RawRelation;
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
};

type RawMember = {
  id: number;
  nombre: string;
  fechaNacimiento?: string;
  fechaInmersion?: string;
  genero?: "hombre" | "mujer";
  nombramientos?: unknown;
  grupos?: RawGroupRelation;
};

type MemberDetail = {
  id: number;
  nombre: string;
  fechaNacimiento?: string;
  fechaInmersion?: string;
  genero?: "hombre" | "mujer";
  nombramientos: string[];
  grupos: Array<{ id: number; nombre: string }>;
};

type S21SummaryRecord = {
  id: number;
  tipoRegistro: "s4";
  mesServicio?: string | null;
  participoMinisterio?: boolean;
  cursosBiblicos?: number;
  horas?: string;
  comentarios?: string;
  precursorAuxiliar?: boolean;
};

type S21SummaryResponse = {
  member: RawMember | null;
  s4Records: S21SummaryRecord[];
};

type S4FormValues = {
  participoMinisterio?: boolean;
  cursosBiblicos?: number;
  horas?: string;
  comentarios?: string;
  precursorAuxiliar?: boolean;
};

const serviceMonthOrder = [
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
] as const;

const hasNestedRelation = (
  relation?: RawRelation
): relation is { data?: { id?: number; attributes?: { nombre?: string } } } =>
  Boolean(relation && typeof relation === "object" && "data" in relation);

const getRelationId = (relation?: RawRelation) => {
  if (typeof relation === "number") {
    return relation;
  }

  return hasNestedRelation(relation) ? (relation.data?.id ?? 0) : (relation?.id ?? 0);
};

const getRelationName = (relation: RawRelation, fallback: string) => {
  if (typeof relation === "number") {
    return fallback;
  }

  if (hasNestedRelation(relation)) {
    return relation.data?.attributes?.nombre ?? fallback;
  }

  return relation?.nombre ?? fallback;
};

const getRelationArrayName = (
  relation:
    | { id: number; attributes?: { nombre?: string } }
    | { id: number; nombre?: string }
) =>
  "attributes" in relation
    ? relation.attributes?.nombre ?? ""
    : (relation as { id: number; nombre?: string }).nombre ?? "";

const mapVisita = (visita: RawVisita): VisitRecord => ({
  id: visita.id,
  documentId: visita.documentId,
  miembroId: getRelationId(visita.miembro),
  miembro: getRelationName(visita.miembro, "Sin miembro"),
  fecha: visita.fecha,
  tema: visita.tema ?? "",
  acompananteId: getRelationId(visita.acompanante) || undefined,
  acompanante: getRelationName(visita.acompanante, "Sin acompañante"),
  completada: Boolean(visita.completada),
  tipoRegistro:
    String(visita.tipoRegistro ?? "visita").toLowerCase() === "s4"
      ? "s4"
      : "visita",
  mesServicio: visita.mesServicio ?? undefined,
  participoMinisterio: Boolean(visita.participoMinisterio),
  cursosBiblicos:
    typeof visita.cursosBiblicos === "number" ? visita.cursosBiblicos : 0,
  horas: visita.horas ?? "",
  comentarios: visita.comentarios ?? "",
  precursorAuxiliar: Boolean(visita.precursorAuxiliar),
});

const mapS21SummaryRecord = (
  record: S21SummaryRecord,
  member: MemberSummary
): VisitRecord => ({
  id: record.id,
  miembroId: member.id,
  miembro: member.nombre,
  fecha: record.mesServicio ?? "",
  tema: "",
  acompanante: "",
  completada: true,
  tipoRegistro: "s4",
  mesServicio: record.mesServicio ?? undefined,
  participoMinisterio: Boolean(record.participoMinisterio),
  cursosBiblicos:
    typeof record.cursosBiblicos === "number" ? record.cursosBiblicos : 0,
  horas: record.horas ?? "",
  comentarios: record.comentarios ?? "",
  precursorAuxiliar: Boolean(record.precursorAuxiliar),
});

const mapMemberDetail = (member: RawMember): MemberDetail => ({
  id: member.id,
  nombre: member.nombre,
  fechaNacimiento: member.fechaNacimiento,
  fechaInmersion: member.fechaInmersion,
  genero: member.genero,
  nombramientos: Array.isArray(member.nombramientos)
    ? member.nombramientos.filter((value): value is string => typeof value === "string")
    : [],
  grupos: ((member.grupos as { data?: Array<{ id: number; attributes?: { nombre?: string } }> })
    ?.data ??
    (member.grupos as Array<{ id: number; nombre?: string }>) ??
    []
  ).map((grupo) => ({
    id: grupo.id,
    nombre: getRelationArrayName(grupo),
  })),
});

const formatDisplayDate = (value?: string) =>
  value ? dayjs(value).format("DD-MM-YYYY") : "No registrada";

const formatMonthLabel = (value?: string) =>
  value ? dayjs(value).locale("es").format("MMMM YYYY") : "";

const getCurrentServiceYear = (baseDate = dayjs()) =>
  baseDate.month() >= 8 ? baseDate.year() : baseDate.year() - 1;

const formatServiceYearLabel = (serviceYear: number) =>
  `${serviceYear}-${serviceYear + 1}`;

const getServiceYearMonthDate = (serviceYear: number, index: number) => {
  const targetMonth = (8 + index) % 12;
  const targetYear = targetMonth >= 8 ? serviceYear : serviceYear + 1;
  return dayjs(`${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-01`);
};

const parseHoursToNumber = (value?: string) => {
  if (!value) return 0;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

const isS4Record = (item: VisitRecord) =>
  item.tipoRegistro === "s4" ||
  Boolean(item.mesServicio) ||
  item.participoMinisterio ||
  item.cursosBiblicos > 0 ||
  Boolean(item.horas) ||
  Boolean(item.comentarios) ||
  item.precursorAuxiliar;

const normalizeFileSegment = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

const getMemberAppointments = (member?: MemberDetail | null) =>
  member?.nombramientos ?? [];

export const MiembrosList: React.FC = () => {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [miembroDetalles, setMiembroDetalles] = useState<Record<number, MemberDetail>>({});
  const [busquedaNombre, setBusquedaNombre] = useState<string>("");
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<number | null>(null);
  const [visibleVisitaModal, setVisibleVisitaModal] = useState(false);
  const [visitas, setVisitas] = useState<VisitRecord[]>([]);
  const [reportesS4, setReportesS4] = useState<VisitRecord[]>([]);
  const [visibleHistorialModal, setVisibleHistorialModal] = useState(false);
  const [historialVisitas, setHistorialVisitas] = useState<VisitRecord[]>([]);
  const [filtroVisita, setFiltroVisita] = useState<
    "todas" | "pendientes" | "realizadas"
  >("todas");
  const [miembroSeleccionado, setMiembroSeleccionado] = useState<MemberSummary | null>(
    null
  );
  const [visibleS4Modal, setVisibleS4Modal] = useState(false);
  const [visibleS21Modal, setVisibleS21Modal] = useState(false);
  const [s21Loading, setS21Loading] = useState(false);
  const [s21MemberDetails, setS21MemberDetails] = useState<MemberDetail | null>(null);
  const [s21Reports, setS21Reports] = useState<VisitRecord[]>([]);
  const [s4Month, setS4Month] = useState(dayjs().startOf("month"));
  const [serviceYearSelected, setServiceYearSelected] = useState(
    getCurrentServiceYear()
  );

  const [visitaForm] = Form.useForm();
  const [s4Form] = Form.useForm<S4FormValues>();

  const isSmallScreen = useMediaQuery("(max-width: 768px)");
  const isAdminApp = useIsAdminApp();
  const isReadOnly = !isAdminApp;

  const loadGrupos = async () => {
    const data = await getCollection<{
      nombre: string;
      superintendente?: RawRelation;
      auxiliar?: RawRelation;
    }>("grupos", {
      populate: ["superintendente", "auxiliar"],
      "pagination[pageSize]": 1000,
    });

    return data.map((grupo) => ({
      id: grupo.id,
      nombre: grupo.nombre,
      superintendenteNombre: getRelationName(grupo.superintendente, "N/A"),
      auxiliarNombre: getRelationName(grupo.auxiliar, "N/A"),
    }));
  };

  const buildGroupsFromMembers = (
    baseGroups: GrupoBase[],
    memberMap: Record<number, MemberDetail>,
  ): Grupo[] => {
    const members = Object.values(memberMap);

    return baseGroups.map((group) => ({
      ...group,
      miembros: members
        .filter((member) => member.grupos.some((linkedGroup) => linkedGroup.id === group.id))
        .map((member) => ({
          id: member.id,
          nombre: member.nombre,
        })),
    }));
  };

  const loadMiembroDetalles = async () => {
    const data = await getCollection<RawMember>("miembros", {
      populate: "grupos",
      "pagination[pageSize]": 1000,
    });

    const nextMap: Record<number, MemberDetail> = {};
    data.forEach((member) => {
      nextMap[member.id] = mapMemberDetail(member);
    });
    return nextMap;
  };

  const refreshRegistros = async () => {
    const data = await getCollection<RawVisita>("visitas", {
      populate: ["miembro", "acompanante"],
      "pagination[pageSize]": 1000,
    });
    const mapped = data.map(mapVisita);
    setVisitas(mapped.filter((item) => !isS4Record(item)));
    setReportesS4(mapped.filter((item) => isS4Record(item)));
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [gruposData, miembroData] = await Promise.all([
        loadGrupos(),
        loadMiembroDetalles(),
      ]);

      if (!mounted) return;
      setGrupos(buildGroupsFromMembers(gruposData, miembroData));
      setMiembroDetalles(miembroData);
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const data = await getCollection<RawVisita>("visitas", {
        populate: ["miembro", "acompanante"],
        "pagination[pageSize]": 1000,
      });

      if (!mounted) return;
      const mapped = data.map(mapVisita);
      setVisitas(mapped.filter((item) => !isS4Record(item)));
      setReportesS4(mapped.filter((item) => isS4Record(item)));
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const latestVisitByMember = useMemo(() => {
    const latestMap = new Map<number, VisitRecord>();

    visitas.forEach((visita) => {
      const current = latestMap.get(visita.miembroId);
      if (!current || visita.fecha > current.fecha) {
        latestMap.set(visita.miembroId, visita);
      }
    });

    return latestMap;
  }, [visitas]);

  const selectedMemberDetails = visibleS21Modal
    ? s21MemberDetails
    : miembroSeleccionado
      ? miembroDetalles[miembroSeleccionado.id] ?? null
      : null;

  const serviceYearOptions = useMemo(() => {
    const values = new Set<number>([getCurrentServiceYear()]);

    const sourceReports = visibleS21Modal ? s21Reports : reportesS4;

    sourceReports.forEach((reporte) => {
      const monthRef = dayjs(reporte.mesServicio ?? reporte.fecha);
      if (monthRef.isValid()) {
        values.add(getCurrentServiceYear(monthRef));
      }
    });

    return Array.from(values)
      .sort((a, b) => b - a)
      .map((value) => ({
        label: formatServiceYearLabel(value),
        value,
      }));
  }, [reportesS4, s21Reports, visibleS21Modal]);

  const hydrateS4Form = (memberId: number, monthValue: Dayjs) => {
    const targetMonth = monthValue.startOf("month").format("YYYY-MM");
    const existing = reportesS4
      .filter(
        (reporte) =>
          reporte.miembroId === memberId &&
          dayjs(reporte.mesServicio ?? reporte.fecha).format("YYYY-MM") ===
            targetMonth
      )
      .sort((a, b) => b.id - a.id)[0];

    s4Form.setFieldsValue({
      participoMinisterio: existing?.participoMinisterio ?? false,
      cursosBiblicos: existing?.cursosBiblicos ?? 0,
      horas: existing?.horas ?? "",
      comentarios: existing?.comentarios ?? "",
      precursorAuxiliar: existing?.precursorAuxiliar ?? false,
    });
  };

  const openS4Modal = (member: MemberSummary) => {
    const monthValue = dayjs().startOf("month");
    setMiembroSeleccionado(member);
    setS4Month(monthValue);
    hydrateS4Form(member.id, monthValue);
    setVisibleS4Modal(true);
  };

  const openS21Modal = async (member: MemberSummary) => {
    setMiembroSeleccionado(member);
    setServiceYearSelected(getCurrentServiceYear());
    setS21MemberDetails(null);
    setS21Reports([]);
    setVisibleS21Modal(true);

    try {
      setS21Loading(true);

      const { data } = await api.get<{ data: S21SummaryResponse }>(
        `/visitas/s21-summary/${member.id}`
      );

      const fetchedMember = data?.data?.member
        ? mapMemberDetail(data.data.member)
        : miembroDetalles[member.id] ?? null;
      const fetchedReports = (data?.data?.s4Records ?? [])
        .map((record) => mapS21SummaryRecord(record, member))
        .filter(isS4Record);

      if (fetchedMember) {
        setMiembroDetalles((current) => ({
          ...current,
          [member.id]: fetchedMember,
        }));
      }

      setS21MemberDetails(fetchedMember);
      setS21Reports(fetchedReports);
    } catch (error: any) {
      const detail =
        error?.response?.data?.error?.message ||
        error?.message ||
        "No se pudo cargar el registro S-21.";
      message.error(detail);
    } finally {
      setS21Loading(false);
    }
  };

  const handleAgregarVisita = async (values: {
    fecha: Dayjs;
    acompanante?: number;
    tema?: string;
    completada?: boolean;
  }) => {
    if (isReadOnly || !miembroSeleccionado) return;

    try {
      await createEntry<VisitRecord>("visitas", {
        miembro: miembroSeleccionado.id,
        fecha: values.fecha.format("YYYY-MM-DD"),
        tema: values.tema,
        acompanante: values.acompanante ?? null,
        completada: values.completada || false,
        tipoRegistro: "visita",
      });
      await refreshRegistros();
      visitaForm.resetFields();
      setVisibleVisitaModal(false);
      setMiembroSeleccionado(null);
      message.success("Visita registrada correctamente.");
    } catch (error: any) {
      const detail =
        error?.response?.data?.error?.message ||
        error?.message ||
        "No se pudo registrar la visita.";
      message.error(detail);
    }
  };

  const handleGuardarS4 = async (values: S4FormValues) => {
    if (isReadOnly || !miembroSeleccionado) return;

    const reportMonth = s4Month.startOf("month");
    const existing = reportesS4
      .filter(
        (reporte) =>
          reporte.miembroId === miembroSeleccionado.id &&
          dayjs(reporte.mesServicio ?? reporte.fecha).format("YYYY-MM") ===
            reportMonth.format("YYYY-MM")
      )
      .sort((a, b) => b.id - a.id)[0];

    const payload = {
      miembro: miembroSeleccionado.id,
      fecha: reportMonth.format("YYYY-MM-DD"),
      mesServicio: reportMonth.format("YYYY-MM-DD"),
      tipoRegistro: "s4",
      participoMinisterio: values.participoMinisterio ?? false,
      cursosBiblicos: values.cursosBiblicos ?? 0,
      horas: values.horas?.trim() ?? "",
      comentarios: values.comentarios?.trim() ?? "",
      precursorAuxiliar: values.precursorAuxiliar ?? false,
      tema: "",
      acompanante: null,
      completada: true,
    };

    try {
      if (existing) {
        await updateEntry("visitas", existing.id, payload);
      } else {
        await createEntry("visitas", payload);
      }
      await refreshRegistros();
      message.success("Formulario S-4 guardado correctamente.");
      setVisibleS4Modal(false);
      setMiembroSeleccionado(null);
    } catch (error: any) {
      const detail =
        error?.response?.data?.error?.message ||
        error?.message ||
        "No se pudo guardar el formulario S-4.";
      message.error(detail);
    }
  };

  const filtrarMiembrosPorEstadoVisita = (miembros: MemberSummary[]) =>
    miembros.filter((miembro) => {
      const yaFueVisitado = latestVisitByMember.has(miembro.id);
      if (filtroVisita === "todas") return true;
      if (filtroVisita === "pendientes") return !yaFueVisitado;
      if (filtroVisita === "realizadas") return yaFueVisitado;
      return true;
    });

  const handleVerHistorial = (miembroId: number) => {
    const visitasMiembro = visitas
      .filter((visita) => visita.miembroId === miembroId)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));

    setHistorialVisitas(visitasMiembro);
    setVisibleHistorialModal(true);
  };

  const buildS21Rows = (memberId: number, serviceYear: number): S21MonthRow[] =>
    serviceMonthOrder.map((label, index) => {
      const monthDate = getServiceYearMonthDate(serviceYear, index);
      const monthKey = monthDate.format("YYYY-MM");
      const sourceReports = visibleS21Modal ? s21Reports : reportesS4;
      const report = sourceReports
        .filter(
          (item) =>
            item.miembroId === memberId &&
            dayjs(item.mesServicio ?? item.fecha).format("YYYY-MM") === monthKey
        )
        .sort((a, b) => b.id - a.id)[0];

      return {
        key: monthKey,
        label,
        participated: report?.participoMinisterio ?? false,
        bibleStudies: report?.cursosBiblicos ?? 0,
        auxiliaryPioneer: report?.precursorAuxiliar ?? false,
        hours: report?.horas ?? "",
        notes: report?.comentarios ?? "",
      };
    });

  const s21Rows = useMemo(
    () =>
      miembroSeleccionado
        ? buildS21Rows(miembroSeleccionado.id, serviceYearSelected)
        : [],
    [miembroSeleccionado, reportesS4, s21Reports, serviceYearSelected, visibleS21Modal]
  );

  const s21TotalHours = useMemo(() => {
    const total = s21Rows.reduce(
      (sum, row) => sum + parseHoursToNumber(row.hours),
      0
    );

    return total > 0 ? String(total) : "";
  }, [s21Rows]);

  const watchedParticipoMinisterio = Form.useWatch("participoMinisterio", s4Form);
  const watchedCursosBiblicos = Form.useWatch("cursosBiblicos", s4Form);
  const watchedHoras = Form.useWatch("horas", s4Form);
  const watchedComentarios = Form.useWatch("comentarios", s4Form);

  const s4PdfData: S4PdfData | null =
    miembroSeleccionado
      ? {
          memberName: miembroSeleccionado.nombre,
          monthLabel: formatMonthLabel(s4Month.format("YYYY-MM-DD")),
          participated: Boolean(watchedParticipoMinisterio),
          bibleStudies: watchedCursosBiblicos ?? 0,
          hours: watchedHoras ?? "",
          comments: watchedComentarios ?? "",
        }
      : null;

  const s21PdfData: S21PdfData | null =
    miembroSeleccionado && selectedMemberDetails
      ? {
          memberName: miembroSeleccionado.nombre,
          birthDate: selectedMemberDetails.fechaNacimiento
            ? formatDisplayDate(selectedMemberDetails.fechaNacimiento)
            : "",
          baptismDate: selectedMemberDetails.fechaInmersion
            ? formatDisplayDate(selectedMemberDetails.fechaInmersion)
            : "",
          gender: selectedMemberDetails.genero ?? "",
          appointments: getMemberAppointments(selectedMemberDetails),
          serviceYearLabel: formatServiceYearLabel(serviceYearSelected),
          rows: s21Rows,
          totalHours: s21TotalHours,
        }
      : null;

  const expandedRowRender = (record: Grupo) => {
    const filteredMiembros = record.miembros.filter((miembro) =>
      miembro.nombre.toLowerCase().includes(busquedaNombre.toLowerCase())
    );

    const filteredMiembrosPorVisita =
      filtrarMiembrosPorEstadoVisita(filteredMiembros);

    return (
      <Space direction="vertical" style={{ width: "100%" }}>
        <Flex wrap="wrap" gap={8} justify="space-between" align="center">
          <Input
            placeholder="Buscar por nombre"
            prefix={<SearchOutlined />}
            style={{ width: isSmallScreen ? "100%" : 200, marginBottom: 8 }}
            onChange={(e) => setBusquedaNombre(e.target.value)}
          />
          <Radio.Group
            value={filtroVisita}
            onChange={(e) => setFiltroVisita(e.target.value)}
            style={{ marginBottom: 8 }}
          >
            <Radio.Button value="todas">Todas</Radio.Button>
            <Radio.Button value="pendientes">Pendientes</Radio.Button>
            <Radio.Button value="realizadas">Realizadas</Radio.Button>
          </Radio.Group>
        </Flex>
        {filteredMiembrosPorVisita.map((miembro, index) => (
          <Flex
            key={miembro.id}
            wrap="wrap"
            justify="space-between"
            align="center"
            style={{ marginBottom: 16, gap: 12 }}
          >
            <div>
              <Typography.Text style={{ fontSize: 16, marginBottom: 4 }}>
                <Typography.Text code>{index + 1}</Typography.Text>{" "}
                {miembro.nombre}
              </Typography.Text>
              <div>
                <Typography.Text type="secondary">
                  {latestVisitByMember.get(miembro.id)
                    ? `Última visita: ${latestVisitByMember.get(miembro.id)?.fecha}`
                    : "Aún no se ha visitado"}
                </Typography.Text>
              </div>
            </div>

            <Flex wrap="wrap" gap={8} className="pastoreo-actions">
              {latestVisitByMember.has(miembro.id) ? (
                <Tag color="green" style={{ marginBottom: 8 }}>
                  Ya fue visitado
                </Tag>
              ) : (
                <Tag color="volcano" style={{ marginBottom: 8 }}>
                  Visita pendiente
                </Tag>
              )}

              <Tooltip title="Formulario S-4">
                <Button
                  onClick={() => openS4Modal(miembro)}
                  size="small"
                  icon={<FileTextOutlined />}
                  shape="circle"
                />
              </Tooltip>

              <Tooltip title="Registro S-21">
                <Button
                  onClick={() => openS21Modal(miembro)}
                  size="small"
                  icon={<IdcardOutlined />}
                  shape="circle"
                />
              </Tooltip>

              <Tooltip title="Registrar visita">
                <Button
                  shape="circle"
                  size="small"
                  type="primary"
                  icon={<CalendarOutlined />}
                  onClick={() => {
                    if (isReadOnly) return;
                    setMiembroSeleccionado({
                      id: miembro.id,
                      nombre: miembro.nombre,
                    });
                    visitaForm.setFieldsValue({
                      fecha: undefined,
                      acompanante: undefined,
                      tema: undefined,
                      completada: false,
                    });
                    setVisibleVisitaModal(true);
                  }}
                  disabled={isReadOnly}
                />
              </Tooltip>

              <Tooltip title="Historial de visitas">
                <Button
                  shape="circle"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => handleVerHistorial(miembro.id)}
                />
              </Tooltip>
            </Flex>
          </Flex>
        ))}
      </Space>
    );
  };

  const filteredGrupos = grupoSeleccionado
    ? grupos.filter((grupo) => grupo.id === grupoSeleccionado)
    : grupos;

  const currentS4FileName =
    s4PdfData && miembroSeleccionado
      ? `s4-${normalizeFileSegment(miembroSeleccionado.nombre)}-${s4Month.format(
          "YYYY-MM"
        )}.pdf`
      : "s4.pdf";

  const currentS21FileName =
    s21PdfData && miembroSeleccionado
      ? `s21-${normalizeFileSegment(
          miembroSeleccionado.nombre
        )}-${formatServiceYearLabel(serviceYearSelected)}.pdf`
      : "s21.pdf";

  return (
    <section style={{ padding: "16px" }}>
      <List
        title={
          <Typography.Title
            level={4}
            style={{ textAlign: "center", marginTop: 24 }}
          >
            Pastoreo
          </Typography.Title>
        }
      >
        <Table<Grupo>
          title={() => (
            <Flex
              wrap="wrap"
              justify="space-between"
              align="center"
              style={{ marginBottom: 16, gap: 8 }}
            >
              <Typography.Title level={5} style={{ margin: 0 }}>
                Filtrar por Grupo
              </Typography.Title>
              <Select
                style={{
                  width: isSmallScreen ? "100%" : 200,
                  marginBottom: isSmallScreen ? 8 : 0,
                }}
                placeholder="Seleccionar Grupo"
                onChange={setGrupoSeleccionado}
                allowClear
              >
                {grupos.map((grupo) => (
                  <Select.Option key={grupo.id} value={grupo.id}>
                    {grupo.nombre}
                  </Select.Option>
                ))}
              </Select>
            </Flex>
          )}
          dataSource={filteredGrupos}
          rowKey="id"
          expandable={{
            expandedRowRender,
            rowExpandable: (record) => record.miembros.length > 0,
          }}
          pagination={false}
          scroll={{ x: true }}
        >
          <Table.Column<Grupo>
            title="Nombre"
            dataIndex="nombre"
            render={(value: string) => (
              <Typography.Text strong>{value}</Typography.Text>
            )}
          />
          <Table.Column<Grupo>
            title="Miembros"
            key="miembros"
            render={(_, record) => (
              <Typography.Text type="secondary">
                {record.miembros.length} miembro
                {record.miembros.length !== 1 ? "s" : ""}
              </Typography.Text>
            )}
          />
          <Table.Column<Grupo>
            title="Superintendente"
            dataIndex="superintendenteNombre"
            render={(value?: string) =>
              value && value !== "N/A" ? (
                value
              ) : (
                <Typography.Text type="secondary">N/A</Typography.Text>
              )
            }
          />
          <Table.Column<Grupo>
            title="Auxiliar"
            dataIndex="auxiliarNombre"
            render={(value?: string) =>
              value && value !== "N/A" ? (
                value
              ) : (
                <Typography.Text type="secondary">N/A</Typography.Text>
              )
            }
          />
        </Table>
      </List>

      <Modal
        title={`Registrar Visita a ${miembroSeleccionado?.nombre ?? ""}`}
        open={visibleVisitaModal}
        onCancel={() => {
          setVisibleVisitaModal(false);
          visitaForm.resetFields();
          setMiembroSeleccionado(null);
        }}
        onOk={() => visitaForm.submit()}
        width={isSmallScreen ? "100%" : 520}
      >
        <Form form={visitaForm} onFinish={handleAgregarVisita} layout="vertical">
          <Flex gap={12} justify="space-between">
            <Form.Item name="fecha" label="Fecha" rules={[{ required: true }]}>
              <DatePicker />
            </Form.Item>
            <Form.Item name="acompanante" label="Acompañante">
              <SelectSiervos />
            </Form.Item>
          </Flex>
          <Form.Item name="tema" label="Tema">
            <Input.TextArea />
          </Form.Item>

          <Form.Item name="completada" valuePropName="checked">
            <Checkbox>Visita completada</Checkbox>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Historial de Visitas"
        open={visibleHistorialModal}
        onCancel={() => setVisibleHistorialModal(false)}
        footer={null}
        width={isSmallScreen ? "100%" : 520}
      >
        <Timeline
          items={historialVisitas.map((visita) => ({
            children: (
              <>
                <p>
                  <strong>Fecha:</strong> {visita.fecha}
                </p>
                <p>
                  <strong>Tema:</strong> {visita.tema}
                </p>
                <p>
                  <strong>Acompañante:</strong> {visita.acompanante}
                </p>
              </>
            ),
          }))}
        />
      </Modal>

      <Modal
        title={null}
        open={visibleS4Modal}
        onCancel={() => {
          setVisibleS4Modal(false);
          s4Form.resetFields();
          setMiembroSeleccionado(null);
        }}
        footer={
          <Flex justify="space-between" wrap="wrap" gap={12}>
            <Space>
              {s4PdfData ? (
                <S4PdfDownloadButton
                  data={s4PdfData}
                  fileName={currentS4FileName}
                />
              ) : null}
            </Space>
            <Space>
              <Button
                onClick={() => {
                  setVisibleS4Modal(false);
                  s4Form.resetFields();
                  setMiembroSeleccionado(null);
                }}
              >
                Cerrar
              </Button>
              {!isReadOnly ? (
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={() => s4Form.submit()}
                >
                  Guardar S-4
                </Button>
              ) : null}
            </Space>
          </Flex>
        }
        width={isSmallScreen ? "100%" : 640}
      >
        <div className="pastoreo-sheet-tools">
          <DatePicker
            picker="month"
            value={s4Month}
            format="MMMM YYYY"
            onChange={(value) => {
              const nextMonth = (value ?? dayjs()).startOf("month");
              setS4Month(nextMonth);
              if (miembroSeleccionado) {
                hydrateS4Form(miembroSeleccionado.id, nextMonth);
              }
            }}
          />
        </div>

        <Form
          form={s4Form}
          layout="vertical"
          onFinish={handleGuardarS4}
          initialValues={{
            participoMinisterio: false,
            cursosBiblicos: 0,
            horas: "",
            comentarios: "",
            precursorAuxiliar: false,
          }}
        >
          <div className="pastoreo-form-sheet pastoreo-form-sheet--s4">
            <h2 className="pastoreo-form-sheet__title">Informe de predicación</h2>

            <div className="pastoreo-s4-row">
              <span className="pastoreo-s4-row__label">Nombre:</span>
              <div className="pastoreo-s4-row__value">
                {miembroSeleccionado?.nombre ?? ""}
              </div>
            </div>

            <div className="pastoreo-s4-row">
              <span className="pastoreo-s4-row__label">Mes:</span>
              <div className="pastoreo-s4-row__value">
                {formatMonthLabel(s4Month.format("YYYY-MM-DD"))}
              </div>
            </div>

            <div className="pastoreo-s4-block">
              <div className="pastoreo-s4-block__row">
                <div className="pastoreo-s4-block__label">
                  Marque la casilla si participó en alguna faceta de la predicación
                  durante el mes
                </div>
                <div className="pastoreo-s4-block__value">
                  <Form.Item
                    name="participoMinisterio"
                    valuePropName="checked"
                    style={{ margin: 0 }}
                  >
                    <Checkbox />
                  </Form.Item>
                </div>
              </div>

              <div className="pastoreo-s4-block__row">
                <div className="pastoreo-s4-block__label">
                  Número de diferentes cursos bíblicos dirigidos
                </div>
                <div className="pastoreo-s4-block__value">
                  <Form.Item name="cursosBiblicos" style={{ margin: 0 }}>
                    <InputNumber min={0} controls={false} style={{ width: "100%" }} />
                  </Form.Item>
                </div>
              </div>

              <div className="pastoreo-s4-block__row">
                <div className="pastoreo-s4-block__label">
                  Horas (para precursores auxiliares, regulares y especiales, o
                  misioneros en el campo)
                </div>
                <div className="pastoreo-s4-block__value">
                  <Form.Item name="horas" style={{ margin: 0 }}>
                    <Input placeholder="0" />
                  </Form.Item>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <Form.Item
                name="precursorAuxiliar"
                valuePropName="checked"
                style={{ marginBottom: 0 }}
              >
                <Checkbox>Sirvió como precursor auxiliar este mes</Checkbox>
              </Form.Item>
            </div>

            <div className="pastoreo-s4-comments">
              <div className="pastoreo-s4-comments__label">Comentarios:</div>
              <div className="pastoreo-s4-comments__value">
                <Form.Item name="comentarios" style={{ margin: 0 }}>
                  <Input.TextArea
                    autoSize={{ minRows: 4, maxRows: 6 }}
                    bordered={false}
                    style={{
                      background: "transparent",
                      boxShadow: "none",
                      padding: 0,
                      resize: "none",
                    }}
                  />
                </Form.Item>
              </div>
            </div>

            <div className="pastoreo-s4-footer">
              <span>S-4-S</span>
              <span>11/23</span>
            </div>
          </div>
        </Form>
      </Modal>

      <Modal
        title={null}
        open={visibleS21Modal}
        onCancel={() => {
          setVisibleS21Modal(false);
          setS21Loading(false);
          setS21MemberDetails(null);
          setS21Reports([]);
          setMiembroSeleccionado(null);
        }}
        footer={
          <Flex justify="space-between" wrap="wrap" gap={12}>
            <Space>
              {s21PdfData ? (
                <S21PdfDownloadButton
                  data={s21PdfData}
                  fileName={currentS21FileName}
                />
              ) : null}
            </Space>
            <Button
              onClick={() => {
                setVisibleS21Modal(false);
                setS21Loading(false);
                setS21MemberDetails(null);
                setS21Reports([]);
                setMiembroSeleccionado(null);
              }}
            >
              Cerrar
            </Button>
          </Flex>
        }
        width={isSmallScreen ? "100%" : 1100}
      >
        <div className="pastoreo-sheet-tools">
          <Select
            value={serviceYearSelected}
            options={serviceYearOptions}
            onChange={setServiceYearSelected}
            disabled={s21Loading}
          />
        </div>

        <Spin spinning={s21Loading}>
          <div className="pastoreo-form-sheet pastoreo-form-sheet--s21">
          <h2 className="pastoreo-form-sheet__title">
            Registro de publicador de la congregación
          </h2>

          <div className="pastoreo-s21-top">
            <div>
              <div className="pastoreo-s21-field">
                <span className="pastoreo-s21-field__label">Nombre:</span>
                <div className="pastoreo-s21-field__value">
                  {miembroSeleccionado?.nombre ?? ""}
                </div>
              </div>
              <div className="pastoreo-s21-field">
                <span className="pastoreo-s21-field__label">
                  Fecha de nacimiento:
                </span>
                <div className="pastoreo-s21-field__value">
                  {selectedMemberDetails?.fechaNacimiento
                    ? formatDisplayDate(selectedMemberDetails.fechaNacimiento)
                    : ""}
                </div>
              </div>
              <div className="pastoreo-s21-field">
                <span className="pastoreo-s21-field__label">
                  Fecha de bautismo:
                </span>
                <div className="pastoreo-s21-field__value">
                  {selectedMemberDetails?.fechaInmersion
                    ? formatDisplayDate(selectedMemberDetails.fechaInmersion)
                    : ""}
                </div>
              </div>
            </div>

            <div className="pastoreo-s21-options">
              <div className="pastoreo-s21-option">
                <span className="pastoreo-checkbox">
                  {selectedMemberDetails?.genero === "hombre" ? "X" : ""}
                </span>
                <span>Hombre</span>
              </div>
              <div className="pastoreo-s21-option">
                <span className="pastoreo-checkbox">
                  {selectedMemberDetails?.genero === "mujer" ? "X" : ""}
                </span>
                <span>Mujer</span>
              </div>
              <div className="pastoreo-s21-option">
                <span className="pastoreo-checkbox" />
                <span>Otras ovejas</span>
              </div>
              <div className="pastoreo-s21-option">
                <span className="pastoreo-checkbox" />
                <span>Ungido</span>
              </div>
            </div>
          </div>

          <div className="pastoreo-s21-appointments">
            {[
              [
                "Anciano",
                getMemberAppointments(selectedMemberDetails).includes("anciano"),
              ],
              [
                "Siervo ministerial",
                getMemberAppointments(selectedMemberDetails).includes(
                  "siervo_ministerial"
                ) ||
                  getMemberAppointments(selectedMemberDetails).includes("siervo"),
              ],
              [
                "Precursor regular",
                getMemberAppointments(selectedMemberDetails).includes(
                  "precursor_regular"
                ),
              ],
              [
                "Precursor especial",
                getMemberAppointments(selectedMemberDetails).includes(
                  "precursor_especial"
                ),
              ],
              [
                "Misionero que sirve en el campo",
                getMemberAppointments(selectedMemberDetails).includes("misionero") ||
                  getMemberAppointments(selectedMemberDetails).includes(
                    "misionero_campo"
                  ),
              ],
            ].map(([label, checked]) => (
              <div key={String(label)} className="pastoreo-s21-appointment">
                <span className="pastoreo-checkbox">{checked ? "X" : ""}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>

          <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
            Año de servicio: {formatServiceYearLabel(serviceYearSelected)}
          </Typography.Text>

          <div className="pastoreo-s21-table">
            <div className="pastoreo-s21-table__head">
              <div>Año de servicio</div>
              <div>Participación en el ministerio</div>
              <div>Cursos bíblicos</div>
              <div>Precursor auxiliar</div>
              <div>
                Horas
                <br />
                <span style={{ fontWeight: 400 }}>
                  (Si es precursor o misionero que sirve en el campo)
                </span>
              </div>
              <div>Notas</div>
            </div>

            {s21Rows.map((row) => (
              <div key={row.key} className="pastoreo-s21-table__row">
                <div style={{ justifyContent: "flex-start" }}>{row.label}</div>
                <div>
                  <span className="pastoreo-checkbox">
                    {row.participated ? "X" : ""}
                  </span>
                </div>
                <div>{row.bibleStudies || ""}</div>
                <div>
                  <span className="pastoreo-checkbox">
                    {row.auxiliaryPioneer ? "X" : ""}
                  </span>
                </div>
                <div>{row.hours}</div>
                <div style={{ justifyContent: "flex-start" }}>{row.notes}</div>
              </div>
            ))}

            <div className="pastoreo-s21-table__total">
              <div className="pastoreo-s21-table__total-label">Total</div>
              <div>{s21TotalHours}</div>
              <div />
            </div>
          </div>
          </div>
        </Spin>
      </Modal>
    </section>
  );
};
