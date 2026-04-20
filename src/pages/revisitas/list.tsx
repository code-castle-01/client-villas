import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Button as MobileButton,
  Card as MobileCard,
  Dialog,
  Empty as MobileEmpty,
  Space as MobileSpace,
  Tag as MobileTag,
} from "antd-mobile";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/es";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { useAdaptiveUI } from "../../adaptive/useAdaptiveUI";
import { createEntry, deleteEntry, getCollection, updateEntry } from "../../api/client";
import { ColorModeContext } from "../../contexts/color-mode";
import useMediaQuery from "../../hooks/useMediaQuery";
import "../grupos/styles.css";
import "./styles.css";

dayjs.locale("es");

type RevisitaRecord = {
  id: number;
  documentId?: string;
  nombre: string;
  descripcionFisica?: string;
  direccion?: string;
  fechaHoraVisita?: string | null;
  temaConversado?: string;
  textosUsados?: string;
  publicacionDejada?: string;
  religionIdeologia?: string;
  familia?: string;
  asuntosInteres?: string;
  otrosDetalles?: string;
  proximaVisita?: string | null;
  preguntaPendiente?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type RevisitaFormValues = {
  nombre: string;
  descripcionFisica?: string;
  direccion?: string;
  fechaHoraVisita?: Dayjs | null;
  temaConversado?: string;
  textosUsados?: string;
  publicacionDejada?: string;
  religionIdeologia?: string;
  familia?: string;
  asuntosInteres?: string;
  otrosDetalles?: string;
  proximaVisita?: Dayjs | null;
  preguntaPendiente?: string;
};

const formatDateTime = (value?: string | null) =>
  value ? dayjs(value).format("DD/MM/YYYY hh:mm A") : "Sin fecha";

const sanitizeText = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const toFormValues = (record: RevisitaRecord): RevisitaFormValues => ({
  nombre: record.nombre,
  descripcionFisica: record.descripcionFisica ?? "",
  direccion: record.direccion ?? "",
  fechaHoraVisita: record.fechaHoraVisita ? dayjs(record.fechaHoraVisita) : null,
  temaConversado: record.temaConversado ?? "",
  textosUsados: record.textosUsados ?? "",
  publicacionDejada: record.publicacionDejada ?? "",
  religionIdeologia: record.religionIdeologia ?? "",
  familia: record.familia ?? "",
  asuntosInteres: record.asuntosInteres ?? "",
  otrosDetalles: record.otrosDetalles ?? "",
  proximaVisita: record.proximaVisita ? dayjs(record.proximaVisita) : null,
  preguntaPendiente: record.preguntaPendiente ?? "",
});

const buildPayload = (values: RevisitaFormValues) => ({
  nombre: values.nombre.trim(),
  descripcionFisica: sanitizeText(values.descripcionFisica),
  direccion: sanitizeText(values.direccion),
  fechaHoraVisita: values.fechaHoraVisita?.toISOString(),
  temaConversado: sanitizeText(values.temaConversado),
  textosUsados: sanitizeText(values.textosUsados),
  publicacionDejada: sanitizeText(values.publicacionDejada),
  religionIdeologia: sanitizeText(values.religionIdeologia),
  familia: sanitizeText(values.familia),
  asuntosInteres: sanitizeText(values.asuntosInteres),
  otrosDetalles: sanitizeText(values.otrosDetalles),
  proximaVisita: values.proximaVisita?.toISOString(),
  preguntaPendiente: sanitizeText(values.preguntaPendiente),
});

const getStatusTag = (record: RevisitaRecord) => {
  if (!record.proximaVisita) {
    return <Tag>Sin próxima visita</Tag>;
  }

  const nextVisit = dayjs(record.proximaVisita);

  if (nextVisit.isSame(dayjs(), "day")) {
    return <Tag color="green">Hoy</Tag>;
  }

  if (nextVisit.isBefore(dayjs(), "day")) {
    return <Tag color="red">Pendiente</Tag>;
  }

  return <Tag color="blue">Programada</Tag>;
};

const matchesSearch = (record: RevisitaRecord, searchValue: string) => {
  if (!searchValue) {
    return true;
  }

  const searchableText = [
    record.nombre,
    record.direccion,
    record.temaConversado,
    record.textosUsados,
    record.publicacionDejada,
    record.religionIdeologia,
    record.preguntaPendiente,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchableText.includes(searchValue);
};

const sortRevisitas = (records: RevisitaRecord[]) =>
  [...records].sort((left, right) => {
    const leftNext = left.proximaVisita ? dayjs(left.proximaVisita).valueOf() : Number.MAX_SAFE_INTEGER;
    const rightNext = right.proximaVisita ? dayjs(right.proximaVisita).valueOf() : Number.MAX_SAFE_INTEGER;

    if (leftNext !== rightNext) {
      return leftNext - rightNext;
    }

    const leftUpdated = left.updatedAt ? dayjs(left.updatedAt).valueOf() : 0;
    const rightUpdated = right.updatedAt ? dayjs(right.updatedAt).valueOf() : 0;
    return rightUpdated - leftUpdated;
  });

export const RevisitasPage: React.FC = () => {
  const { mode } = useContext(ColorModeContext);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [editingRecord, setEditingRecord] = useState<RevisitaRecord | null>(null);
  const [records, setRecords] = useState<RevisitaRecord[]>([]);
  const [form] = Form.useForm<RevisitaFormValues>();

  const isSmallScreen = useMediaQuery("(max-width: 768px)");
  const { resolvedMode } = useAdaptiveUI();
  const isNativeMobile = resolvedMode === "mobile";

  const loadRevisitas = async () => {
    setLoading(true);
    try {
      const data = await getCollection<RevisitaRecord>("revisitas");
      setRecords(sortRevisitas(data));
    } catch (error: any) {
      const detail =
        error?.response?.data?.error?.message ||
        error?.message ||
        "No se pudieron cargar las revisitas.";
      message.error(detail);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRevisitas();
  }, []);

  const filteredRecords = useMemo(
    () => records.filter((record) => matchesSearch(record, searchValue.trim().toLowerCase())),
    [records, searchValue],
  );

  const stats = useMemo(() => {
    const today = dayjs();

    return {
      total: records.length,
      programadas: records.filter((record) => Boolean(record.proximaVisita)).length,
      hoy: records.filter(
        (record) => record.proximaVisita && dayjs(record.proximaVisita).isSame(today, "day"),
      ).length,
      pendientes: records.filter(
        (record) => record.proximaVisita && dayjs(record.proximaVisita).isBefore(today, "day"),
      ).length,
    };
  }, [records]);

  const closeModal = () => {
    setModalOpen(false);
    setEditingRecord(null);
    form.resetFields();
  };

  const openCreateModal = () => {
    setEditingRecord(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (record: RevisitaRecord) => {
    setEditingRecord(record);
    form.setFieldsValue(toFormValues(record));
    setModalOpen(true);
  };

  const handleSubmit = async (values: RevisitaFormValues) => {
    setSaving(true);

    try {
      const payload = buildPayload(values);

      if (editingRecord) {
        await updateEntry<RevisitaRecord>("revisitas", editingRecord.id, payload);
        message.success("Revisita actualizada correctamente.");
      } else {
        await createEntry<RevisitaRecord>("revisitas", payload);
        message.success("Revisita registrada correctamente.");
      }

      closeModal();
      await loadRevisitas();
    } catch (error: any) {
      const detail =
        error?.response?.data?.error?.message ||
        error?.message ||
        "No se pudo guardar la revisita.";
      message.error(detail);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record: RevisitaRecord) => {
    try {
      await deleteEntry("revisitas", record.id);
      message.success("Revisita eliminada.");
      await loadRevisitas();
    } catch (error: any) {
      const detail =
        error?.response?.data?.error?.message ||
        error?.message ||
        "No se pudo eliminar la revisita.";
      message.error(detail);
    }
  };

  const getMobileStatusTag = (record: RevisitaRecord) => {
    if (!record.proximaVisita) {
      return <MobileTag fill="outline">Sin próxima</MobileTag>;
    }

    const nextVisit = dayjs(record.proximaVisita);

    if (nextVisit.isSame(dayjs(), "day")) {
      return <MobileTag color="success">Hoy</MobileTag>;
    }

    if (nextVisit.isBefore(dayjs(), "day")) {
      return <MobileTag color="danger">Pendiente</MobileTag>;
    }

    return <MobileTag color="primary" fill="outline">Programada</MobileTag>;
  };

  const confirmMobileDelete = (record: RevisitaRecord) => {
    Dialog.confirm({
      title: "Eliminar revisita",
      content: "Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      onConfirm: () => handleDelete(record),
    });
  };

  const statItems = [
    ["Total", stats.total],
    ["Con próxima visita", stats.programadas],
    ["Para hoy", stats.hoy],
    ["Pendientes", stats.pendientes],
  ];

  const renderMobileList = () =>
    filteredRecords.length ? (
      <div className="revisitas-mobile-list">
        {filteredRecords.map((record) => (
          <MobileCard
            key={record.id}
            className="mobile-screen-card revisitas-mobile-card"
            title={record.nombre}
            extra={getMobileStatusTag(record)}
          >
            <MobileSpace direction="vertical" block style={{ width: "100%" }}>
              <div className="revisitas-mobile-card__date">
                Última visita: {formatDateTime(record.fechaHoraVisita)}
              </div>

              <div className="revisitas-detail revisitas-detail--mobile">
                {[
                  ["Próxima visita", formatDateTime(record.proximaVisita)],
                  ["Tema", record.temaConversado],
                  ["Dirección", record.direccion],
                  ["Textos usados", record.textosUsados],
                  ["Pregunta pendiente", record.preguntaPendiente],
                ].map(([label, value]) => (
                  <div key={String(label)} className="revisitas-detail__item">
                    <span className="revisitas-detail__label">{label}</span>
                    <p className="revisitas-detail__value">{value || "Sin registrar"}</p>
                  </div>
                ))}
              </div>

              <div className="revisitas-mobile-card__actions">
                <MobileButton
                  size="small"
                  fill="outline"
                  onClick={() => openEditModal(record)}
                >
                  <EditOutlined /> Editar
                </MobileButton>
                <MobileButton
                  size="small"
                  color="danger"
                  fill="outline"
                  onClick={() => confirmMobileDelete(record)}
                >
                  <DeleteOutlined /> Eliminar
                </MobileButton>
              </div>
            </MobileSpace>
          </MobileCard>
        ))}
      </div>
    ) : (
      <MobileCard className="mobile-screen-card">
        <MobileEmpty description="Todavía no tienes revisitas registradas." />
      </MobileCard>
    );

  return (
    <section
      className={`grupos-page ${
        mode === "dark" ? "grupos-page--dark" : "grupos-page--light"
      }`}
    >
      <div className="grupos-page__header">
        <div>
          <Typography.Title level={3} className="grupos-page__title">
            Revisitas
          </Typography.Title>
          <Typography.Text className="grupos-page__subtitle">
            Agenda personal y privada para llevar el control del servicio del campo.
          </Typography.Text>
        </div>

        <Space wrap>
          <Button
            className="grupos-btn grupos-btn--ghost"
            icon={<ReloadOutlined />}
            onClick={() => void loadRevisitas()}
            loading={loading}
          >
            Recargar
          </Button>
          <Button
            type="primary"
            className="grupos-btn grupos-btn--primary"
            icon={<PlusOutlined />}
            onClick={openCreateModal}
          >
            Nueva revisita
          </Button>
        </Space>
      </div>

      {isNativeMobile ? (
        <div className="revisitas-mobile-stats">
          {statItems.map(([label, value]) => (
            <MobileCard key={String(label)} className="mobile-screen-card revisitas-mobile-stat">
              <span>{label}</span>
              <strong>{value}</strong>
            </MobileCard>
          ))}
        </div>
      ) : (
        <Row gutter={[16, 16]} className="revisitas-stats">
          <Col xs={24} sm={12} xl={6}>
            <Card className="revisitas-stat-card" bordered={false}>
              <Statistic title="Total" value={stats.total} />
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Card className="revisitas-stat-card" bordered={false}>
              <Statistic title="Con próxima visita" value={stats.programadas} />
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Card className="revisitas-stat-card" bordered={false}>
              <Statistic title="Para hoy" value={stats.hoy} />
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Card className="revisitas-stat-card" bordered={false}>
              <Statistic title="Pendientes" value={stats.pendientes} />
            </Card>
          </Col>
        </Row>
      )}

      <Card className="grupos-card" bordered={false}>
        <Flex
          wrap="wrap"
          justify="space-between"
          align="center"
          style={{ padding: "0 0 20px", gap: 12 }}
        >
          <div>
            <Typography.Title level={5} style={{ margin: 0 }}>
              Registro individual
            </Typography.Title>
            <Typography.Text type="secondary">
              Solo tú puedes ver y administrar estas revisitas.
            </Typography.Text>
          </div>

          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Buscar por nombre, dirección o tema"
            style={{ width: isSmallScreen ? "100%" : 320 }}
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
          />
        </Flex>

        {isNativeMobile ? (
          renderMobileList()
        ) : (
          <Table<RevisitaRecord>
            className="grupos-table"
            rowKey="id"
            loading={loading}
            dataSource={filteredRecords}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            locale={{
              emptyText: (
                <Empty description="Todavía no tienes revisitas registradas." />
              ),
            }}
            expandable={{
              expandedRowRender: (record) => (
                <div className="revisitas-detail">
                  {[
                    ["Descripción física", record.descripcionFisica],
                    ["Dirección", record.direccion],
                    ["Tema conversado", record.temaConversado],
                    ["Textos usados", record.textosUsados],
                    ["Publicación dejada", record.publicacionDejada],
                    ["Religión o ideología", record.religionIdeologia],
                    ["Familia", record.familia],
                    ["Asuntos de interés", record.asuntosInteres],
                    ["Otros detalles", record.otrosDetalles],
                    ["Pregunta pendiente", record.preguntaPendiente],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="revisitas-detail__item">
                      <span className="revisitas-detail__label">{label}</span>
                      <p className="revisitas-detail__value">{value || "Sin registrar"}</p>
                    </div>
                  ))}
                </div>
              ),
            }}
            scroll={{ x: true }}
          >
            <Table.Column<RevisitaRecord>
              title="Nombre"
              dataIndex="nombre"
              sorter={(left, right) => left.nombre.localeCompare(right.nombre, "es")}
              render={(value: string) => (
                <span className="grupos-table__name">{value}</span>
              )}
            />
            <Table.Column<RevisitaRecord>
              title="Visita"
              dataIndex="fechaHoraVisita"
              sorter={(left, right) =>
                dayjs(left.fechaHoraVisita ?? 0).valueOf() -
                dayjs(right.fechaHoraVisita ?? 0).valueOf()
              }
              render={(value?: string | null) => formatDateTime(value)}
            />
            <Table.Column<RevisitaRecord>
              title="Próxima visita"
              dataIndex="proximaVisita"
              sorter={(left, right) =>
                dayjs(left.proximaVisita ?? 0).valueOf() -
                dayjs(right.proximaVisita ?? 0).valueOf()
              }
              render={(value?: string | null, record?: RevisitaRecord) => (
                <Space direction="vertical" size={2}>
                  <span>{formatDateTime(value)}</span>
                  {record ? getStatusTag(record) : null}
                </Space>
              )}
            />
            <Table.Column<RevisitaRecord>
              title="Tema"
              dataIndex="temaConversado"
              render={(value?: string) =>
                value ? value : <Typography.Text type="secondary">Sin registrar</Typography.Text>
              }
            />
            <Table.Column<RevisitaRecord>
              title="Dirección"
              dataIndex="direccion"
              render={(value?: string) =>
                value ? value : <Typography.Text type="secondary">Sin registrar</Typography.Text>
              }
            />
            <Table.Column<RevisitaRecord>
              title="Acciones"
              key="actions"
              width={120}
              render={(_, record) => (
                <Space>
                  <Button
                    className="grupos-action-btn"
                    icon={<EditOutlined />}
                    onClick={() => openEditModal(record)}
                  />
                  <Popconfirm
                    title="Eliminar revisita"
                    description="Esta acción no se puede deshacer."
                    okText="Eliminar"
                    cancelText="Cancelar"
                    onConfirm={() => void handleDelete(record)}
                  >
                    <Button
                      danger
                      className="grupos-action-btn grupos-action-btn--danger"
                      icon={<DeleteOutlined />}
                    />
                  </Popconfirm>
                </Space>
              )}
            />
          </Table>
        )}
      </Card>

      <Modal
        title={null}
        open={modalOpen}
        onCancel={closeModal}
        footer={
          <Space>
            <Button onClick={closeModal}>Cancelar</Button>
            <Button type="primary" loading={saving} onClick={() => form.submit()}>
              {editingRecord ? "Guardar cambios" : "Registrar revisita"}
            </Button>
          </Space>
        }
        width={isSmallScreen ? "100%" : 960}
        className={`grupos-modal ${
          mode === "dark" ? "grupos-modal--dark" : "grupos-modal--light"
        }`}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            nombre: "",
          }}
        >
          <div className="revisitas-sheet">
            <div className="revisitas-sheet__header">
              <h2 className="revisitas-sheet__title">Registro individual para revisitas</h2>
              <span className="revisitas-sheet__note">Agenda personal del publicador</span>
            </div>

            <div className="revisitas-sheet__body">
              <div className="revisitas-sheet__row">
                <div className="revisitas-sheet__label">Nombre</div>
                <div className="revisitas-sheet__field">
                  <Form.Item
                    name="nombre"
                    rules={[{ required: true, message: "Escribe el nombre." }]}
                  >
                    <Input placeholder="Nombre de la persona" />
                  </Form.Item>
                </div>
              </div>

              <div className="revisitas-sheet__row">
                <div className="revisitas-sheet__label">Descripción física</div>
                <div className="revisitas-sheet__field">
                  <Form.Item name="descripcionFisica">
                    <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
                  </Form.Item>
                </div>
              </div>

              <div className="revisitas-sheet__row">
                <div className="revisitas-sheet__label">Dirección</div>
                <div className="revisitas-sheet__field revisitas-sheet__field--tall">
                  <Form.Item name="direccion">
                    <Input.TextArea autoSize={{ minRows: 3, maxRows: 5 }} />
                  </Form.Item>
                </div>
              </div>

              <div className="revisitas-sheet__row">
                <div className="revisitas-sheet__label">Fecha y hora visita</div>
                <div className="revisitas-sheet__field">
                  <Form.Item name="fechaHoraVisita">
                    <DatePicker
                      showTime={{ format: "hh:mm A", use12Hours: true }}
                      format="DD/MM/YYYY hh:mm A"
                    />
                  </Form.Item>
                </div>
              </div>

              <div className="revisitas-sheet__row">
                <div className="revisitas-sheet__label">Tema conversado</div>
                <div className="revisitas-sheet__field revisitas-sheet__field--tall">
                  <Form.Item name="temaConversado">
                    <Input.TextArea autoSize={{ minRows: 3, maxRows: 5 }} />
                  </Form.Item>
                </div>
              </div>

              <div className="revisitas-sheet__row">
                <div className="revisitas-sheet__label">Textos usados</div>
                <div className="revisitas-sheet__field">
                  <Form.Item name="textosUsados">
                    <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
                  </Form.Item>
                </div>
              </div>

              <div className="revisitas-sheet__row">
                <div className="revisitas-sheet__label">Publicación dejada</div>
                <div className="revisitas-sheet__field">
                  <Form.Item name="publicacionDejada">
                    <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
                  </Form.Item>
                </div>
              </div>

              <div className="revisitas-sheet__row">
                <div className="revisitas-sheet__label">Religión o ideología</div>
                <div className="revisitas-sheet__field">
                  <Form.Item name="religionIdeologia">
                    <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
                  </Form.Item>
                </div>
              </div>

              <div className="revisitas-sheet__row">
                <div className="revisitas-sheet__label">¿Tiene familia? ¿Cónyuge, hijos?</div>
                <div className="revisitas-sheet__field">
                  <Form.Item name="familia">
                    <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
                  </Form.Item>
                </div>
              </div>

              <div className="revisitas-sheet__row">
                <div className="revisitas-sheet__label">
                  Asuntos que le preocupan o interesan
                </div>
                <div className="revisitas-sheet__field revisitas-sheet__field--tall">
                  <Form.Item name="asuntosInteres">
                    <Input.TextArea autoSize={{ minRows: 3, maxRows: 5 }} />
                  </Form.Item>
                </div>
              </div>

              <div className="revisitas-sheet__row">
                <div className="revisitas-sheet__label">Otros detalles a tener en cuenta</div>
                <div className="revisitas-sheet__field revisitas-sheet__field--tall">
                  <Form.Item name="otrosDetalles">
                    <Input.TextArea autoSize={{ minRows: 3, maxRows: 5 }} />
                  </Form.Item>
                </div>
              </div>

              <div className="revisitas-sheet__row">
                <div className="revisitas-sheet__label">Día y hora para revisitarlo</div>
                <div className="revisitas-sheet__field">
                  <Form.Item name="proximaVisita">
                    <DatePicker
                      showTime={{ format: "hh:mm A", use12Hours: true }}
                      format="DD/MM/YYYY hh:mm A"
                    />
                  </Form.Item>
                </div>
              </div>

              <div className="revisitas-sheet__row">
                <div className="revisitas-sheet__label">Pregunta pendiente</div>
                <div className="revisitas-sheet__field revisitas-sheet__field--tall">
                  <Form.Item name="preguntaPendiente">
                    <Input.TextArea autoSize={{ minRows: 3, maxRows: 5 }} />
                  </Form.Item>
                </div>
              </div>
            </div>
          </div>
        </Form>
      </Modal>
    </section>
  );
};
