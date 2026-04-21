import React, { useEffect, useMemo, useState } from "react";
import {
  Button as MobileButton,
  Card as MobileCard,
  NoticeBar,
  Selector,
  Space as MobileSpace,
  Tag as MobileTag,
} from "antd-mobile";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Divider,
  Empty,
  Flex,
  Form,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
  notification,
} from "antd";
import {
  AUTO_GENERATION_WEEKDAY_OPTIONS,
  buildMecanicaAutoGenerationPlan,
  buildWeekdayDatesInRange,
  inferAutoGenerationWeekdays,
  resolveAutoGenerationMonthRange,
  type MechanicsAssignmentRecord,
} from "./autoGeneration";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import "dayjs/locale/es";
import { useAdaptiveUI } from "../../adaptive/useAdaptiveUI";
import {
  createEntry,
  deleteEntry,
  getAllCollection,
  updateEntry,
} from "../../api/client";
import PDFMecanicas from "../../components/PDFMecanicas";
import SelectVarones from "../../components/select-varones";
import WhatsAppShareButton from "../../components/whatsapp-share-button";
import { useDirectory } from "../../contexts/directory";
import useMediaQuery from "../../hooks/useMediaQuery";
import { useIsAdminApp } from "../../hooks/useIsAdminApp";

const MECANICAS_RESOURCE = "mecanica-asignacions";
const INACTIVE_GROUP_NAME = "HNOS. INACTIVOS";
const EMPTY_ASSIGNMENT_LABEL = "- - -";

const normalizeGroupName = (value?: string) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

type AutoGenerateFormValues = {
  range?: [Dayjs, Dayjs];
  weekdays?: number[];
};

interface ScheduleData extends MechanicsAssignmentRecord {
  key: string;
  documentId?: string;
  dateValue: string;
  date: string;
  weekday: string;
  accommodators: {
    dentroId?: number;
    dentro: string;
    lobbyId?: number;
    lobby: string;
    rejaId?: number;
    reja: string;
  };
  microphone: {
    micro1Id?: number;
    micro1: string;
    micro2Id?: number;
    micro2: string;
    plataformaId?: number;
    plataforma: string;
  };
  audioVideoId?: number;
  audioVideo: string;
  audioVideoAuxiliarId?: number;
  audioVideoAuxiliar: string;
  cleaning: string[];
  hospitality: string[];
}

type MemberRelation = {
  id: number;
  nombre: string;
} | null;

type MecanicaResponse = {
  documentId?: string;
  fecha: string;
  acomodadorDentro?: MemberRelation;
  acomodadorLobby?: MemberRelation;
  acomodadorReja?: MemberRelation;
  micro1?: MemberRelation;
  micro2?: MemberRelation;
  plataforma?: MemberRelation;
  audioVideo?: MemberRelation;
  audioVideoAuxiliar?: MemberRelation;
  limpieza?: string[];
  hospitalidad?: string[];
};

const capitalize = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const formatDateLabel = (value: string) => dayjs(value).format("DD-MM-YYYY");

const formatWeekdayLabel = (value: string) =>
  capitalize(dayjs(value).locale("es").format("dddd"));

const getDisplayValue = (value?: string) => value?.trim() || EMPTY_ASSIGNMENT_LABEL;

const getDisplayGroups = (values: string[]) =>
  values.length ? values.join(" - ") : EMPTY_ASSIGNMENT_LABEL;

const mapAssignment = (item: MecanicaResponse & { id: number }) => ({
  key: item.id.toString(),
  documentId: item.documentId,
  dateValue: item.fecha,
  date: formatDateLabel(item.fecha),
  weekday: formatWeekdayLabel(item.fecha),
  accommodators: {
    dentroId: item.acomodadorDentro?.id ?? undefined,
    dentro: item.acomodadorDentro?.nombre ?? "",
    lobbyId: item.acomodadorLobby?.id ?? undefined,
    lobby: item.acomodadorLobby?.nombre ?? "",
    rejaId: item.acomodadorReja?.id ?? undefined,
    reja: item.acomodadorReja?.nombre ?? "",
  },
  microphone: {
    micro1Id: item.micro1?.id ?? undefined,
    micro1: item.micro1?.nombre ?? "",
    micro2Id: item.micro2?.id ?? undefined,
    micro2: item.micro2?.nombre ?? "",
    plataformaId: item.plataforma?.id ?? undefined,
    plataforma: item.plataforma?.nombre ?? "",
  },
  audioVideoId: item.audioVideo?.id ?? undefined,
  audioVideo: item.audioVideo?.nombre ?? "",
  audioVideoAuxiliarId: item.audioVideoAuxiliar?.id ?? undefined,
  audioVideoAuxiliar: item.audioVideoAuxiliar?.nombre ?? "",
  cleaning: item.limpieza ?? [],
  hospitality: item.hospitalidad ?? [],
});

const fetchAssignments = async () => {
  const asignaciones = await getAllCollection<MecanicaResponse>(
    MECANICAS_RESOURCE,
    {
      populate: [
        "acomodadorDentro",
        "acomodadorLobby",
        "acomodadorReja",
        "micro1",
        "micro2",
        "plataforma",
        "audioVideo",
        "audioVideoAuxiliar",
      ],
      sort: "fecha:asc",
      "pagination[pageSize]": 100,
    },
  );

  return asignaciones.map(mapAssignment);
};

const buildMecanicaWhatsAppMessage = (assignment: ScheduleData) =>
  [
    "Asignacion de Mecanicas",
    "",
    `Fecha: ${assignment.date}`,
    `Limpieza: ${assignment.cleaning.length ? assignment.cleaning.join(", ") : "Pendiente"}`,
    `Hospitalidad: ${assignment.hospitality.length ? assignment.hospitality.join(", ") : "Pendiente"}`,
    "",
    "Acomodadores",
    `Dentro: ${assignment.accommodators.dentro || "Pendiente"}`,
    `Lobby: ${assignment.accommodators.lobby || "Pendiente"}`,
    `Reja: ${assignment.accommodators.reja || "Pendiente"}`,
    "",
    "Microfonos",
    `Microfono 1: ${assignment.microphone.micro1 || "Pendiente"}`,
    `Microfono 2: ${assignment.microphone.micro2 || "Pendiente"}`,
    `Plataforma: ${assignment.microphone.plataforma || "Pendiente"}`,
    "",
    "Audio y Video",
    `Principal: ${assignment.audioVideo || "Pendiente"}`,
    `Auxiliar: ${assignment.audioVideoAuxiliar || "Pendiente"}`,
  ].join("\n");

const MONTH_LABELS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const getMonthKeyFromAssignment = (assignment: ScheduleData) =>
  dayjs(assignment.dateValue).month().toString();

const renderGroupTags = (values: string[]) => {
  if (values.length === 0) {
    return <MobileTag fill="outline">{EMPTY_ASSIGNMENT_LABEL}</MobileTag>;
  }

  return (
    <MobileSpace wrap>
      {values.map((value) => (
        <MobileTag key={value} color="primary" fill="outline">
          Grupo {value}
        </MobileTag>
      ))}
    </MobileSpace>
  );
};

export const ScheduleTable: React.FC = () => {
  const isSmallScreen = useMediaQuery("(max-width: 768px)");
  const { resolvedMode, setOverrideMode } = useAdaptiveUI();
  const isNativeMobile = resolvedMode === "mobile";
  const [form] = Form.useForm();
  const [autoForm] = Form.useForm<AutoGenerateFormValues>();
  const [data, setData] = useState<ScheduleData[]>([]);
  const isAdminApp = useIsAdminApp();
  const canEditInCurrentView = isAdminApp && !isNativeMobile;
  const { grupos, miembros } = useDirectory();
  const memberNamesById = useMemo(
    () =>
      miembros.reduce<Record<number, string>>((accumulator, member) => {
        accumulator[member.id] = member.nombre;
        return accumulator;
      }, {}),
    [miembros],
  );
  const activeGroupSequence = useMemo(() => {
    const totalActiveGroups = grupos.filter(
      (group) => normalizeGroupName(group.nombre) !== INACTIVE_GROUP_NAME,
    ).length;

    return Array.from({ length: totalActiveGroups }, (_, index) =>
      String(index + 1),
    );
  }, [grupos]);

  const assignmentGroupOptions = useMemo(
    () =>
      activeGroupSequence.map((value) => ({
        label: value,
        value,
      })),
    [activeGroupSequence],
  );

  const watchedAutoRange = Form.useWatch("range", autoForm);
  const watchedAutoWeekdays = Form.useWatch("weekdays", autoForm) ?? [];
  const autoPreviewDates = useMemo(() => {
    if (!watchedAutoRange?.[0] || !watchedAutoRange?.[1]) {
      return [];
    }

    return buildWeekdayDatesInRange(
      watchedAutoRange[0],
      watchedAutoRange[1],
      watchedAutoWeekdays,
    );
  }, [watchedAutoRange, watchedAutoWeekdays]);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAutoModalVisible, setIsAutoModalVisible] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const mapped = await fetchAssignments();

      if (!mounted) return;
      setData(mapped);
    };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const monthTabs = useMemo(
    () =>
      MONTH_LABELS.map((label, index) => ({
        key: index.toString(),
        label,
      })),
    [],
  );

  const monthSelectorOptions = useMemo(
    () =>
      monthTabs.map((item) => ({
        label: item.label,
        value: item.key,
      })),
    [monthTabs],
  );

  const defaultMonthKey = useMemo(() => {
    const currentMonthKey = dayjs().month().toString();

    if (data.some((item) => getMonthKeyFromAssignment(item) === currentMonthKey)) {
      return currentMonthKey;
    }

    return data[0] ? getMonthKeyFromAssignment(data[0]) : currentMonthKey;
  }, [data]);

  const activeMonthKey = selectedMonthKey ?? defaultMonthKey;

  const filteredData = useMemo(
    () => data.filter((item) => getMonthKeyFromAssignment(item) === activeMonthKey),
    [activeMonthKey, data],
  );

  const activeMonthLabel = MONTH_LABELS[Number(activeMonthKey)] ?? "este mes";
  const autoGenerationMonthRange = useMemo(
    () => resolveAutoGenerationMonthRange(data, activeMonthKey),
    [activeMonthKey, data],
  );
  const inferredAutoWeekdays = useMemo(
    () => inferAutoGenerationWeekdays(data, autoGenerationMonthRange.start),
    [autoGenerationMonthRange.start, data],
  );

  const openAutoGenerateModal = () => {
    if (!canEditInCurrentView) return;

    autoForm.setFieldsValue({
      range: [autoGenerationMonthRange.start, autoGenerationMonthRange.end],
      weekdays: inferredAutoWeekdays,
    });
    setIsAutoModalVisible(true);
  };

  const closeAutoGenerateModal = () => {
    setIsAutoModalVisible(false);
    autoForm.resetFields();
  };

  const showAutoGenerationWarnings = (warnings: string[]) => {
    if (!warnings.length) return;

    notification.warning({
      message: "Detalles de la autogeneración",
      duration: 8,
      placement: "topRight",
      description: (
        <div style={{ display: "grid", gap: 6 }}>
          {warnings.map((warning) => (
            <div key={warning}>{warning}</div>
          ))}
        </div>
      ),
    });
  };

  const handleAutoGenerateAssignments = async () => {
    if (!canEditInCurrentView) return;

    try {
      const values = await autoForm.validateFields();
      const range = values.range;
      const weekdays = [...new Set(values.weekdays ?? [])];

      if (!range?.[0] || !range?.[1] || !weekdays.length) {
        return;
      }

      const targetDates = buildWeekdayDatesInRange(range[0], range[1], weekdays);
      if (!targetDates.length) {
        message.warning("No hay fechas para autogenerar con esa selección.");
        return;
      }

      setIsAutoGenerating(true);

      const plan = buildMecanicaAutoGenerationPlan({
        assignments: data,
        members: miembros,
        groupSequence: activeGroupSequence,
        targetDates,
      });

      if (!plan.operations.length) {
        closeAutoGenerateModal();
        message.info(
          plan.skippedCount
            ? `No hubo cambios: ${plan.skippedCount} fecha(s) ya estaban completas.`
            : "No hubo cambios para aplicar.",
        );
        showAutoGenerationWarnings(plan.warnings);
        return;
      }

      for (const operation of plan.operations) {
        if (operation.mode === "update" && operation.targetId) {
          await updateEntry(MECANICAS_RESOURCE, operation.targetId, operation.payload);
        } else {
          await createEntry(MECANICAS_RESOURCE, operation.payload);
        }
      }

      const createdCount = plan.operations.filter(
        (operation) => operation.mode === "create",
      ).length;
      const updatedCount = plan.operations.filter(
        (operation) => operation.mode === "update",
      ).length;

      setData(await fetchAssignments());
      closeAutoGenerateModal();

      const summaryParts = [
        createdCount ? `${createdCount} creada(s)` : null,
        updatedCount ? `${updatedCount} actualizada(s)` : null,
        plan.skippedCount ? `${plan.skippedCount} sin cambios` : null,
      ].filter(Boolean);

      message.success(
        summaryParts.length
          ? `Autogeneración completada: ${summaryParts.join(", ")}.`
          : "Autogeneración completada.",
      );
      showAutoGenerationWarnings(plan.warnings);
    } catch (error) {
      if ((error as { errorFields?: unknown[] })?.errorFields) {
        return;
      }

      const detail =
        (error as { response?: { data?: { error?: { message?: string }; message?: string } } })
          ?.response?.data?.error?.message ??
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ??
        "No se pudieron autogenerar las asignaciones.";

      message.error(detail);
    } finally {
      setIsAutoGenerating(false);
    }
  };

  const handleAddOrUpdateAssignment = () => {
    if (!canEditInCurrentView) return;

    form.validateFields().then(async (values) => {
      const allSelectedValues = [
        values.dentro,
        values.lobby,
        values.reja,
        values.micro1,
        values.micro2,
        values.plataforma,
        values.audioVideo,
        values.audioVideoAuxiliar,
      ].filter((item): item is number => typeof item === "number");
      const duplicates = Array.from(
        new Set(
          allSelectedValues.filter(
            (item, index) => allSelectedValues.indexOf(item) !== index,
          ),
        ),
      );

      if (duplicates.length > 0) {
        const duplicateNames = duplicates.map(
          (id) => memberNamesById[id] ?? `ID ${id}`,
        );

        setDuplicateError(
          `Los siguientes valores están duplicados: ${duplicateNames.join(", ")}`,
        );
        return;
      }

      const payload = {
        fecha: values.date.format("YYYY-MM-DD"),
        acomodadorDentro: values.dentro ?? null,
        acomodadorLobby: values.lobby ?? null,
        acomodadorReja: values.reja ?? null,
        micro1: values.micro1 ?? null,
        micro2: values.micro2 ?? null,
        plataforma: values.plataforma ?? null,
        audioVideo: values.audioVideo ?? null,
        audioVideoAuxiliar: values.audioVideoAuxiliar ?? null,
        limpieza: values.cleaning ?? [],
        hospitalidad: values.hospitality ?? [],
      };

      const targetId =
        data.find((item) => item.key === editingKey)?.documentId ?? editingKey;

      if (editingKey) {
        await updateEntry(MECANICAS_RESOURCE, targetId as string, payload);
      } else {
        await createEntry(MECANICAS_RESOURCE, payload);
      }

      setData(await fetchAssignments());
      setIsModalVisible(false);
      setEditingKey(null);
      form.resetFields();
      setDuplicateError(null);
    });
  };

  const handleEdit = (record: ScheduleData) => {
    if (!canEditInCurrentView) return;

    setDuplicateError(null);
    form.setFieldsValue({
      date: dayjs(record.dateValue),
      dentro: record.accommodators.dentroId,
      lobby: record.accommodators.lobbyId,
      reja: record.accommodators.rejaId,
      micro1: record.microphone.micro1Id,
      micro2: record.microphone.micro2Id,
      plataforma: record.microphone.plataformaId,
      audioVideo: record.audioVideoId,
      audioVideoAuxiliar: record.audioVideoAuxiliarId,
      cleaning: record.cleaning,
      hospitality: record.hospitality,
    });
    setEditingKey(record.key);
    setIsModalVisible(true);
  };

  const handleDelete = async (key: string) => {
    if (!canEditInCurrentView) return;

    const targetId = data.find((item) => item.key === key)?.documentId ?? key;
    await deleteEntry(MECANICAS_RESOURCE, targetId as string);
    setData((current) => current.filter((item) => item.key !== key));
  };

  const columns: ColumnsType<ScheduleData> = [
    {
      title: "Fecha",
      dataIndex: "date",
      key: "date",
      render: (_: string, record) => (
        <Flex vertical gap={6}>
          <Tag color="blue" style={{ width: "fit-content", marginInlineEnd: 0 }}>
            {record.date}
          </Tag>
          <Typography.Text style={{ color: "#ff4d4f", fontSize: 14 }}>
            {record.weekday}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: "Acomodadores",
      dataIndex: "accommodators",
      key: "accommodators",
      render: (accommodators) => (
        <Flex vertical gap={4}>
          <div>
            <Tag bordered={false} color="orange" style={{ width: 50 }}>
              Dentro
            </Tag>{" "}
            <Typography.Text>{getDisplayValue(accommodators.dentro)}</Typography.Text>
          </div>
          <div>
            <Tag bordered={false} color="orange" style={{ width: 50 }}>
              Lobby
            </Tag>{" "}
            <Typography.Text>{getDisplayValue(accommodators.lobby)}</Typography.Text>
          </div>
          <div>
            <Tag bordered={false} color="orange" style={{ width: 50 }}>
              Reja
            </Tag>{" "}
            <Typography.Text>{getDisplayValue(accommodators.reja)}</Typography.Text>
          </div>
        </Flex>
      ),
    },
    {
      title: "Micrófono",
      dataIndex: "microphone",
      key: "microphone",
      render: (microphone) => (
        <Flex vertical gap={4}>
          <div>
            <Tag bordered={false} color="green" style={{ width: 70 }}>
              Micrófono
            </Tag>{" "}
            <Typography.Text>{getDisplayValue(microphone.micro1)}</Typography.Text>
          </div>
          <div>
            <Tag bordered={false} color="green" style={{ width: 70 }}>
              Micrófono
            </Tag>{" "}
            <Typography.Text>{getDisplayValue(microphone.micro2)}</Typography.Text>
          </div>
          <div>
            <Tag bordered={false} color="green" style={{ width: 70 }}>
              Plataforma
            </Tag>{" "}
            <Typography.Text>{getDisplayValue(microphone.plataforma)}</Typography.Text>
          </div>
        </Flex>
      ),
    },
    {
      title: "Audio y Video",
      dataIndex: "audioVideo",
      key: "audioVideo",
      render: (_: string, record) => (
        <Flex vertical gap={4}>
          <div>
            <Tag bordered={false} color="blue" style={{ width: 62 }}>
              Principal
            </Tag>{" "}
            <Typography.Text>{getDisplayValue(record.audioVideo)}</Typography.Text>
          </div>
          <div>
            <Tag bordered={false} color="cyan" style={{ width: 62 }}>
              Auxiliar
            </Tag>{" "}
            <Typography.Text>
              {getDisplayValue(record.audioVideoAuxiliar)}
            </Typography.Text>
          </div>
        </Flex>
      ),
    },
    {
      title: "Limpieza",
      dataIndex: "cleaning",
      key: "cleaning",
      render: (cleaning: string[]) => (
        <Tag color="magenta">{getDisplayGroups(cleaning)}</Tag>
      ),
    },
    {
      title: "Hospitalidad",
      dataIndex: "hospitality",
      key: "hospitality",
      render: (hospitality: string[]) => (
        <Tag color="purple">{getDisplayGroups(hospitality)}</Tag>
      ),
    },
    {
      title: "Acciones",
      key: "actions",
      render: (_: unknown, record: ScheduleData) => (
        <Space size="small">
          <WhatsAppShareButton message={buildMecanicaWhatsAppMessage(record)} />
          {canEditInCurrentView && (
            <>
              <Button
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
                size="small"
                shape="circle"
                type="primary"
                ghost
              />
              <Popconfirm
                title="¿Estás seguro de eliminar esta asignación?"
                onConfirm={() => handleDelete(record.key)}
                okText="Sí"
                cancelText="No"
              >
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                  shape="circle"
                />
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  const renderMobileView = () => (
    <div style={{ display: "grid", gap: 12 }}>
      {isAdminApp && (
        <NoticeBar
          content="La edición administrativa de mecánicas sigue disponible en la vista desktop."
          extra={
            <MobileButton size="mini" onClick={() => setOverrideMode("desktop")}>
              Ir a desktop
            </MobileButton>
          }
        />
      )}

      <MobileCard className="mobile-screen-card">
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>Mes activo</div>
            <div style={{ color: "var(--app-muted)" }}>
              Cambia rápido entre asignaciones sin salir de la vista móvil.
            </div>
          </div>
          <Selector
            columns={3}
            options={monthSelectorOptions}
            value={[activeMonthKey]}
            onChange={(value) => setSelectedMonthKey(value[0] ?? defaultMonthKey)}
          />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <PDFMecanicas data={filteredData} />
          </div>
        </div>
      </MobileCard>

      {filteredData.length === 0 ? (
        <MobileCard className="mobile-screen-card">
          <Empty description={`No hay asignaciones para ${activeMonthLabel}`} />
        </MobileCard>
      ) : (
        filteredData.map((item) => (
          <MobileCard
            key={item.key}
            className="mobile-screen-card"
            title={
              <div style={{ display: "grid", gap: 4 }}>
                <span>{item.date}</span>
                <span style={{ color: "#ff4d4f", fontSize: 14 }}>{item.weekday}</span>
              </div>
            }
            extra={
              <MobileTag color="primary" fill="outline">
                {activeMonthLabel}
              </MobileTag>
            }
          >
            <MobileSpace direction="vertical" block style={{ width: "100%" }}>
              <div>
                <strong>Limpieza</strong>
                <div style={{ marginTop: 8 }}>{renderGroupTags(item.cleaning)}</div>
              </div>
              <div>
                <strong>Hospitalidad</strong>
                <div style={{ marginTop: 8 }}>{renderGroupTags(item.hospitality)}</div>
              </div>
              <div>
                <strong>Acomodadores</strong>
                <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                  <div>Dentro: {getDisplayValue(item.accommodators.dentro)}</div>
                  <div>Lobby: {getDisplayValue(item.accommodators.lobby)}</div>
                  <div>Reja: {getDisplayValue(item.accommodators.reja)}</div>
                </div>
              </div>
              <div>
                <strong>Micrófonos</strong>
                <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                  <div>Micrófono 1: {getDisplayValue(item.microphone.micro1)}</div>
                  <div>Micrófono 2: {getDisplayValue(item.microphone.micro2)}</div>
                  <div>Plataforma: {getDisplayValue(item.microphone.plataforma)}</div>
                </div>
              </div>
              <div>
                <strong>Audio y video</strong>
                <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                  <div>Principal: {getDisplayValue(item.audioVideo)}</div>
                  <div>Auxiliar: {getDisplayValue(item.audioVideoAuxiliar)}</div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <WhatsAppShareButton
                  message={buildMecanicaWhatsAppMessage(item)}
                  shape="round"
                  size="middle"
                />
              </div>
            </MobileSpace>
          </MobileCard>
        ))
      )}
    </div>
  );

  return (
    <>
      <Flex vertical gap={16}>
        {!isNativeMobile && (
          <Flex
            gap={12}
            align={isSmallScreen ? "stretch" : "center"}
            justify="space-between"
            wrap="wrap"
          >
            <div
              className="app-month-tabs-card"
              style={{ flex: 1, minWidth: 0 }}
            >
              <Tabs
                activeKey={activeMonthKey}
                items={monthTabs}
                onChange={setSelectedMonthKey}
                tabBarStyle={{ margin: 0, paddingTop: 8 }}
              />
            </div>

            <Space wrap size={12}>
              {canEditInCurrentView && (
                <>
                  <Button onClick={openAutoGenerateModal}>Autogenerar Mes</Button>
                  <Button
                    type="primary"
                    onClick={() => {
                      setEditingKey(null);
                      setDuplicateError(null);
                      form.resetFields();
                      setIsModalVisible(true);
                    }}
                  >
                    Nueva Asignación
                  </Button>
                </>
              )}
              <PDFMecanicas data={filteredData} />
            </Space>
          </Flex>
        )}

        {isNativeMobile ? (
          renderMobileView()
        ) : (
          <Table
            columns={columns}
            dataSource={filteredData}
            bordered
            pagination={false}
            scroll={{ x: "max-content" }}
            locale={{
              emptyText: `No hay asignaciones para ${activeMonthLabel}`,
            }}
          />
        )}
      </Flex>

      {canEditInCurrentView && (
        <Modal
          title={`Autogenerar asignaciones de ${activeMonthLabel}`}
          open={isAutoModalVisible}
          width={isSmallScreen ? "100%" : 760}
          confirmLoading={isAutoGenerating}
          okText="Generar"
          cancelText="Cancelar"
          onOk={handleAutoGenerateAssignments}
          onCancel={closeAutoGenerateModal}
        >
          <Form form={autoForm} layout="vertical">
            <Alert
              showIcon
              type="info"
              style={{ marginBottom: 16 }}
              message="Se crearán o completarán las fechas del rango elegido."
              description="Limpieza y hospitalidad seguirán la secuencia del historial. Audio y Video principal continuará con la lista fija. El auxiliar quedará vacío y los acomodadores/micrófonos intentarán variar respecto al mes anterior."
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isSmallScreen
                  ? "1fr"
                  : "minmax(0, 1.1fr) minmax(0, 0.9fr)",
                gap: 16,
              }}
            >
              <Form.Item
                label="Rango de fechas"
                name="range"
                rules={[
                  {
                    required: true,
                    message: "Selecciona el rango de fechas a procesar.",
                  },
                ]}
              >
                <DatePicker.RangePicker
                  style={{ width: "100%" }}
                  format="DD-MM-YYYY"
                  disabledDate={(currentDate) =>
                    currentDate.year() !== autoGenerationMonthRange.start.year() ||
                    currentDate.month() !== autoGenerationMonthRange.start.month()
                  }
                />
              </Form.Item>

              <Form.Item
                label="Días de reunión"
                name="weekdays"
                rules={[
                  {
                    required: true,
                    type: "array",
                    min: 1,
                    message: "Selecciona al menos un día.",
                  },
                ]}
              >
                <Select
                  mode="multiple"
                  options={[...AUTO_GENERATION_WEEKDAY_OPTIONS]}
                  placeholder="Selecciona los días"
                />
              </Form.Item>
            </div>
          </Form>

          <Alert
            showIcon
            type={autoPreviewDates.length ? "success" : "warning"}
            style={{ marginTop: 8 }}
            message={
              autoPreviewDates.length
                ? `${autoPreviewDates.length} fecha(s) lista(s) para crear o completar`
                : "Selecciona un rango y uno o más días para ver la vista previa."
            }
            description={
              autoPreviewDates.length ? (
                <Space wrap>
                  {autoPreviewDates.map((dateValue) => (
                    <Tag key={dateValue} color="blue">
                      {formatDateLabel(dateValue)}
                    </Tag>
                  ))}
                </Space>
              ) : null
            }
          />
        </Modal>
      )}

      {canEditInCurrentView && (
        <Modal
          title={editingKey ? "Editar Asignación" : "Agregar Asignación"}
          open={isModalVisible}
          width={isSmallScreen ? "100%" : 840}
          onCancel={() => {
            setIsModalVisible(false);
            setEditingKey(null);
            setDuplicateError(null);
            form.resetFields();
          }}
          onOk={handleAddOrUpdateAssignment}
        >
          <Form form={form} layout="vertical">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isSmallScreen
                  ? "1fr"
                  : "repeat(3, minmax(0, 1fr))",
                gap: 16,
              }}
            >
              <Form.Item
                label="Fecha"
                name="date"
                rules={[
                  { required: true, message: "Por favor ingrese la fecha" },
                ]}
              >
                <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY" />
              </Form.Item>
              <Form.Item label="Limpieza" name="cleaning">
                <Select
                  style={{ width: "100%" }}
                  mode="multiple"
                  options={assignmentGroupOptions}
                  placeholder="Selecciona grupo(s)"
                />
              </Form.Item>
              <Form.Item label="Hospitalidad" name="hospitality">
                <Select
                  style={{ width: "100%" }}
                  mode="multiple"
                  options={assignmentGroupOptions}
                  placeholder="Selecciona grupo(s)"
                />
              </Form.Item>
            </div>

            <Divider>Acomodadores</Divider>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isSmallScreen
                  ? "1fr"
                  : "repeat(3, minmax(0, 1fr))",
                gap: 16,
              }}
            >
              <Form.Item label="Dentro" name="dentro">
                <SelectVarones />
              </Form.Item>
              <Form.Item label="Lobby" name="lobby">
                <SelectVarones />
              </Form.Item>
              <Form.Item label="Reja" name="reja">
                <SelectVarones />
              </Form.Item>
            </div>

            <Divider>Micrófonos</Divider>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isSmallScreen
                  ? "1fr"
                  : "repeat(3, minmax(0, 1fr))",
                gap: 16,
              }}
            >
              <Form.Item label="Micrófono 1" name="micro1">
                <SelectVarones />
              </Form.Item>
              <Form.Item label="Micrófono 2" name="micro2">
                <SelectVarones />
              </Form.Item>
              <Form.Item label="Plataforma" name="plataforma">
                <SelectVarones />
              </Form.Item>
            </div>

            <Divider>Audio y video</Divider>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isSmallScreen
                  ? "1fr"
                  : "repeat(2, minmax(0, 1fr))",
                gap: 16,
              }}
            >
              <Form.Item label="Audio y Video" name="audioVideo">
                <SelectVarones />
              </Form.Item>
              <Form.Item label="Auxiliar" name="audioVideoAuxiliar">
                <SelectVarones />
              </Form.Item>
            </div>
          </Form>

          {duplicateError && (
            <Alert
              message="Error"
              description={duplicateError}
              type="error"
              showIcon
              closable
              onClose={() => setDuplicateError(null)}
              style={{ marginTop: 16 }}
            />
          )}
        </Modal>
      )}
    </>
  );
};
