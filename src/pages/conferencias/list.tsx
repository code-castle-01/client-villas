import React, { useEffect, useMemo, useState } from "react";
import { DeleteOutlined, EditOutlined, UserAddOutlined } from "@ant-design/icons";
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
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tabs,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useAdaptiveUI } from "../../adaptive/useAdaptiveUI";
import { createEntry, deleteEntry, getCollection, updateEntry } from "../../api/client";
import PDFConferencias from "../../components/PDFConferencias";
import SelectSiervos from "../../components/select-siervos";
import SelectTemas from "../../components/select-temas";
import WhatsAppShareButton from "../../components/whatsapp-share-button";
import { useDirectory } from "../../contexts/directory";
import useMediaQuery from "../../hooks/useMediaQuery";
import { useIsAdminApp } from "../../hooks/useIsAdminApp";
import {
  getMonthKeyFromIsoDate,
  getMonthLabel,
  MONTH_TAB_ITEMS,
  resolveDefaultMonthKey,
} from "../../utils/monthTabs";

export interface Conferencia {
  id: string;
  documentId?: string;
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
  documentId?: string;
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
  documentId: conferencia.documentId,
  orador: conferencia.orador,
  temaId: conferencia.tema?.id,
  tema: conferencia.tema?.titulo ?? "",
  cancion: conferencia.cancion ? String(conferencia.cancion) : "",
  cong: conferencia.cong,
  auxiliarId: conferencia.auxiliar?.id,
  auxiliar: conferencia.auxiliar?.nombre ?? "",
  fecha: conferencia.fecha,
});

const getConferenciaDateValue = (conferencia: Conferencia) => {
  const parsedDate = dayjs(conferencia.fecha);
  return parsedDate.isValid() ? parsedDate.valueOf() : Number.MAX_SAFE_INTEGER;
};

const sortConferenciasByDate = (conferencias: Conferencia[]) =>
  [...conferencias].sort((left, right) => {
    const dateComparison =
      getConferenciaDateValue(left) - getConferenciaDateValue(right);

    if (dateComparison !== 0) {
      return dateComparison;
    }

    return Number(left.id) - Number(right.id);
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
  const { resolvedMode, setOverrideMode } = useAdaptiveUI();
  const isAdminApp = useIsAdminApp();
  const isNativeMobile = resolvedMode === "mobile";
  const canEditInCurrentView = isAdminApp && !isNativeMobile;

  const [conferencias, setConferencias] = useState<Conferencia[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConferencia, setEditingConferencia] = useState<Conferencia | null>(
    null,
  );
  const [isLocalSpeaker, setIsLocalSpeaker] = useState(false);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
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
        "sort[0]": "fecha:asc",
      });

      if (mounted) {
        setConferencias(sortConferenciasByDate(data.map(mapConferencia)));
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const defaultMonthKey = useMemo(
    () =>
      resolveDefaultMonthKey(
        conferencias,
        (conferencia) => getMonthKeyFromIsoDate(conferencia.fecha),
      ),
    [conferencias],
  );

  const activeMonthKey = selectedMonthKey ?? defaultMonthKey;

  const filteredConferencias = useMemo(
    () =>
      sortConferenciasByDate(
        conferencias.filter(
          (conferencia) =>
            getMonthKeyFromIsoDate(conferencia.fecha) === activeMonthKey,
        ),
      ),
    [activeMonthKey, conferencias],
  );

  const activeMonthLabel = getMonthLabel(activeMonthKey);

  const openModal = (record?: Conferencia) => {
    if (!canEditInCurrentView) return;

    setEditingConferencia(record || null);
    if (record) {
      const matchedLocalSpeaker = leadershipMembers.find(
        (member) =>
          member.nombre.trim().toLowerCase() ===
          record.orador.trim().toLowerCase(),
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
    if (!canEditInCurrentView) return;

    const targetId = conferencias.find((item) => item.id === id)?.documentId ?? id;
    await deleteEntry("conferencias", targetId);
    setConferencias((current) => current.filter((item) => item.id !== id));
    form.resetFields();
  };

  const handleSave = async (values: any) => {
    if (!canEditInCurrentView) return;

    const selectedLocalSpeaker = leadershipMembers.find(
      (member) => member.id === values.localOrador,
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
      const targetId = editingConferencia.documentId ?? editingConferencia.id;
      await updateEntry("conferencias", targetId, payload);
    } else {
      await createEntry("conferencias", payload);
    }

    const data = await getCollection<ConferenciaResponse>("conferencias", {
      "pagination[pageSize]": 1000,
      "sort[0]": "fecha:asc",
    });

    setConferencias(sortConferenciasByDate(data.map(mapConferencia)));
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
        new Set(filteredConferencias.map((item) => item.orador).filter(Boolean)),
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
      render: (_value: unknown, record: Conferencia) => (
        <Space>
          <WhatsAppShareButton message={buildConferenceWhatsAppMessage(record)} />
          {canEditInCurrentView && (
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
                cancelText="No"
              >
                <Button size="small" shape="circle" icon={<DeleteOutlined />} danger />
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
          content="La edición administrativa de conferencias sigue disponible en la vista desktop."
          extra={
            <MobileButton size="mini" onClick={() => setOverrideMode("desktop")}>
              Ir a desktop
            </MobileButton>
          }
        />
      )}

      {filteredConferencias.length === 0 ? (
        <MobileCard className="mobile-screen-card">
          <Empty description={`No hay conferencias para ${activeMonthLabel}`} />
        </MobileCard>
      ) : (
        filteredConferencias.map((item) => (
          <MobileCard
            key={item.id}
            className="mobile-screen-card"
            title={item.orador}
            extra={<MobileTag color="primary" fill="outline">{item.fecha}</MobileTag>}
          >
            <MobileSpace direction="vertical" block style={{ width: "100%" }}>
              <div>
                <strong>Congregación:</strong> {item.cong}
              </div>
              <div>
                <strong>Tema:</strong> {item.tema || "Pendiente"}
              </div>
              <div>
                <strong>Canción:</strong> {item.cancion || "Pendiente"}
              </div>
              <div>
                <strong>Auxiliar:</strong> {item.auxiliar || "N/A"}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <WhatsAppShareButton
                  message={buildConferenceWhatsAppMessage(item)}
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
              <Button
                type="primary"
                onClick={() => openModal()}
                icon={<UserAddOutlined />}
              >
                Agregar
              </Button>
            )}
            <PDFConferencias data={filteredConferencias} />
          </Space>
        </Flex>

        {isNativeMobile ? (
          renderMobileView()
        ) : (
          <Table
            columns={columns}
            dataSource={filteredConferencias}
            rowKey="id"
            scroll={{ x: 600 }}
            size="small"
            pagination={false}
            locale={{
              emptyText: `No hay conferencias para ${activeMonthLabel}`,
            }}
          />
        )}
      </Flex>

      {canEditInCurrentView && (
        <Modal
          title={editingConferencia ? "Editar Conferencia" : "Agregar Conferencia"}
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={null}
          width={isSmallScreen ? "100%" : 520}
        >
          <Form
            form={form}
            layout="vertical"
            initialValues={{ fecha: dayjs() }}
            onFinish={handleSave}
          >
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
              rules={[{ required: true }]}
            >
              <SelectTemas />
            </Form.Item>
            <Space align="center" split size={12}>
              <Form.Item name="cancion" label="N° Canción" rules={[{ required: true }]}>
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
