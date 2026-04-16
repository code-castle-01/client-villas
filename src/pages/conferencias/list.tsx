import React, { useEffect, useMemo, useState } from "react";
import { DeleteOutlined, EditOutlined, UserAddOutlined } from "@ant-design/icons";
import {
  Button,
  DatePicker,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Switch,
  Table,
  Card,
  Typography,
  Popconfirm,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import PDFConferencias from "../../components/PDFConferencias";
import SelectSiervos from "../../components/select-siervos";
import SelectTemas from "../../components/select-temas";
import WhatsAppShareButton from "../../components/whatsapp-share-button";
import useMediaQuery from "../../hooks/useMediaQuery";
import { createEntry, deleteEntry, getCollection, updateEntry } from "../../api/client";
import { useDirectory } from "../../contexts/directory";
import { useIsAdminApp } from "../../hooks/useIsAdminApp";

const { Text, Paragraph } = Typography;

export interface Conferencia {
  id: string;
  orador: string;
  temaId?: number;
  tema: string;
  cancion: string;
  cong: string;
  auxiliarId?: number;
  auxiliar: string;
  fecha: string;
}

type TemaSummary = {
  id: number;
  codigo?: number | null;
  titulo: string;
} | null;

type AuxiliarSummary = {
  id: number;
  nombre: string;
} | null;

type ConferenciaResponse = {
  orador: string;
  tema?: TemaSummary;
  auxiliar?: AuxiliarSummary;
  cancion: number;
  cong: string;
  fecha: string;
};

type LeadershipMember = {
  id: number;
  nombre: string;
  genero?: string;
  roles?: string[];
  nombramientos?: string[];
};

const isLeadershipMember = (member: LeadershipMember) => {
  const nombramientos = member.nombramientos ?? [];

  if (member.genero && member.genero !== "hombre") {
    return false;
  }

  if (nombramientos.includes("anciano")) {
    return true;
  }

  if (
    nombramientos.includes("siervo_ministerial") ||
    nombramientos.includes("siervo")
  ) {
    return true;
  }

  return (member.roles ?? []).includes("siervo");
};

const mapConferencia = (conferencia: ConferenciaResponse & { id: number }) => ({
  id: String(conferencia.id),
  orador: conferencia.orador,
  temaId: conferencia.tema?.id,
  tema: conferencia.tema?.titulo ?? "",
  cancion: conferencia.cancion ? String(conferencia.cancion) : "",
  cong: conferencia.cong,
  auxiliarId: conferencia.auxiliar?.id,
  auxiliar: conferencia.auxiliar?.nombre ?? "",
  fecha: conferencia.fecha,
});

const buildConferenceWhatsAppMessage = (conferencia: Conferencia) => {
  const lines = [
    "Conferencia Publica",
    "",
    `Orador: ${conferencia.orador}`,
    `Congregacion: ${conferencia.cong}`,
    `Tema: ${conferencia.tema || "Pendiente"}`,
    `Cancion: ${conferencia.cancion || "Pendiente"}`,
    `Fecha: ${dayjs(conferencia.fecha).format("DD-MM-YYYY")}`,
  ];

  if (conferencia.auxiliar) {
    lines.push(`Auxiliar: ${conferencia.auxiliar}`);
  }

  return lines.join("\n");
};

export const ConferenciasTable: React.FC = () => {
  const isSmallScreen = useMediaQuery("(max-width: 768px)");
  const isAdminApp = useIsAdminApp();
  const isReadOnly = !isAdminApp;

  const [conferencias, setConferencias] = useState<Conferencia[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConferencia, setEditingConferencia] = useState<Conferencia | null>(
    null
  );
  const [isLocalSpeaker, setIsLocalSpeaker] = useState(false);
  const [form] = Form.useForm();
  const { miembros } = useDirectory();
  const leadershipMembers = useMemo(
    () =>
      miembros
        .filter(isLeadershipMember)
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [miembros],
  );

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const data = await getCollection<ConferenciaResponse>("conferencias", {
        "pagination[pageSize]": 1000,
      });
      const mapped = data.map(mapConferencia);
      if (mounted) {
        setConferencias(mapped);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const openModal = (record?: Conferencia) => {
    if (isReadOnly) return;
    setEditingConferencia(record || null);
    if (record) {
      const matchedLocalSpeaker = leadershipMembers.find(
        (member) => member.nombre.trim().toLowerCase() === record.orador.trim().toLowerCase()
      );
      setIsLocalSpeaker(Boolean(matchedLocalSpeaker));
      form.setFieldsValue({
        ...record,
        localSpeaker: Boolean(matchedLocalSpeaker),
        localOrador: matchedLocalSpeaker?.id,
        tema: record.temaId,
        auxiliar: record.auxiliarId,
        fecha: dayjs(record.fecha),
      });
    } else {
      setIsLocalSpeaker(false);
      form.resetFields();
      form.setFieldsValue({ localSpeaker: false });
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (isReadOnly) return;
    await deleteEntry("conferencias", Number(id));
    setConferencias(conferencias.filter((c) => c.id !== id));
    form.resetFields();
  };

  const handleSave = async (values: any) => {
    if (isReadOnly) return;
    const selectedLocalSpeaker = leadershipMembers.find(
      (member) => member.id === values.localOrador
    );
    const payload = {
      orador:
        values.localSpeaker && selectedLocalSpeaker
          ? selectedLocalSpeaker.nombre
          : values.orador,
      tema: values.tema,
      cancion: values.cancion,
      cong: values.cong,
      auxiliar: values.auxiliar,
      fecha: values.fecha.format("YYYY-MM-DD"),
    };

    if (editingConferencia) {
      await updateEntry("conferencias", Number(editingConferencia.id), payload);
    } else {
      await createEntry("conferencias", payload);
    }

    const data = await getCollection<ConferenciaResponse>("conferencias", {
      "pagination[pageSize]": 1000,
    });
    setConferencias(data.map(mapConferencia));
    form.resetFields();
    setIsLocalSpeaker(false);
    setIsModalOpen(false);
    setEditingConferencia(null);
  };

  const columns: ColumnsType<Conferencia> = [
    {
      title: "Orador",
      dataIndex: "orador",
      key: "orador",
      fixed: true,
      filters: Array.from(
        new Set(conferencias.map((c) => c.orador).filter(Boolean))
      ).map((orador) => ({
        text: orador,
        value: orador,
      })),
      onFilter: (value, record) => record.orador.includes(value as string),
    },
    {
      align: "center",
      title: "Congregación",
      dataIndex: "cong",
      key: "cong",
    },
    {
      align: "center",
      width: "25%",
      title: "Tema",
      dataIndex: "tema",
      key: "tema",
    },
    {
      align: "center",
      width: "20",
      title: "Canción",
      dataIndex: "cancion",
      key: "cancion",
    },
    {
      align: "center",
      width: "30",
      title: "Fecha",
      dataIndex: "fecha",
      key: "fecha",
    },
    {
      title: "Auxiliar",
      dataIndex: "auxiliar",
      key: "auxiliar",
    },
    {
      align: "center",
      width: "30",
      title: "Menu",
      key: "menu",
      render: (_: unknown, record: Conferencia) => (
        <Space>
          <WhatsAppShareButton message={buildConferenceWhatsAppMessage(record)} />
          {isAdminApp && (
            <>
                <Button
                  ghost
                  type="primary"
                  size="small"
                  shape="circle"
                  icon={<EditOutlined />}
                  onClick={() => openModal(record)}
                />
                <Popconfirm
                  title="¿Estás seguro de eliminar esta conferencia?"
                  onConfirm={() => handleDelete(record.id)}
                  okText="Sí"
                  cancelText="No">
                  <Button size="small" shape="circle" icon={<DeleteOutlined />} danger />
                </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  const setStoredConferencias = (_data: Conferencia[]) => {};

  const renderMobileView = () => (
    <>
      {conferencias.map((item) => (
        <Card
          key={item.id}
          style={{ marginBottom: 16 }}
          actions={
            [
                  <WhatsAppShareButton
                    key="share"
                    message={buildConferenceWhatsAppMessage(item)}
                  />,
                  ...(isAdminApp
                    ? [
                  <Button
                    type="primary"
                    size="small"
                    shape="circle"
                    key="edit"
                    icon={<EditOutlined />}
                    onClick={() => openModal(item)}
                  />,
                  <Popconfirm
                    key="delete"
                    title="¿Estás seguro de eliminar esta conferencia?"
                    onConfirm={() => handleDelete(item.id)}
                    okText="Sí"
                    cancelText="No">
                    <Button size="small" shape="circle" danger icon={<DeleteOutlined />} />
                  </Popconfirm>,
                    ]
                    : []),
                ]
          }>
          <Flex vertical gap={4}>
            <Paragraph>
              <Text strong>Orador:</Text> {item.orador}
            </Paragraph>
            <Paragraph>
              <Text strong>Congregación:</Text> {item.cong}
            </Paragraph>
            <Paragraph>
              <Text strong>Tema:</Text> {item.tema}
            </Paragraph>
            <Paragraph>
              <Text strong>Canción:</Text> {item.cancion}
            </Paragraph>
            <Paragraph>
              <Text strong>Fecha:</Text> {item.fecha}
            </Paragraph>
            <Paragraph>
              <Text strong>Auxiliar:</Text> {item.auxiliar || "N/A"}
            </Paragraph>
          </Flex>
        </Card>
      ))}
    </>
  );

  return (
    <>
      <Flex gap={12} align="center" justify="flex-end" style={{ marginBottom: 16 }}>
        {isAdminApp && (
          <Button
            type="primary"
            onClick={() => openModal()}
            icon={<UserAddOutlined />}>
            Agregar
          </Button>
        )}
        <PDFConferencias data={conferencias} />
      </Flex>

      {isSmallScreen ? (
        renderMobileView()
      ) : (
        <Table
          columns={columns}
          dataSource={conferencias}
          rowKey="id"
          scroll={{ x: 600 }}
          size="small"
          pagination={false}
        />
      )}

      {isAdminApp && (
        <Modal
          title={editingConferencia ? "Editar Conferencia" : "Agregar Conferencia"}
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={null}
          width={isSmallScreen ? "100%" : 520}>
          <Form
            form={form}
            layout="vertical"
            initialValues={{ fecha: dayjs() }}
            onFinish={handleSave}>
            <Form.Item name="localSpeaker" valuePropName="checked" style={{ marginBottom: 12 }}>
              <Flex align="center" gap={8}>
                <Switch
                  onChange={(checked) => {
                    setIsLocalSpeaker(checked);
                    form.setFieldsValue({
                      localSpeaker: checked,
                      localOrador: checked ? form.getFieldValue("localOrador") : undefined,
                    });
                  }}
                />
                <Typography.Text>Local</Typography.Text>
              </Flex>
            </Form.Item>
            {isLocalSpeaker ? (
              <Form.Item
                name="localOrador"
                label="Orador"
                rules={[{ required: true, message: "Selecciona un orador local" }]}
              >
                <SelectSiervos placeholder="Selecciona un hermano" />
              </Form.Item>
            ) : (
              <Form.Item name="orador" label="Orador" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            )}
            <Form.Item name="cong" label="Congregación" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item
              name="tema"
              label="Tema del Bosquejo"
              rules={[{ required: true }]}>
              <SelectTemas />
            </Form.Item>
            <Space align="center" split size={12}>
              <Form.Item
                name="cancion"
                label="N° Canción"
                rules={[{ required: true }]}>
                <InputNumber />
              </Form.Item>
              <Form.Item name="fecha" label="Fecha" rules={[{ required: true }]}>
                <DatePicker format="YYYY-MM-DD" />
              </Form.Item>
            </Space>
            <Form.Item name="auxiliar" label="Auxiliar">
              <SelectSiervos />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">
                {editingConferencia ? "Guardar Cambios" : "Agregar Conferencia"}
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      )}
    </>
  );
};
