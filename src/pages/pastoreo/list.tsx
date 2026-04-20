import {
  CalendarOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileTextOutlined,
  IdcardOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Button as MobileButton,
  Card as MobileCard,
  Empty as MobileEmpty,
  SearchBar,
  Selector,
  Space as MobileSpace,
  Tag as MobileTag,
} from "antd-mobile";
import {
  Button,
  Card,
  Checkbox,
  DatePicker,
  Flex,
  Form,
  Input,
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
import React, { useContext, useEffect, useMemo, useState } from "react";
import SelectSiervos from "../../components/select-siervos";
import {
  S21MonthRow,
  S21BatchDocument,
  S21PdfData,
  S21PdfDownloadButton,
} from "../../components/PastoreoPublisherFormsPDF";
import {
  S4ReportModal,
  buildS4Payload,
  findS4ReportForMemberMonth,
  isS4Record,
  normalizeS4FileSegment as normalizeFileSegment,
  type S4FormValues,
} from "../../components/s4";
import { useAdaptiveUI } from "../../adaptive/useAdaptiveUI";
import { api, createEntry, getCollection, updateEntry } from "../../api/client";
import type { DirectoryGroup, DirectoryMember } from "../../api/groupDirectory";
import { ColorModeContext } from "../../contexts/color-mode";
import { useDirectory } from "../../contexts/directory";
import useMediaQuery from "../../hooks/useMediaQuery";
import { useIsAdminApp } from "../../hooks/useIsAdminApp";
import "./styles.css";
import "../grupos/styles.css";

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

type S21GroupSummaryResponse = {
  group: {
    id: number;
    documentId?: string;
    nombre: string;
  };
  members: S21SummaryResponse[];
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
  relation?: RawRelation,
): relation is { data?: { id?: number; attributes?: { nombre?: string } } } =>
  Boolean(relation && typeof relation === "object" && "data" in relation);

const getRelationId = (relation?: RawRelation) => {
  if (typeof relation === "number") {
    return relation;
  }

  return hasNestedRelation(relation)
    ? relation.data?.id ?? 0
    : relation?.id ?? 0;
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
    | { id: number; nombre?: string },
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
  member: MemberSummary,
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
    ? member.nombramientos.filter(
        (value): value is string => typeof value === "string",
      )
    : [],
  grupos: (
    (
      member.grupos as {
        data?: Array<{ id: number; attributes?: { nombre?: string } }>;
      }
    )?.data ??
    (member.grupos as Array<{ id: number; nombre?: string }>) ??
    []
  ).map((grupo) => ({
    id: grupo.id,
    nombre: getRelationArrayName(grupo),
  })),
});

const formatDisplayDate = (value?: string) =>
  value ? dayjs(value).format("DD-MM-YYYY") : "No registrada";

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

const getMemberAppointments = (member?: MemberDetail | null) =>
  member?.nombramientos ?? [];

const capitalizeLabel = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const downloadBlob = (filename: string, blob: Blob) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const MiembrosList: React.FC = () => {
  const { mode } = useContext(ColorModeContext);
  const {
    grupos: directoryGroups,
    miembros: directoryMembers,
    refreshDirectory,
  } = useDirectory();
  const [loading, setLoading] = useState(false);
  const [busquedaNombre, setBusquedaNombre] = useState<string>("");
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<number | null>(
    null,
  );
  const [visibleVisitaModal, setVisibleVisitaModal] = useState(false);
  const [visitas, setVisitas] = useState<VisitRecord[]>([]);
  const [reportesS4, setReportesS4] = useState<VisitRecord[]>([]);
  const [visibleHistorialModal, setVisibleHistorialModal] = useState(false);
  const [historialVisitas, setHistorialVisitas] = useState<VisitRecord[]>([]);
  const [filtroVisita, setFiltroVisita] = useState<
    "todas" | "pendientes" | "realizadas"
  >("todas");
  const [miembroSeleccionado, setMiembroSeleccionado] =
    useState<MemberSummary | null>(null);
  const [visibleS4Modal, setVisibleS4Modal] = useState(false);
  const [visibleS21Modal, setVisibleS21Modal] = useState(false);
  const [s21Loading, setS21Loading] = useState(false);
  const [s21MemberDetails, setS21MemberDetails] = useState<MemberDetail | null>(
    null,
  );
  const [s21Reports, setS21Reports] = useState<VisitRecord[]>([]);
  const [s4Month, setS4Month] = useState(dayjs().startOf("month"));
  const [serviceYearSelected, setServiceYearSelected] = useState(
    getCurrentServiceYear(),
  );
  const [batchServiceYearSelected, setBatchServiceYearSelected] = useState(
    getCurrentServiceYear(),
  );
  const [downloadingGroupId, setDownloadingGroupId] = useState<number | null>(
    null,
  );

  const [visitaForm] = Form.useForm();

  const isSmallScreen = useMediaQuery("(max-width: 768px)");
  const { resolvedMode } = useAdaptiveUI();
  const isNativeMobile = resolvedMode === "mobile";
  const isAdminApp = useIsAdminApp();
  const isReadOnly = !isAdminApp;
  const grupos = useMemo<Grupo[]>(
    () =>
      directoryGroups.map((group: DirectoryGroup) => ({
        id: group.id,
        nombre: group.nombre,
        superintendenteNombre: group.superintendenteNombre ?? "N/A",
        auxiliarNombre: group.auxiliarNombre ?? "N/A",
        miembros: group.miembros.map((member) => ({
          id: member.id,
          nombre: member.nombre,
        })),
      })),
    [directoryGroups],
  );
  const miembroDetalles = useMemo<Record<number, MemberDetail>>(
    () =>
      directoryMembers.reduce<Record<number, MemberDetail>>(
        (accumulator, member: DirectoryMember) => {
          accumulator[member.id] = {
            id: member.id,
            nombre: member.nombre,
            fechaNacimiento: member.fechaNacimiento,
            fechaInmersion: member.fechaInmersion,
            genero: member.genero,
            nombramientos: member.nombramientos,
            grupos: member.grupos,
          };
          return accumulator;
        },
        {},
      ),
    [directoryMembers],
  );

  const loadVisitRecords = async () => {
    const data = await getCollection<RawVisita>("visitas", {
      populate: ["miembro", "acompanante"],
      "pagination[pageSize]": 1000,
    });
    const mapped = data.map(mapVisita);

    return {
      visitas: mapped.filter((item) => !isS4Record(item)),
      reportesS4: mapped.filter((item) => isS4Record(item)),
    };
  };

  const refreshRegistros = async () => {
    const data = await loadVisitRecords();
    setVisitas(data.visitas);
    setReportesS4(data.reportesS4);
  };

  const refreshPageData = async () => {
    setLoading(true);
    try {
      const [, visitData] = await Promise.all([
        refreshDirectory(),
        loadVisitRecords(),
      ]);
      setVisitas(visitData.visitas);
      setReportesS4(visitData.reportesS4);
    } catch (error: any) {
      const detail =
        error?.response?.data?.error?.message ||
        error?.message ||
        "No se pudo cargar la información de pastoreo.";
      message.error(detail);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshPageData();
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

  const currentMonthKey = dayjs().startOf("month").format("YYYY-MM");
  const currentMonthLabel = capitalizeLabel(
    dayjs().locale("es").format("MMMM"),
  );

  const currentMonthReportByMember = useMemo(() => {
    const monthReportMap = new Map<number, VisitRecord>();

    reportesS4.forEach((reporte) => {
      const reportMonth = dayjs(reporte.mesServicio ?? reporte.fecha).format(
        "YYYY-MM",
      );
      if (reportMonth !== currentMonthKey) {
        return;
      }

      const current = monthReportMap.get(reporte.miembroId);
      if (!current || reporte.id > current.id) {
        monthReportMap.set(reporte.miembroId, reporte);
      }
    });

    return monthReportMap;
  }, [currentMonthKey, reportesS4]);

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

  const batchServiceYearOptions = useMemo(() => {
    const values = new Set<number>([getCurrentServiceYear()]);

    reportesS4.forEach((reporte) => {
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
  }, [reportesS4]);

  const openS4Modal = (member: MemberSummary) => {
    const monthValue = dayjs().startOf("month");
    setMiembroSeleccionado(member);
    setS4Month(monthValue);
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
        `/visitas/s21-summary/${member.id}`,
      );

      const fetchedMember = data?.data?.member
        ? mapMemberDetail(data.data.member)
        : miembroDetalles[member.id] ?? null;
      const fetchedReports = (data?.data?.s4Records ?? [])
        .map((record) => mapS21SummaryRecord(record, member))
        .filter(isS4Record);

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

    const existing = findS4ReportForMemberMonth(
      reportesS4,
      miembroSeleccionado.id,
      s4Month,
    );
    const payload = buildS4Payload({
      memberId: miembroSeleccionado.id,
      month: s4Month,
      values,
    });

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

  const buildS21Rows = (
    memberId: number,
    serviceYear: number,
    sourceReports: VisitRecord[],
  ): S21MonthRow[] =>
    serviceMonthOrder.map((label, index) => {
      const monthDate = getServiceYearMonthDate(serviceYear, index);
      const monthKey = monthDate.format("YYYY-MM");
      const report = sourceReports
        .filter(
          (item) =>
            item.miembroId === memberId &&
            dayjs(item.mesServicio ?? item.fecha).format("YYYY-MM") ===
              monthKey,
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
        ? buildS21Rows(
            miembroSeleccionado.id,
            serviceYearSelected,
            visibleS21Modal ? s21Reports : reportesS4,
          )
        : [],
    [
      miembroSeleccionado,
      reportesS4,
      s21Reports,
      serviceYearSelected,
      visibleS21Modal,
    ],
  );

  const s21TotalHours = useMemo(() => {
    const total = s21Rows.reduce(
      (sum, row) => sum + parseHoursToNumber(row.hours),
      0,
    );

    return total > 0 ? String(total) : "";
  }, [s21Rows]);

  const buildS21PdfDataForMember = (
    member: MemberSummary,
    details: MemberDetail,
    serviceYear: number,
    sourceReports: VisitRecord[],
  ): S21PdfData => {
    const rows = buildS21Rows(member.id, serviceYear, sourceReports);
    const totalHours = rows.reduce(
      (sum, row) => sum + parseHoursToNumber(row.hours),
      0,
    );

    return {
      memberName: member.nombre,
      birthDate: details.fechaNacimiento
        ? formatDisplayDate(details.fechaNacimiento)
        : "",
      baptismDate: details.fechaInmersion
        ? formatDisplayDate(details.fechaInmersion)
        : "",
      gender: details.genero ?? "",
      appointments: getMemberAppointments(details),
      serviceYearLabel: formatServiceYearLabel(serviceYear),
      rows,
      totalHours: totalHours > 0 ? String(totalHours) : "",
    };
  };

  const s21PdfData: S21PdfData | null =
    miembroSeleccionado && selectedMemberDetails
      ? buildS21PdfDataForMember(
          miembroSeleccionado,
          selectedMemberDetails,
          serviceYearSelected,
          visibleS21Modal ? s21Reports : reportesS4,
        )
      : null;

  const handleDownloadGroupS21 = async (group: Grupo) => {
    setDownloadingGroupId(group.id);

    try {
      const [{ pdf }, response] = await Promise.all([
        import("@react-pdf/renderer"),
        api.get<{ data: S21GroupSummaryResponse }>(
          `/visitas/s21-summary/group/${group.id}`,
        ),
      ]);

      const batchItems = (response.data?.data?.members ?? [])
        .map((entry) => {
          if (!entry.member?.id) {
            return null;
          }

          const memberSummary: MemberSummary = {
            id: entry.member.id,
            nombre: entry.member.nombre,
          };
          const details = mapMemberDetail(entry.member);
          const reports = (entry.s4Records ?? [])
            .map((record) => mapS21SummaryRecord(record, memberSummary))
            .filter(isS4Record);

          return buildS21PdfDataForMember(
            memberSummary,
            details,
            batchServiceYearSelected,
            reports,
          );
        })
        .filter((item): item is S21PdfData => Boolean(item));

      if (!batchItems.length) {
        message.warning("Este grupo no tiene miembros para generar el lote S-21.");
        return;
      }

      const batchFileName = `s21-${normalizeFileSegment(
        group.nombre,
      )}-${formatServiceYearLabel(batchServiceYearSelected)}.pdf`;

      const blob = await pdf(
        <S21BatchDocument items={batchItems} />,
      ).toBlob();

      downloadBlob(batchFileName, blob);
    } catch (error: any) {
      const detail =
        error?.response?.data?.error?.message ||
        error?.message ||
        "No se pudo descargar el lote S-21.";
      message.error(detail);
    } finally {
      setDownloadingGroupId(null);
    }
  };

  const expandedRowRender = (record: Grupo) => {
    const filteredMiembros = record.miembros.filter((miembro) =>
      miembro.nombre.toLowerCase().includes(busquedaNombre.toLowerCase()),
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
        {filteredMiembrosPorVisita.map((miembro, index) => {
          const monthlyReport = currentMonthReportByMember.get(miembro.id);

          return (
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
                      ? `Última visita: ${
                          latestVisitByMember.get(miembro.id)?.fecha
                        }`
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

                {monthlyReport ? (
                  <Tag color="lime" style={{ marginBottom: 8 }}>
                    Informó {currentMonthLabel}
                  </Tag>
                ) : (
                  <Tag color="gold" style={{ marginBottom: 8 }}>
                    Sin informe {currentMonthLabel}
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
          );
        })}
      </Space>
    );
  };

  const filteredGrupos = grupoSeleccionado
    ? grupos.filter((grupo) => grupo.id === grupoSeleccionado)
    : grupos;

  const renderMobilePastoreo = () => (
    <div className="pastoreo-mobile">
      <MobileCard className="mobile-screen-card pastoreo-mobile__filters">
        <SearchBar
          value={busquedaNombre}
          onChange={setBusquedaNombre}
          placeholder="Buscar publicador"
        />

        <div className="pastoreo-mobile__selector">
          <span>Año S-21</span>
          <Selector
            columns={2}
            options={batchServiceYearOptions}
            value={[batchServiceYearSelected]}
            onChange={(value) => {
              if (value[0]) {
                setBatchServiceYearSelected(Number(value[0]));
              }
            }}
          />
        </div>

        <div className="pastoreo-mobile__selector">
          <span>Grupo</span>
          <Selector
            columns={2}
            options={grupos.map((grupo) => ({
              label: grupo.nombre,
              value: grupo.id,
            }))}
            value={grupoSeleccionado ? [grupoSeleccionado] : []}
            onChange={(value) =>
              setGrupoSeleccionado(value[0] ? Number(value[0]) : null)
            }
          />
        </div>

        <div className="pastoreo-mobile__selector">
          <span>Visitas</span>
          <Selector
            columns={3}
            options={[
              { label: "Todas", value: "todas" },
              { label: "Pendientes", value: "pendientes" },
              { label: "Realizadas", value: "realizadas" },
            ]}
            value={[filtroVisita]}
            onChange={(value) =>
              setFiltroVisita(
                (value[0] as "todas" | "pendientes" | "realizadas") ?? "todas",
              )
            }
          />
        </div>
      </MobileCard>

      {filteredGrupos.length ? (
        filteredGrupos.map((grupo) => {
          const filteredMiembros = grupo.miembros.filter((miembro) =>
            miembro.nombre.toLowerCase().includes(busquedaNombre.toLowerCase()),
          );
          const visibleMiembros =
            filtrarMiembrosPorEstadoVisita(filteredMiembros);

          return (
            <MobileCard
              key={grupo.id}
              className="mobile-screen-card pastoreo-mobile-group"
              title={grupo.nombre}
              extra={
                <MobileTag color="primary" fill="outline">
                  {visibleMiembros.length} miembros
                </MobileTag>
              }
            >
              <MobileSpace direction="vertical" block style={{ width: "100%" }}>
                <div className="pastoreo-mobile-group__leaders">
                  <div>
                    <span>Superintendente</span>
                    <strong>{grupo.superintendenteNombre || "N/A"}</strong>
                  </div>
                  <div>
                    <span>Auxiliar</span>
                    <strong>{grupo.auxiliarNombre || "N/A"}</strong>
                  </div>
                </div>

                <MobileButton
                  block
                  color="primary"
                  fill="outline"
                  loading={downloadingGroupId === grupo.id}
                  disabled={!grupo.miembros.length}
                  onClick={() => void handleDownloadGroupS21(grupo)}
                >
                  <DownloadOutlined /> Descargar lote S-21
                </MobileButton>

                {visibleMiembros.length ? (
                  <div className="pastoreo-mobile-members">
                    {visibleMiembros.map((miembro, index) => {
                      const monthlyReport = currentMonthReportByMember.get(
                        miembro.id,
                      );
                      const hasVisit = latestVisitByMember.has(miembro.id);

                      return (
                        <div key={miembro.id} className="pastoreo-mobile-member">
                          <div className="pastoreo-mobile-member__header">
                            <strong>
                              {index + 1}. {miembro.nombre}
                            </strong>
                            <span>
                              {latestVisitByMember.get(miembro.id)
                                ? `Última visita: ${
                                    latestVisitByMember.get(miembro.id)?.fecha
                                  }`
                                : "Aún no se ha visitado"}
                            </span>
                          </div>

                          <div className="pastoreo-mobile-member__tags">
                            <MobileTag
                              color={hasVisit ? "success" : "warning"}
                              fill={hasVisit ? "solid" : "outline"}
                            >
                              {hasVisit ? "Visitado" : "Pendiente"}
                            </MobileTag>
                            <MobileTag
                              color={monthlyReport ? "success" : "warning"}
                              fill={monthlyReport ? "solid" : "outline"}
                            >
                              {monthlyReport
                                ? `Informó ${currentMonthLabel}`
                                : `Sin informe ${currentMonthLabel}`}
                            </MobileTag>
                          </div>

                          <div className="pastoreo-mobile-member__actions">
                            <MobileButton
                              size="mini"
                              fill="outline"
                              onClick={() => openS4Modal(miembro)}
                            >
                              <FileTextOutlined /> S-4
                            </MobileButton>
                            <MobileButton
                              size="mini"
                              fill="outline"
                              onClick={() => void openS21Modal(miembro)}
                            >
                              <IdcardOutlined /> S-21
                            </MobileButton>
                            <MobileButton
                              size="mini"
                              color="primary"
                              disabled={isReadOnly}
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
                            >
                              <CalendarOutlined /> Visita
                            </MobileButton>
                            <MobileButton
                              size="mini"
                              fill="outline"
                              onClick={() => handleVerHistorial(miembro.id)}
                            >
                              <EyeOutlined /> Historial
                            </MobileButton>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <MobileEmpty description="No hay miembros con estos filtros." />
                )}
              </MobileSpace>
            </MobileCard>
          );
        })
      ) : (
        <MobileCard className="mobile-screen-card">
          <MobileEmpty description="No hay grupos registrados." />
        </MobileCard>
      )}
    </div>
  );

  const currentS21FileName =
    s21PdfData && miembroSeleccionado
      ? `s21-${normalizeFileSegment(
          miembroSeleccionado.nombre,
        )}-${formatServiceYearLabel(serviceYearSelected)}.pdf`
      : "s21.pdf";

  return (
    <section
      className={`grupos-page ${
        mode === "dark" ? "grupos-page--dark" : "grupos-page--light"
      }`}
    >
      <div className="grupos-page__header">
        <div>
          <Typography.Title level={3} className="grupos-page__title">
            Pastoreo
          </Typography.Title>
          <Typography.Text className="grupos-page__subtitle">
            Gestiona visitas e informes
          </Typography.Text>
        </div>
        <Button
          className="grupos-btn grupos-btn--ghost"
          icon={<ReloadOutlined />}
          onClick={refreshPageData}
          loading={loading}
        >
          Recargar
        </Button>
      </div>

      {isNativeMobile ? (
        renderMobilePastoreo()
      ) : (
        <Card className="grupos-card" bordered={false}>
          <Table<Grupo>
            className="grupos-table"
            title={() => (
              <Flex
                wrap="wrap"
                justify="space-between"
                align="center"
                style={{ padding: "20px 24px 0", gap: 8 }}
              >
                <Typography.Title level={5} style={{ margin: 0 }}>
                  Filtrar por Grupo
                </Typography.Title>
                <Flex wrap="wrap" gap={8} justify="flex-end">
                  <Select
                    style={{
                      width: isSmallScreen ? "100%" : 190,
                      marginBottom: isSmallScreen ? 8 : 0,
                    }}
                    value={batchServiceYearSelected}
                    options={batchServiceYearOptions}
                    onChange={setBatchServiceYearSelected}
                    placeholder="Año S-21"
                  />
                  <Select
                    style={{
                      width: isSmallScreen ? "100%" : 220,
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
              </Flex>
            )}
            dataSource={filteredGrupos}
            rowKey="id"
            loading={loading}
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
                <span className="grupos-table__name">{value}</span>
              )}
            />
            <Table.Column<Grupo>
              title="Miembros"
              key="miembros"
              render={(_, record) => (
                <span className="grupos-table__count">
                  {record.miembros.length} miembro
                  {record.miembros.length !== 1 ? "s" : ""}
                </span>
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
            <Table.Column<Grupo>
              title="S21 lote"
              key="s21-lote"
              render={(_, record) => (
                <Button
                  icon={<DownloadOutlined />}
                  type="primary"
                  onClick={() => handleDownloadGroupS21(record)}
                  loading={downloadingGroupId === record.id}
                  disabled={!record.miembros.length}
                >
                  Descargar lote S-21
                </Button>
              )}
            />
          </Table>
        </Card>
      )}

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
        <Form
          form={visitaForm}
          onFinish={handleAgregarVisita}
          layout="vertical"
        >
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

      <S4ReportModal
        open={visibleS4Modal}
        member={miembroSeleccionado}
        month={s4Month}
        reports={reportesS4}
        isSmallScreen={isSmallScreen}
        readOnly={isReadOnly}
        onMonthChange={setS4Month}
        onCancel={() => {
          setVisibleS4Modal(false);
          setMiembroSeleccionado(null);
        }}
        onSubmit={handleGuardarS4}
      />

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
                  getMemberAppointments(selectedMemberDetails).includes(
                    "anciano",
                  ),
                ],
                [
                  "Siervo ministerial",
                  getMemberAppointments(selectedMemberDetails).includes(
                    "siervo_ministerial",
                  ) ||
                    getMemberAppointments(selectedMemberDetails).includes(
                      "siervo",
                    ),
                ],
                [
                  "Precursor regular",
                  getMemberAppointments(selectedMemberDetails).includes(
                    "precursor_regular",
                  ),
                ],
                [
                  "Precursor especial",
                  getMemberAppointments(selectedMemberDetails).includes(
                    "precursor_especial",
                  ),
                ],
                [
                  "Misionero que sirve en el campo",
                  getMemberAppointments(selectedMemberDetails).includes(
                    "misionero",
                  ) ||
                    getMemberAppointments(selectedMemberDetails).includes(
                      "misionero_campo",
                    ),
                ],
              ].map(([label, checked]) => (
                <div key={String(label)} className="pastoreo-s21-appointment">
                  <span className="pastoreo-checkbox">
                    {checked ? "X" : ""}
                  </span>
                  <span>{label}</span>
                </div>
              ))}
            </div>

            <Typography.Text
              type="secondary"
              style={{ display: "block", marginBottom: 8 }}
            >
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
                  <div style={{ justifyContent: "flex-start" }}>
                    {row.label}
                  </div>
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
                  <div style={{ justifyContent: "flex-start" }}>
                    {row.notes}
                  </div>
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
