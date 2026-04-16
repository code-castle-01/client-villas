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
} from "antd";
import { ColumnsType } from "antd/es/table";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import useMediaQuery from "../../hooks/useMediaQuery";
import PDFMecanicas from "../../components/PDFMecanicas";
import SelectVarones from "../../components/select-varones";
import WhatsAppShareButton from "../../components/whatsapp-share-button";
import { createEntry, deleteEntry, getCollection, updateEntry } from "../../api/client";
import { useDirectory } from "../../contexts/directory";
import { useIsAdminApp } from "../../hooks/useIsAdminApp";

const MECANICAS_RESOURCE = "mecanica-asignacions";

interface ScheduleData {
  key: string;
  documentId?: string;
  date: string;
  accommodators: {
    dentroId: number;
    dentro: string;
    lobbyId: number;
    lobby: string;
    rejaId: number;
    reja: string;
  };
  microphone: {
    micro1Id: number;
    micro1: string;
    micro2Id: number;
    micro2: string;
    plataformaId: number;
    plataforma: string;
  };
  audioVideoId: number;
  audioVideo: string;
  cleaning: string[];
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
  limpieza?: string[];
};

const mapAssignment = (item: MecanicaResponse & { id: number }) => ({
  key: item.id.toString(),
  documentId: item.documentId,
  date: dayjs(item.fecha).format("DD-MM-YYYY"),
  accommodators: {
    dentroId: item.acomodadorDentro?.id ?? 0,
    dentro: item.acomodadorDentro?.nombre ?? "",
    lobbyId: item.acomodadorLobby?.id ?? 0,
    lobby: item.acomodadorLobby?.nombre ?? "",
    rejaId: item.acomodadorReja?.id ?? 0,
    reja: item.acomodadorReja?.nombre ?? "",
  },
  microphone: {
    micro1Id: item.micro1?.id ?? 0,
    micro1: item.micro1?.nombre ?? "",
    micro2Id: item.micro2?.id ?? 0,
    micro2: item.micro2?.nombre ?? "",
    plataformaId: item.plataforma?.id ?? 0,
    plataforma: item.plataforma?.nombre ?? "",
  },
  audioVideoId: item.audioVideo?.id ?? 0,
  audioVideo: item.audioVideo?.nombre ?? "",
  cleaning: item.limpieza ?? [],
});

const buildMecanicaWhatsAppMessage = (assignment: ScheduleData) =>
  [
    "Asignacion de Mecanicas",
    "",
    `Fecha: ${assignment.date}`,
    `Limpieza: ${assignment.cleaning.length ? assignment.cleaning.join(", ") : "Pendiente"}`,
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
    `Zoom: ${assignment.audioVideo || "Pendiente"}`,
  ].join("\n");

export const ScheduleTable: React.FC = () => {
  const isSmallScreen = useMediaQuery("(max-width: 768px)");
  const [form] = Form.useForm();
  const [data, setData] = useState<ScheduleData[]>([]);
  const isAdminApp = useIsAdminApp();
  const isReadOnly = !isAdminApp;
  const { miembros } = useDirectory();
  const memberNamesById = useMemo(
    () =>
      miembros.reduce<Record<number, string>>((accumulator, member) => {
        accumulator[member.id] = member.nombre;
        return accumulator;
      }, {}),
    [miembros],
  );

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const asignaciones = await getCollection<MecanicaResponse>(MECANICAS_RESOURCE, {
        populate: [
          "acomodadorDentro",
          "acomodadorLobby",
          "acomodadorReja",
          "micro1",
          "micro2",
          "plataforma",
          "audioVideo",
        ],
        "pagination[pageSize]": 1000,
      });

      const mapped = asignaciones.map(mapAssignment);

      if (!mounted) return;
      setData(mapped);
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleAddOrUpdateAssignment = () => {
    if (isReadOnly) return;
    form.validateFields().then(async (values) => {
      const acomodadores = [values.dentro, values.lobby, values.reja];
      const microfonos = [values.micro1, values.micro2, values.plataforma];
      const audioVideo = [values.audioVideo];
      const allSelectedValues = [...acomodadores, ...microfonos, ...audioVideo];
      const duplicates = Array.from(
        new Set(
          allSelectedValues.filter(
            (item, index) =>
              item !== undefined &&
              item !== null &&
              allSelectedValues.indexOf(item) !== index
          )
        )
      ) as number[];

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
        acomodadorDentro: values.dentro,
        acomodadorLobby: values.lobby,
        acomodadorReja: values.reja,
        micro1: values.micro1,
        micro2: values.micro2,
        plataforma: values.plataforma,
        audioVideo: values.audioVideo,
        limpieza: values.cleaning,
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

      const asignaciones = await getCollection<MecanicaResponse>(MECANICAS_RESOURCE, {
        populate: [
          "acomodadorDentro",
          "acomodadorLobby",
          "acomodadorReja",
          "micro1",
          "micro2",
          "plataforma",
          "audioVideo",
        ],
        "pagination[pageSize]": 1000,
      });
      const mapped = asignaciones.map(mapAssignment);

      setData(mapped);
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
      date: dayjs(record.date, "DD-MM-YYYY"),
      dentro: record.accommodators.dentroId,
      lobby: record.accommodators.lobbyId,
      reja: record.accommodators.rejaId,
      micro1: record.microphone.micro1Id,
      micro2: record.microphone.micro2Id,
      plataforma: record.microphone.plataformaId,
      audioVideo: record.audioVideoId,
      cleaning: record.cleaning,
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
      render: (audioVideo) => (
        <Flex vertical gap={4}>
          <div>
            <Tag bordered={false} color="blue" style={{ width: 44 }}>
              Zoom
            </Tag>{" "}
            <Typography.Text>{audioVideo}</Typography.Text>
          </div>
        </Flex>
      ),
    },
    {
      title: "Limpieza",
      dataIndex: "cleaning",
      key: "cleaning",
      render: (cleaning) => <Tag color="magenta">{cleaning.join(" - ")}</Tag>,
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
      {data.map((item) => (
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
            <Flex justify="space-between">
              <Typography.Text strong>Fecha:</Typography.Text>{" "}
              {dayjs(item.date).format("DD-MM-YY")}
              <Divider type="vertical" /> <strong>Limpieza:</strong>{" "}
              {item.cleaning.join(", ")}
            </Flex>
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
                {" "}
                <strong>Zoom: </strong>
                {item.audioVideo}
              </Typography.Text>{" "}
            </Typography.Paragraph>
          </Flex>
        </Card>
      ))}
    </>
  );

  return (
    <>
      <Flex
        gap={12}
        align="center"
        justify="flex-end"
        style={{ marginBottom: 16 }}
      >
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
        <PDFMecanicas data={data} />
      </Flex>

      {isSmallScreen ? (
        renderMobileView()
      ) : (
        <Table
          columns={columns}
          dataSource={data}
          bordered
          pagination={false}
          scroll={{ x: "max-content" }}
        />
      )}

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
          <Flex
            gap={16}
            justify="space-between"
            align="flex-start"
            vertical={isSmallScreen}
          >
            <Form.Item
              style={{ width: isSmallScreen ? "100%" : "50%" }}
              label="Fecha"
              name="date"
              rules={[
                { required: true, message: "Por favor ingrese la fecha" },
              ]}
            >
              <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY" />
            </Form.Item>
            <Form.Item
              style={{ width: isSmallScreen ? "100%" : "50%" }}
              label="Limpieza"
              name="cleaning"
              rules={[{ required: true }]}
            >
              <Select
                style={{ width: "100%" }}
                mode="multiple"
                options={[1, 2, 3, 4, 5, 6, 7, 8].map((num) => ({
                  label: num.toString(),
                  value: num.toString(),
                }))}
              />
            </Form.Item>
          </Flex>

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
              rules={[{ required: true }]}
            >
              <SelectVarones />
            </Form.Item>
            <Form.Item
              label="Lobby"
              name="lobby"
              rules={[{ required: true }]}
            >
              <SelectVarones />
            </Form.Item>
            <Form.Item
              label="Reja"
              name="reja"
              rules={[{ required: true }]}
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
              rules={[{ required: true }]}
            >
              <SelectVarones />
            </Form.Item>
            <Form.Item
              label="Micrófono 2"
              name="micro2"
              rules={[{ required: true }]}
            >
              <SelectVarones />
            </Form.Item>
            <Form.Item
              label="Plataforma"
              name="plataforma"
              rules={[{ required: true }]}
            >
              <SelectVarones />
            </Form.Item>
          </div>
          <Divider>Zoom</Divider>
          <Form.Item
            label="Audio y Video"
            name="audioVideo"
            rules={[{ required: true }]}
          >
            <SelectVarones />
          </Form.Item>
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
