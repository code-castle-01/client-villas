import { useEffect, useMemo, useState } from "react";
import {
  App as AntdApp,
  Button,
  Card,
  Col,
  Divider,
  Drawer,
  Form,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Typography,
} from "antd";
import { DownloadOutlined, EditOutlined, SaveOutlined } from "@ant-design/icons";
import { pdf } from "@react-pdf/renderer";
import { getOptionalSingle, updateSingle } from "../../api/client";
import { useDirectory } from "../../contexts/directory";
import useMediaQuery from "../../hooks/useMediaQuery";
import { useIsAdminApp } from "../../hooks/useIsAdminApp";
import { OrganigramaPdfDocument } from "./OrganigramaPdfDocument";
import {
  committeeBranches,
  editableSections,
  normalizeOrganigramaRecord,
  normalizeOrganigramaValues,
  otherAssignments,
  type OrganigramaFormValues,
  type OrganigramaRecord,
  type OrganigramaRoleDefinition,
} from "./organigrama.schema";
import "./organigrama.css";

type PositionCardProps = {
  title: string;
  memberName: string;
  auxiliaryName: string;
  compact?: boolean;
  emphasize?: boolean;
};

const PositionCard = ({
  title,
  memberName,
  auxiliaryName,
  compact = false,
  emphasize = false,
}: PositionCardProps) => (
  <div
    className={[
      "organigrama-node",
      compact ? "organigrama-node--compact" : "",
      emphasize ? "organigrama-node--emphasize" : "",
    ]
      .filter(Boolean)
      .join(" ")}
  >
    <div className="organigrama-node__title">{title}</div>
    <div className="organigrama-node__name">{memberName}</div>
    <div className="organigrama-node__aux-label">Auxiliar:</div>
    <div className="organigrama-node__name">{auxiliaryName}</div>
  </div>
);

const downloadBlob = (filename: string, blob: Blob) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const OrganigramaDashboard: React.FC = () => {
  const { notification } = AntdApp.useApp();
  const isAdminApp = useIsAdminApp();
  const isTabletOrLess = useMediaQuery("(max-width: 1024px)");
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { grupos, miembros, loading: directoryLoading } = useDirectory();
  const [form] = Form.useForm<OrganigramaFormValues>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [recordId, setRecordId] = useState<number | null>(null);
  const [organigrama, setOrganigrama] = useState<OrganigramaFormValues>(
    normalizeOrganigramaRecord(null),
  );

  const memberOptions = useMemo(
    () =>
      miembros
        .map((member) => ({
          value: member.id,
          label: member.nombre,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "es")),
    [miembros],
  );

  const memberNameById = useMemo(
    () => new Map(miembros.map((member) => [member.id, member.nombre])),
    [miembros],
  );

  const sortedGroups = useMemo(
    () => [...grupos].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [grupos],
  );

  const resolveMemberName = (memberId?: number) => {
    if (typeof memberId !== "number") {
      return "Pendiente";
    }

    return memberNameById.get(memberId) ?? "Pendiente";
  };

  const loadOrganigrama = async () => {
    setLoading(true);

    try {
      const data = await getOptionalSingle<OrganigramaRecord>("organigrama");
      const normalized = normalizeOrganigramaRecord(data);
      setRecordId(data?.id ?? null);
      setOrganigrama(normalized);
    } catch {
      notification.error({
        message: "No se pudo cargar el organigrama",
        description: "Revisa permisos o la conexión con el servidor.",
        placement: "topRight",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrganigrama();
  }, []);

  const openEditor = () => {
    form.setFieldsValue(organigrama);
    setDrawerOpen(true);
  };

  const closeEditor = () => {
    setDrawerOpen(false);
    form.resetFields();
  };

  const handleSave = async (values: OrganigramaFormValues) => {
    setSaving(true);

    try {
      const payload = normalizeOrganigramaValues(values);
      const saved = await updateSingle<OrganigramaRecord>("organigrama", {
        congregationName: payload.congregationName,
        assignments: payload.assignments,
      });

      setRecordId(saved.id);
      setOrganigrama(normalizeOrganigramaRecord(saved));
      setDrawerOpen(false);

      notification.success({
        message: "Organigrama actualizado",
        placement: "topRight",
      });
    } catch {
      notification.error({
        message: "No se pudo guardar el organigrama",
        description: "Intenta nuevamente en unos segundos.",
        placement: "topRight",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);

    try {
      const blob = await pdf(
        <OrganigramaPdfDocument
          congregationName={organigrama.congregationName}
          assignments={organigrama.assignments}
          groups={sortedGroups}
          resolveMemberName={resolveMemberName}
        />,
      ).toBlob();

      const safeName = organigrama.congregationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      downloadBlob(`organigrama-${safeName || "congregacion"}.pdf`, blob);
    } catch {
      notification.error({
        message: "No se pudo descargar el PDF",
        description: "Intenta nuevamente en unos segundos.",
        placement: "topRight",
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const renderMemberSelect = (
    field: OrganigramaRoleDefinition,
    kind: "memberId" | "auxiliaryMemberId",
  ) => (
    <Form.Item
      key={`${field.role}-${kind}`}
      label={kind === "memberId" ? field.title : field.auxiliaryLabel}
      name={["assignments", field.role, kind]}
      className="organigrama-form__item"
    >
      <Select
        allowClear
        showSearch
        options={memberOptions}
        optionFilterProp="label"
        placeholder="Seleccione un miembro"
      />
    </Form.Item>
  );

  const assignments = organigrama.assignments;
  const isBusy = loading || directoryLoading;

  return (
    <Card
      className="organigrama-card"
      title="Organigrama"
      extra={
        <Space wrap>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleDownloadPdf}
            loading={downloadingPdf}
          >
            Descargar PDF
          </Button>
          {isAdminApp ? (
            <Button icon={<EditOutlined />} onClick={openEditor}>
              Editar
            </Button>
          ) : null}
        </Space>
      }
    >
      {isBusy ? (
        <div className="organigrama-loading">
          <Spin size="large" />
        </div>
      ) : (
        <div className="organigrama-shell">
          <div className="organigrama-header">
            <Typography.Title level={2} className="organigrama-title">
              {organigrama.congregationName}
            </Typography.Title>
            <Typography.Text type="secondary" className="organigrama-subtitle">
              Un organigrama limpio, legible y editable para visualizar
              rápidamente la estructura principal de servicio.
            </Typography.Text>
          </div>

          <section className="organigrama-committee">
            <div className="organigrama-root-shell">
              <div className="organigrama-root">Comité de servicio</div>
            </div>

            <div className="organigrama-branches">
              {committeeBranches.map((branch) => (
                <section key={branch.key} className="organigrama-branch">
                  <div className="organigrama-branch__lead">
                    <PositionCard
                      title={branch.lead.title}
                      memberName={resolveMemberName(
                        assignments[branch.lead.role].memberId,
                      )}
                      auxiliaryName={resolveMemberName(
                        assignments[branch.lead.role].auxiliaryMemberId,
                      )}
                      emphasize
                    />
                  </div>

                  <div className="organigrama-branch__children">
                    {branch.children.map((child) => (
                      <PositionCard
                        key={child.role}
                        title={child.title}
                        memberName={resolveMemberName(
                          assignments[child.role].memberId,
                        )}
                        auxiliaryName={resolveMemberName(
                          assignments[child.role].auxiliaryMemberId,
                        )}
                        compact={isTabletOrLess}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>

          <Divider />

          <div className="organigrama-section-head">
            <Typography.Title level={4} className="organigrama-section-title">
              Otros encargos
            </Typography.Title>
          </div>
          <div className="organigrama-grid organigrama-grid--secondary">
            {otherAssignments.map((field) => (
              <PositionCard
                key={field.role}
                title={field.title}
                memberName={resolveMemberName(assignments[field.role].memberId)}
                auxiliaryName={resolveMemberName(
                  assignments[field.role].auxiliaryMemberId,
                )}
                compact
              />
            ))}
          </div>

          <Divider />

          <Space direction="vertical" size={4} className="organigrama-groups-head">
            <Typography.Title level={4} className="organigrama-section-title">
              Grupos para el servicio del campo
            </Typography.Title>
            <Typography.Text type="secondary">
              Estos datos salen directamente del directorio de grupos y miembros.
            </Typography.Text>
          </Space>

          <div className="organigrama-grid organigrama-grid--groups">
            {sortedGroups.map((group) => (
              <PositionCard
                key={group.id}
                title={group.nombre}
                memberName={group.superintendenteNombre ?? "Pendiente"}
                auxiliaryName={group.auxiliarNombre ?? "Pendiente"}
                compact
              />
            ))}
          </div>
        </div>
      )}

      <Drawer
        title="Editar organigrama"
        width={isMobile ? "100%" : 840}
        open={drawerOpen}
        onClose={closeEditor}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            label="Nombre de la congregación"
            name="congregationName"
            rules={[
              {
                required: true,
                message: "Ingrese el nombre de la congregación",
              },
            ]}
          >
            <Input placeholder="Congregación Central" />
          </Form.Item>

          {editableSections.map((section) => (
            <div key={section.key}>
              <Divider orientation="left">{section.title}</Divider>
              <Row gutter={16}>
                {section.fields.map((field) => (
                  <Col key={field.role} xs={24} md={12}>
                    {renderMemberSelect(field, "memberId")}
                    {renderMemberSelect(field, "auxiliaryMemberId")}
                  </Col>
                ))}
              </Row>
            </div>
          ))}

          <Divider />
          <Space wrap>
            <Button onClick={closeEditor}>Cancelar</Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={saving}
            >
              Guardar
            </Button>
          </Space>
        </Form>
        {recordId ? (
          <Typography.Paragraph type="secondary" className="organigrama-meta">
            Registro del organigrama: #{recordId}
          </Typography.Paragraph>
        ) : null}
      </Drawer>
    </Card>
  );
};
