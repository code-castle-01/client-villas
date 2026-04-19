import React, { useEffect, useMemo, useState } from "react";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import {
  Button as MobileButton,
  Card as MobileCard,
  NoticeBar,
  Space as MobileSpace,
  Tag as MobileTag,
} from "antd-mobile";
import {
  Button,
  DatePicker,
  Empty,
  Flex,
  Form,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tabs,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useAdaptiveUI } from "../../adaptive/useAdaptiveUI";
import { createEntry, deleteEntry, getCollection, updateEntry } from "../../api/client";
import PDFReuniones from "../../components/PDFReuniones";
import SelectVarones from "../../components/select-varones";
import WhatsAppShareButton from "../../components/whatsapp-share-button";
import useMediaQuery from "../../hooks/useMediaQuery";
import { useIsAdminApp } from "../../hooks/useIsAdminApp";
import {
  getMonthKeyFromIsoDate,
  getMonthLabel,
  MONTH_TAB_ITEMS,
  resolveDefaultMonthKey,
} from "../../utils/monthTabs";

export interface Reunion {
  id: number;
  documentId?: string;
  dateValue: string;
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
  dateValue: reunion.fecha,
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
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const isSmallScreen = useMediaQuery("(max-width: 768px)");
  const { resolvedMode, setOverrideMode } = useAdaptiveUI();
  const isAdminApp = useIsAdminApp();
  const isNativeMobile = resolvedMode === "mobile";
  const canEditInCurrentView = isAdminApp && !isNativeMobile;

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

  const defaultMonthKey = useMemo(
    () =>
      resolveDefaultMonthKey(
        reuniones,
        (reunion) => getMonthKeyFromIsoDate(reunion.dateValue),
      ),
    [reuniones],
  );

  const activeMonthKey = selectedMonthKey ?? defaultMonthKey;

  const filteredReuniones = useMemo(
    () =>
      reuniones.filter(
        (reunion) => getMonthKeyFromIsoDate(reunion.dateValue) === activeMonthKey,
      ),
    [activeMonthKey, reuniones],
  );

  const activeMonthLabel = getMonthLabel(activeMonthKey);

  const openModal = (reunion: Reunion | null = null) => {
    if (!canEditInCurrentView) return;

    setEditingReunion(reunion);
    setIsModalOpen(true);
    if (reunion) {
      form.setFieldsValue({
        fecha: dayjs(reunion.dateValue),
        presidente: reunion.presidenteId,
        lector: reunion.lectorId,
        oracion: reunion.oracionId,
      });
    } else {
      form.resetFields();
    }
  };

  const handleSave = async (values: any) => {
    if (!canEditInCurrentView) return;

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
    if (!canEditInCurrentView) return;

    const targetId = reuniones.find((item) => item.id === id)?.documentId ?? id;
    await deleteEntry(REUNIONES_RESOURCE, targetId as string);
    setReuniones((current) => current.filter((item) => item.id !== id));
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
      render: (_value: unknown, record: Reunion) => (
        <Space size="middle">
          <WhatsAppShareButton message={buildReunionWhatsAppMessage(record)} />
          {canEditInCurrentView && (
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
                <Button size="small" shape="circle" danger icon={<DeleteOutlined />} />
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
          content="La edición administrativa de reuniones sigue disponible en la vista desktop."
          extra={
            <MobileButton size="mini" onClick={() => setOverrideMode("desktop")}>
              Ir a desktop
            </MobileButton>
          }
        />
      )}

      {filteredReuniones.length === 0 ? (
        <MobileCard className="mobile-screen-card">
          <Empty description={`No hay reuniones para ${activeMonthLabel}`} />
        </MobileCard>
      ) : (
        filteredReuniones.map((item) => (
          <MobileCard
            key={item.id}
            className="mobile-screen-card"
            title={item.presidente || "Reunión"}
            extra={<MobileTag color="primary" fill="outline">{item.fecha}</MobileTag>}
          >
            <MobileSpace direction="vertical" block style={{ width: "100%" }}>
              <div>
                <strong>Presidente:</strong> {item.presidente || "Pendiente"}
              </div>
              <div>
                <strong>Lector:</strong> {item.lector || "Pendiente"}
              </div>
              <div>
                <strong>Oración:</strong> {item.oracion || "Pendiente"}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <WhatsAppShareButton
                  message={buildReunionWhatsAppMessage(item)}
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
              items={MONTH_TAB_ITEMS}
              onChange={setSelectedMonthKey}
              tabBarStyle={{ margin: 0, paddingTop: 8 }}
            />
          </div>

          <Space wrap size={12}>
            {canEditInCurrentView && (
              <Button type="primary" onClick={() => openModal()}>
                Nueva Reunión
              </Button>
            )}
            <PDFReuniones data={filteredReuniones} />
          </Space>
        </Flex>

        {isNativeMobile ? (
          renderMobileView()
        ) : (
          <Table
            columns={columns}
            dataSource={filteredReuniones}
            rowKey="id"
            scroll={{ x: 600 }}
            pagination={false}
            locale={{
              emptyText: `No hay reuniones para ${activeMonthLabel}`,
            }}
          />
        )}
      </Flex>

      {canEditInCurrentView && (
        <Modal
          title={editingReunion ? "Editar Reunión" : "Agregar Reunión"}
          open={isModalOpen}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingReunion(null);
          }}
          footer={null}
          width={isSmallScreen ? "100%" : 520}
        >
          <Form form={form} layout="vertical" onFinish={handleSave}>
            <Form.Item name="fecha" label="Fecha" rules={[{ required: true }]}>
              <DatePicker format="DD-MM-YYYY" />
            </Form.Item>
            <Form.Item name="presidente" label="Presidente" rules={[{ required: true }]}>
              <SelectVarones />
            </Form.Item>
            <Form.Item name="lector" label="Lector" rules={[{ required: true }]}>
              <SelectVarones />
            </Form.Item>
            <Form.Item name="oracion" label="Oración" rules={[{ required: true }]}>
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
