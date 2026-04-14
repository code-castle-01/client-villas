import React, { useEffect, useState } from "react";
import {
  Button,
  DatePicker,
  Flex,
  Form,
  Modal,
  Popconfirm,
  Space,
  Table,
  Card,
  Typography,
  Divider,
} from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import PDFReuniones from "../../components/PDFReuniones";
import SelectVarones from "../../components/select-varones";
import WhatsAppShareButton from "../../components/whatsapp-share-button";
import useMediaQuery from "../../hooks/useMediaQuery";
import { ColumnsType } from "antd/es/table";
import { createEntry, deleteEntry, getCollection, updateEntry } from "../../api/client";
import { useIsAdminApp } from "../../hooks/useIsAdminApp";

export interface Reunion {
  id: number;
  documentId?: string;
  fecha: string;
  presidenteId: number;
  presidente: string;
  lectorId: number;
  lector: string;
  oracionId: number;
  oracion: string;
}

const REUNIONES_RESOURCE = "reunions";

type ReunionRelation = {
  id: number;
  nombre: string;
} | null;

type ReunionResponse = {
  documentId?: string;
  fecha: string;
  presidente?: ReunionRelation;
  lector?: ReunionRelation;
  oracion?: ReunionRelation;
};

const mapReunion = (reunion: ReunionResponse & { id: number }): Reunion => ({
  id: reunion.id,
  documentId: reunion.documentId,
  fecha: dayjs(reunion.fecha).format("DD-MM-YYYY"),
  presidenteId: reunion.presidente?.id ?? 0,
  presidente: reunion.presidente?.nombre ?? "",
  lectorId: reunion.lector?.id ?? 0,
  lector: reunion.lector?.nombre ?? "",
  oracionId: reunion.oracion?.id ?? 0,
  oracion: reunion.oracion?.nombre ?? "",
});

const buildReunionWhatsAppMessage = (reunion: Reunion) =>
  [
    "Reunion",
    "",
    `Fecha: ${reunion.fecha}`,
    `Presidente: ${reunion.presidente || "Pendiente"}`,
    `Lector: ${reunion.lector || "Pendiente"}`,
    `Oracion: ${reunion.oracion || "Pendiente"}`,
  ].join("\n");

export const ReunionesTable: React.FC = () => {
  const [reuniones, setReuniones] = useState<Reunion[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [editingReunion, setEditingReunion] = useState<Reunion | null>(null);
  const isSmallScreen = useMediaQuery("(max-width: 768px)");
  const isAdminApp = useIsAdminApp();
  const isReadOnly = !isAdminApp;

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const data = await getCollection<ReunionResponse>(REUNIONES_RESOURCE, {
        "pagination[pageSize]": 1000,
      });
      const mapped = data.map(mapReunion);
      if (mounted) setReuniones(mapped);
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const openModal = (reunion: Reunion | null = null) => {
    if (isReadOnly) return;
    setEditingReunion(reunion);
    setIsModalOpen(true);
    if (reunion) {
      form.setFieldsValue({
        fecha: dayjs(reunion.fecha, "DD-MM-YYYY"),
        presidente: reunion.presidenteId,
        lector: reunion.lectorId,
        oracion: reunion.oracionId,
      });
    } else {
      form.resetFields();
    }
  };

  const handleSave = async (values: any) => {
    if (isReadOnly) return;
    const payload = {
      fecha: values.fecha.format("YYYY-MM-DD"),
      presidente: values.presidente,
      lector: values.lector,
      oracion: values.oracion,
    };

    if (editingReunion) {
      const targetId = editingReunion.documentId ?? editingReunion.id;
      await updateEntry(REUNIONES_RESOURCE, targetId as string, payload);
    } else {
      await createEntry(REUNIONES_RESOURCE, payload);
    }

    const data = await getCollection<ReunionResponse>(REUNIONES_RESOURCE, {
      "pagination[pageSize]": 1000,
    });
    setReuniones(data.map(mapReunion));

    setIsModalOpen(false);
    setEditingReunion(null);
  };

  const handleDelete = async (id: number) => {
    if (isReadOnly) return;
    const targetId =
      reuniones.find((reunion) => reunion.id === id)?.documentId ?? id;
    await deleteEntry(REUNIONES_RESOURCE, targetId as string);
    setReuniones(reuniones.filter((reunion) => reunion.id !== id));
  };

  const columns: ColumnsType<Reunion> = [
    {
      align: "center",
      width: "20%",
      title: "Fecha",
      dataIndex: "fecha",
      key: "fecha",
    },
    {
      align: "center",
      width: "20%",
      title: "Presidente",
      dataIndex: "presidente",
      key: "presidente",
    },
    {
      align: "center",
      width: "20%",
      title: "Lector",
      dataIndex: "lector",
      key: "lector",
    },
    {
      align: "center",
      width: "20%",
      title: "Oración",
      dataIndex: "oracion",
      key: "oracion",
    },
    {
      align: "center",
      width: "20%",
      title: "Menu",
      key: "menu",
      render: (_: any, record: Reunion) => (
        <Space size="middle">
          <WhatsAppShareButton message={buildReunionWhatsAppMessage(record)} />
          {isAdminApp && (
            <>
                <Button
                  size="small"
                  shape="circle"
                  type="primary"
                  ghost
                  onClick={() => openModal(record)}
                  icon={<EditOutlined />}
                />

                <Popconfirm
                  title="¿Estás seguro de eliminar esta reunión?"
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
            </>
          )}
        </Space>
      ),
    },
  ];

  const renderMobileView = () => (
    <>
      {reuniones.map((item) => (
        <Card
          key={item.id}
          style={{ marginBottom: 16 }}
          actions={
            [
                  <WhatsAppShareButton
                    key="share"
                    message={buildReunionWhatsAppMessage(item)}
                  />,
                  ...(isAdminApp
                    ? [
                  <Button
                    key="edit"
                    icon={<EditOutlined />}
                    onClick={() => openModal(item)}
                    size="small"
                  />,
                  <Popconfirm
                    key="delete"
                    title="¿Estás seguro de eliminar esta reunión?"
                    onConfirm={() => handleDelete(item.id)}
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
            <Typography.Text strong>Fecha: {item.fecha}</Typography.Text>
            <Divider />
            <Typography.Text>
              <strong>Presidente:</strong> {item.presidente}
            </Typography.Text>
            <Typography.Text>
              <strong>Lector:</strong> {item.lector}
            </Typography.Text>
            <Typography.Text>
              <strong>Oración:</strong> {item.oracion}
            </Typography.Text>
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
          <Button type="primary" onClick={() => openModal()}>
            Nueva Reunión
          </Button>
        )}
        <PDFReuniones data={reuniones} />
      </Flex>

      {isSmallScreen ? (
        renderMobileView()
      ) : (
        <Table
          columns={columns}
          dataSource={reuniones}
          rowKey="id"
          scroll={{ x: 600 }}
          pagination={false}
        />
      )}

      {isAdminApp && (
        <Modal
          title={editingReunion ? "Editar Reunión" : "Agregar Reunión"}
          open={isModalOpen}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingReunion(null);
          }}
          footer={null}
        >
          <Form form={form} layout="vertical" onFinish={handleSave}>
            <Form.Item name="fecha" label="Fecha" rules={[{ required: true }]}>
              <DatePicker format="DD-MM-YYYY" />
            </Form.Item>
            <Form.Item
              name="presidente"
              label="Presidente"
              rules={[{ required: true }]}
            >
              <SelectVarones />
            </Form.Item>
            <Form.Item name="lector" label="Lector" rules={[{ required: true }]}>
              <SelectVarones />
            </Form.Item>
            <Form.Item
              name="oracion"
              label="Oración"
              rules={[{ required: true }]}
            >
              <SelectVarones />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">
                {editingReunion ? "Guardar Cambios" : "Agregar Reunión"}
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      )}
    </>
  );
};
