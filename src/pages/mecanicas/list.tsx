import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  DatePicker,
  Select,
  Tag,
  Popconfirm,
  Space,
  Divider,
  Flex,
  Card,
  Typography,
  Alert,
  Empty,
  Tabs,
} from "antd";
import { ColumnsType } from "antd/es/table";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import useMediaQuery from "../../hooks/useMediaQuery";
import PDFMecanicas from "../../components/PDFMecanicas";
import SelectVarones from "../../components/select-varones";
import WhatsAppShareButton from "../../components/whatsapp-share-button";
import {
  createEntry,
  deleteEntry,
  getAllCollection,
  updateEntry,
} from "../../api/client";
import { useDirectory } from "../../contexts/directory";
import { useIsAdminApp } from "../../hooks/useIsAdminApp";

const MECANICAS_RESOURCE = "mecanica-asignacions";
const INACTIVE_GROUP_NAME = "HNOS. INACTIVOS";

const normalizeGroupName = (value?: string) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

interface ScheduleData {
  key: string;
  documentId?: string;
  dateValue: string;
  date: string;
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

const mapAssignment = (item: MecanicaResponse & { id: number }) => ({
  key: item.id.toString(),
  documentId: item.documentId,
  dateValue: item.fecha,
  date: dayjs(item.fecha).format("DD-MM-YYYY"),
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
  const asignaciones = await getAllCollection<MecanicaResponse>(MECANICAS_RESOURCE, {
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
  });

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

export const ScheduleTable: React.FC = () => {
  const isSmallScreen = useMediaQuery("(max-width: 768px)");
  const [form] = Form.useForm();
  const [data, setData] = useState<ScheduleData[]>([]);
  const isAdminApp = useIsAdminApp();
  const isReadOnly = !isAdminApp;
  const { grupos, miembros } = useDirectory();
  const memberNamesById = useMemo(
    () =>
      miembros.reduce<Record<number, string>>((accumulator, member) => {
        accumulator[member.id] = member.nombre;
        return accumulator;
      }, {}),
    [miembros],
  );
  const assignmentGroupOptions = useMemo(() => {
    const totalActiveGroups = grupos.filter(
      (group) => normalizeGroupName(group.nombre) !== INACTIVE_GROUP_NAME
    ).length;

    return Array.from({ length: totalActiveGroups }, (_, index) => ({
      label: String(index + 1),
      value: String(index + 1),
    }));
  }, [grupos]);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const mapped = await fetchAssignments();

      if (!mounted) return;
      setData(mapped);
    };
    load();
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

  const defaultMonthKey = useMemo(() => {
    const currentMonthKey = dayjs().month().toString();

    if (data.some((item) => getMonthKeyFromAssignment(item) === currentMonthKey)) {
      return currentMonthKey;
    }

    return data[0] ? getMonthKeyFromAssignment(data[0]) : currentMonthKey;
  }, [data]);

  const activeMonthKey = selectedMonthKey ?? defaultMonthKey;

  const filteredData = useMemo(
    () =>
      data.filter(
        (item) => getMonthKeyFromAssignment(item) === activeMonthKey,
      ),
    [activeMonthKey, data],
  );

  const activeMonthLabel =
    MONTH_LABELS[Number(activeMonthKey)] ?? "este mes";

  const handleAddOrUpdateAssignment = () => {
    if (isReadOnly) return;
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
            (item, index) => allSelectedValues.indexOf(item) !== index
          )
        )
      );

      if (duplicates.length > 0) {
        const duplicateNames = duplicates.map(
          (id) => memberNamesById[id] ?? `ID ${id}`
        );

        setDuplicateError(
          `Los siguientes valores están duplicados: ${duplicateNames.join(", ")}`
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
        await updateEntry(
          MECANICAS_RESOURCE,
          targetId as string,
          payload
        );
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
    if (isReadOnly) return;
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
    if (isReadOnly) return;
    const targetId = data.find((item) => item.key === key)?.documentId ?? key;
    await deleteEntry(MECANICAS_RESOURCE, targetId as string);
    const updatedData = data.filter((item) => item.key !== key);
    setData(updatedData);
  };

  const columns: ColumnsType<ScheduleData> = [
    {
      title: "Fecha",
      dataIndex: "date",
      key: "date",
      render: (date) => <Tag color="blue">{date}</Tag>,
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
            <Typography.Text> {accommodators.dentro}</Typography.Text>
          </div>
          <div>
            <Tag bordered={false} color="orange" style={{ width: 50 }}>
              Lobby
            </Tag>{" "}
            <Typography.Text>{accommodators.lobby}</Typography.Text>
          </div>
          <div>
            <Tag bordered={false} color="orange" style={{ width: 50 }}>
              Reja
            </Tag>{" "}
            <Typography.Text>{accommodators.reja}</Typography.Text>
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
            <Typography.Text>{microphone.micro1}</Typography.Text>
          </div>
          <div>
            <Tag bordered={false} color="green" style={{ width: 70 }}>
              Micrófono
            </Tag>{" "}
            <Typography.Text>{microphone.micro2}</Typography.Text>
          </div>
          <div>
            <Tag bordered={false} color="green" style={{ width: 70 }}>
              Plataforma
            </Tag>{" "}
            <Typography.Text>{microphone.plataforma}</Typography.Text>
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
            <Tag bordered={false} color="blue" style={{ width: 44 }}>
              Principal
            </Tag>{" "}
            <Typography.Text>{record.audioVideo || "Pendiente"}</Typography.Text>
          </div>
          <div>
            <Tag bordered={false} color="cyan" style={{ width: 44 }}>
              Aux
            </Tag>{" "}
            <Typography.Text>
              {record.audioVideoAuxiliar || "Pendiente"}
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
        <Tag color="magenta">
          {cleaning.length ? cleaning.join(" - ") : "Pendiente"}
        </Tag>
      ),
    },
    {
      title: "Hospitalidad",
      dataIndex: "hospitality",
      key: "hospitality",
      render: (hospitality: string[]) => (
        <Tag color="purple">
          {hospitality.length ? hospitality.join(" - ") : "Pendiente"}
        </Tag>
      ),
    },
    {
      title: "Acciones",
      key: "actions",
      render: (_: unknown, record: ScheduleData) => (
        <Space size="small">
          <WhatsAppShareButton message={buildMecanicaWhatsAppMessage(record)} />
          {isAdminApp && (
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
    <>
      {filteredData.length === 0 ? (
        <Card>
          <Empty description={`No hay asignaciones para ${activeMonthLabel}`} />
        </Card>
      ) : (
        filteredData.map((item) => (
        <Card
          key={item.key}
          style={{ marginBottom: 16 }}
          actions={
            [
                  <WhatsAppShareButton
                    key="share"
                    message={buildMecanicaWhatsAppMessage(item)}
                  />,
                  ...(isAdminApp
                    ? [
                  <Button
                    key="edit"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(item)}
                    size="small"
                  />,
                  <Popconfirm
                    key="delete"
                    title="¿Estás seguro de eliminar esta asignación?"
                    onConfirm={() => handleDelete(item.key)}
                    okText="Sí"
                    cancelText="No"
                  >
                    <Button danger icon={<DeleteOutlined />} size="small" />
                  </Popconfirm>,
                    ]
                    : []),
                ]
          }
        >
          <Flex vertical gap={4}>
            <Typography.Text>
              <strong>Fecha:</strong> {item.date}
            </Typography.Text>
            <Typography.Text>
              <strong>Limpieza:</strong>{" "}
              {item.cleaning.length ? item.cleaning.join(", ") : "Pendiente"}
            </Typography.Text>
            <Typography.Text>
              <strong>Hospitalidad:</strong>{" "}
              {item.hospitality.length ? item.hospitality.join(", ") : "Pendiente"}
            </Typography.Text>
            <Typography.Paragraph>
              <Divider>
                <Tag bordered={false} color="orange">
                  Acomodadores
                </Tag>
              </Divider>
              <Flex vertical gap={4}>
                <Typography.Text>
                  <strong> Dentro: </strong>
                  {item.accommodators.dentro}
                </Typography.Text>
                <Typography.Text>
                  {" "}
                  <strong>Lobby: </strong>
                  {item.accommodators.lobby}
                </Typography.Text>{" "}
                <Typography.Text>
                  {" "}
                  <strong>Reja: </strong>
                  {item.accommodators.reja}
                </Typography.Text>{" "}
              </Flex>
            </Typography.Paragraph>
            <Typography.Paragraph>
              <Divider>
                <Tag bordered={false} color="green">
                  Micrófonos
                </Tag>
              </Divider>
              <Flex vertical gap={4}>
                <Typography.Text>
                  <strong> Micrófono: </strong>
                  {item.microphone.micro1}
                </Typography.Text>
                <Typography.Text>
                  {" "}
                  <strong>Micrófono: </strong>
                  {item.microphone.micro2}
                </Typography.Text>{" "}
                <Typography.Text>
                  {" "}
                  <strong>Plataforma: </strong>
                  {item.microphone.plataforma}
                </Typography.Text>{" "}
              </Flex>
            </Typography.Paragraph>
            <Typography.Paragraph>
              <Divider>
                <Tag bordered={false} color="blue">
                  Audio y Video
                </Tag>
              </Divider>
              <Typography.Text>
                <strong>Principal: </strong>
                {item.audioVideo || "Pendiente"}
              </Typography.Text>
              <br />
              <Typography.Text>
                <strong>Auxiliar: </strong>
                {item.audioVideoAuxiliar || "Pendiente"}
              </Typography.Text>
            </Typography.Paragraph>
          </Flex>
        </Card>
        ))
      )}
    </>
  );

  return (
    <>
      <Flex vertical gap={16}>
        <Flex
          gap={12}
          align={isSmallScreen ? "stretch" : "center"}
          justify="space-between"
          wrap="wrap"
        >
          <div
            style={{
              flex: 1,
              minWidth: 0,
              padding: "0 16px",
              background: "#fff",
              border: "1px solid #f0f0f0",
              borderRadius: 16,
            }}
          >
            <Tabs
              activeKey={activeMonthKey}
              items={monthTabs}
              onChange={setSelectedMonthKey}
              tabBarStyle={{ margin: 0, paddingTop: 8 }}
            />
          </div>

          <Space wrap size={12}>
            {isAdminApp && (
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
            )}
            <PDFMecanicas data={filteredData} />
          </Space>
        </Flex>

        {isSmallScreen ? (
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

      {isAdminApp && (
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
              gridTemplateColumns: isSmallScreen ? "1fr" : "repeat(3, minmax(0, 1fr))",
              gap: 16,
            }}
          >
            <Form.Item
              label="Dentro"
              name="dentro"
            >
              <SelectVarones />
            </Form.Item>
            <Form.Item
              label="Lobby"
              name="lobby"
            >
              <SelectVarones />
            </Form.Item>
            <Form.Item
              label="Reja"
              name="reja"
            >
              <SelectVarones />
            </Form.Item>
          </div>
          <Divider>Micrófonos</Divider>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isSmallScreen ? "1fr" : "repeat(3, minmax(0, 1fr))",
              gap: 16,
            }}
          >
            <Form.Item
              label="Micrófono 1"
              name="micro1"
            >
              <SelectVarones />
            </Form.Item>
            <Form.Item
              label="Micrófono 2"
              name="micro2"
            >
              <SelectVarones />
            </Form.Item>
            <Form.Item
              label="Plataforma"
              name="plataforma"
            >
              <SelectVarones />
            </Form.Item>
          </div>
          <Divider>Zoom</Divider>
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
        {/* Mostrar alerta si hay duplicados */}
          {duplicateError && (
            <Alert
              message="Error"
              description={duplicateError}
              type="error"
              showIcon
              closable
              onClose={() => setDuplicateError(null)}
              style={{ marginBottom: 16 }}
            />
          )}
        </Modal>
      )}
    </>
  );
};
