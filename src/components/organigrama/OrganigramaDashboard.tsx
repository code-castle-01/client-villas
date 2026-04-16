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
import { EditOutlined, SaveOutlined } from "@ant-design/icons";
import { Tree, TreeNode } from "react-organizational-chart";
import { getOptionalSingle, updateSingle } from "../../api/client";
import { useDirectory } from "../../contexts/directory";
import { useIsAdminApp } from "../../hooks/useIsAdminApp";
import "./organigrama.css";

type OrganigramaRoleKey =
  | "secretary"
  | "bodyCoordinator"
  | "serviceOverseer"
  | "accounts"
  | "digitalSupport"
  | "publicTalks"
  | "attendants"
  | "audioVideo"
  | "cleaning"
  | "publications"
  | "territories"
  | "watchtowerConductor"
  | "lifeMinistryOverseer"
  | "assistantCounselor";

type OrganigramaMemberAssignment = {
  memberId?: number;
  auxiliaryMemberId?: number;
};

type OrganigramaAssignments = Record<
  OrganigramaRoleKey,
  OrganigramaMemberAssignment
>;

type OrganigramaRecord = {
  id: number;
  congregationName?: string;
  assignments?: Partial<OrganigramaAssignments>;
};

type OrganigramaFormValues = {
  congregationName: string;
  assignments: OrganigramaAssignments;
};

type PositionCardProps = {
  title: string;
  memberName: string;
  auxiliaryName?: string;
  compact?: boolean;
};

const DEFAULT_CONGREGATION_NAME = "Congregación Central";

const createEmptyAssignment = (): OrganigramaMemberAssignment => ({
  memberId: undefined,
  auxiliaryMemberId: undefined,
});

const createDefaultAssignments = (): OrganigramaAssignments => ({
  secretary: createEmptyAssignment(),
  bodyCoordinator: createEmptyAssignment(),
  serviceOverseer: createEmptyAssignment(),
  accounts: createEmptyAssignment(),
  digitalSupport: createEmptyAssignment(),
  publicTalks: createEmptyAssignment(),
  attendants: createEmptyAssignment(),
  audioVideo: createEmptyAssignment(),
  cleaning: createEmptyAssignment(),
  publications: createEmptyAssignment(),
  territories: createEmptyAssignment(),
  watchtowerConductor: createEmptyAssignment(),
  lifeMinistryOverseer: createEmptyAssignment(),
  assistantCounselor: createEmptyAssignment(),
});

const normalizeRoleAssignment = (
  value?: Partial<OrganigramaMemberAssignment> | null,
): OrganigramaMemberAssignment => ({
  memberId: typeof value?.memberId === "number" ? value.memberId : undefined,
  auxiliaryMemberId:
    typeof value?.auxiliaryMemberId === "number"
      ? value.auxiliaryMemberId
      : undefined,
});

const normalizeAssignments = (
  value?: Partial<OrganigramaAssignments> | null,
): OrganigramaAssignments => ({
  secretary: normalizeRoleAssignment(value?.secretary),
  bodyCoordinator: normalizeRoleAssignment(value?.bodyCoordinator),
  serviceOverseer: normalizeRoleAssignment(value?.serviceOverseer),
  accounts: normalizeRoleAssignment(value?.accounts),
  digitalSupport: normalizeRoleAssignment(value?.digitalSupport),
  publicTalks: normalizeRoleAssignment(value?.publicTalks),
  attendants: normalizeRoleAssignment(value?.attendants),
  audioVideo: normalizeRoleAssignment(value?.audioVideo),
  cleaning: normalizeRoleAssignment(value?.cleaning),
  publications: normalizeRoleAssignment(value?.publications),
  territories: normalizeRoleAssignment(value?.territories),
  watchtowerConductor: normalizeRoleAssignment(value?.watchtowerConductor),
  lifeMinistryOverseer: normalizeRoleAssignment(value?.lifeMinistryOverseer),
  assistantCounselor: normalizeRoleAssignment(value?.assistantCounselor),
});

const normalizeOrganigramaRecord = (
  record?: OrganigramaRecord | null,
): OrganigramaFormValues => ({
  congregationName: record?.congregationName?.trim() || DEFAULT_CONGREGATION_NAME,
  assignments: normalizeAssignments(record?.assignments),
});

const normalizeOrganigramaValues = (
  values: OrganigramaFormValues,
): OrganigramaFormValues => ({
  congregationName: values.congregationName?.trim() || DEFAULT_CONGREGATION_NAME,
  assignments: normalizeAssignments(values.assignments),
});

const editableSections: Array<{
  key: string;
  title: string;
  fields: Array<{
    role: OrganigramaRoleKey;
    label: string;
    auxiliaryLabel?: string;
  }>;
}> = [
  {
    key: "committee",
    title: "Comité de servicio",
    fields: [
      { role: "secretary", label: "Secretario" },
      {
        role: "bodyCoordinator",
        label: "Coordinador del cuerpo de ancianos",
      },
      {
        role: "serviceOverseer",
        label: "Superintendente de servicio",
      },
    ],
  },
  {
    key: "secretary-branch",
    title: "Rama del secretario",
    fields: [
      {
        role: "accounts",
        label: "Siervo de cuentas",
        auxiliaryLabel: "Auxiliar de cuentas",
      },
      {
        role: "digitalSupport",
        label: "Ayuda a usuarios de JW.ORG y JW HUB",
      },
    ],
  },
  {
    key: "coordination-branch",
    title: "Rama de coordinación",
    fields: [
      { role: "publicTalks", label: "Coordinador de discursos públicos" },
      { role: "attendants", label: "Coordinador de acomodadores" },
      {
        role: "audioVideo",
        label: "Coordinador de audio y video",
        auxiliaryLabel: "Auxiliar de audio y video",
      },
      {
        role: "cleaning",
        label: "Coordinador de limpieza",
        auxiliaryLabel: "Auxiliar de limpieza",
      },
    ],
  },
  {
    key: "service-branch",
    title: "Rama de servicio",
    fields: [
      {
        role: "publications",
        label: "Siervo de publicaciones",
        auxiliaryLabel: "Auxiliar de publicaciones",
      },
      { role: "territories", label: "Siervo de territorios" },
    ],
  },
  {
    key: "others",
    title: "Otros encargos",
    fields: [
      { role: "watchtowerConductor", label: "Conductor de la Atalaya" },
      {
        role: "lifeMinistryOverseer",
        label: "Superintendente de la reunión Vida y Ministerio",
        auxiliaryLabel: "Auxiliar de Vida y Ministerio",
      },
      { role: "assistantCounselor", label: "Consejero auxiliar" },
    ],
  },
];

const PositionCard = ({
  title,
  memberName,
  auxiliaryName,
  compact = false,
}: PositionCardProps) => (
  <div
    className={`organigrama-node ${compact ? "organigrama-node--compact" : ""}`}
  >
    <div className="organigrama-node__title">{title}</div>
    <div className="organigrama-node__name">{memberName}</div>
    {typeof auxiliaryName === "string" && (
      <>
        <div className="organigrama-node__aux-label">Auxiliar:</div>
        <div className="organigrama-node__name">{auxiliaryName}</div>
      </>
    )}
  </div>
);

export const OrganigramaDashboard: React.FC = () => {
  const { notification } = AntdApp.useApp();
  const isAdminApp = useIsAdminApp();
  const { grupos, miembros, loading: directoryLoading } = useDirectory();
  const [form] = Form.useForm<OrganigramaFormValues>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    } catch (error) {
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
    } catch (error) {
      notification.error({
        message: "No se pudo guardar el organigrama",
        description: "Intenta nuevamente en unos segundos.",
        placement: "topRight",
      });
    } finally {
      setSaving(false);
    }
  };

  const renderMemberSelect = (
    role: OrganigramaRoleKey,
    label: string,
    field: "memberId" | "auxiliaryMemberId" = "memberId",
  ) => (
    <Form.Item
      key={`${role}-${field}`}
      label={label}
      name={["assignments", role, field]}
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
        isAdminApp ? (
          <Button icon={<EditOutlined />} onClick={openEditor}>
            Editar
          </Button>
        ) : null
      }
    >
      {isBusy ? (
        <div className="organigrama-loading">
          <Spin size="large" />
        </div>
      ) : (
        <>
          <div className="organigrama-header">
            <Typography.Title level={2} className="organigrama-title">
              {organigrama.congregationName}
            </Typography.Title>
            <Typography.Text type="secondary">
              El comité de servicio y los encargos principales se administran
              aquí. Los grupos del servicio del campo se sincronizan desde la
              escena de Grupos.
            </Typography.Text>
          </div>

          <div className="organigrama-scroll">
            <div className="organigrama-tree">
              <Tree
                label={<div className="organigrama-root">Comité de servicio</div>}
                lineWidth="2px"
                lineColor="#8aa8e8"
                lineBorderRadius="8px"
                lineHeight="34px"
              >
                <TreeNode
                  label={
                    <PositionCard
                      title="Secretario"
                      memberName={resolveMemberName(assignments.secretary.memberId)}
                    />
                  }
                >
                  <TreeNode
                    label={
                      <PositionCard
                        title="Siervo de cuentas"
                        memberName={resolveMemberName(assignments.accounts.memberId)}
                        auxiliaryName={resolveMemberName(
                          assignments.accounts.auxiliaryMemberId,
                        )}
                      />
                    }
                  />
                  <TreeNode
                    label={
                      <PositionCard
                        title="Ayuda a usuarios de JW.ORG y JW HUB"
                        memberName={resolveMemberName(
                          assignments.digitalSupport.memberId,
                        )}
                      />
                    }
                  />
                </TreeNode>

                <TreeNode
                  label={
                    <PositionCard
                      title="Coordinador del cuerpo de ancianos"
                      memberName={resolveMemberName(
                        assignments.bodyCoordinator.memberId,
                      )}
                    />
                  }
                >
                  <TreeNode
                    label={
                      <PositionCard
                        title="Coordinador de discursos públicos"
                        memberName={resolveMemberName(
                          assignments.publicTalks.memberId,
                        )}
                      />
                    }
                  />
                  <TreeNode
                    label={
                      <PositionCard
                        title="Coordinador de acomodadores"
                        memberName={resolveMemberName(
                          assignments.attendants.memberId,
                        )}
                      />
                    }
                  />
                  <TreeNode
                    label={
                      <PositionCard
                        title="Coordinador de audio y video"
                        memberName={resolveMemberName(
                          assignments.audioVideo.memberId,
                        )}
                        auxiliaryName={resolveMemberName(
                          assignments.audioVideo.auxiliaryMemberId,
                        )}
                      />
                    }
                  />
                  <TreeNode
                    label={
                      <PositionCard
                        title="Coordinador de limpieza"
                        memberName={resolveMemberName(assignments.cleaning.memberId)}
                        auxiliaryName={resolveMemberName(
                          assignments.cleaning.auxiliaryMemberId,
                        )}
                      />
                    }
                  />
                </TreeNode>

                <TreeNode
                  label={
                    <PositionCard
                      title="Superintendente de servicio"
                      memberName={resolveMemberName(
                        assignments.serviceOverseer.memberId,
                      )}
                    />
                  }
                >
                  <TreeNode
                    label={
                      <PositionCard
                        title="Siervo de publicaciones"
                        memberName={resolveMemberName(
                          assignments.publications.memberId,
                        )}
                        auxiliaryName={resolveMemberName(
                          assignments.publications.auxiliaryMemberId,
                        )}
                      />
                    }
                  />
                  <TreeNode
                    label={
                      <PositionCard
                        title="Siervo de territorios"
                        memberName={resolveMemberName(
                          assignments.territories.memberId,
                        )}
                      />
                    }
                  />
                </TreeNode>
              </Tree>
            </div>
          </div>

          <Divider />

          <Typography.Title level={4} className="organigrama-section-title">
            Otros encargos
          </Typography.Title>
          <div className="organigrama-grid organigrama-grid--secondary">
            <PositionCard
              title="Conductor de la Atalaya"
              memberName={resolveMemberName(
                assignments.watchtowerConductor.memberId,
              )}
              compact
            />
            <PositionCard
              title="Superintendente de la reunión Vida y Ministerio"
              memberName={resolveMemberName(
                assignments.lifeMinistryOverseer.memberId,
              )}
              auxiliaryName={resolveMemberName(
                assignments.lifeMinistryOverseer.auxiliaryMemberId,
              )}
              compact
            />
            <PositionCard
              title="Consejero auxiliar"
              memberName={resolveMemberName(
                assignments.assistantCounselor.memberId,
              )}
              compact
            />
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
        </>
      )}

      <Drawer
        title="Editar organigrama"
        width={760}
        open={drawerOpen}
        onClose={closeEditor}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            label="Nombre de la congregación"
            name="congregationName"
            rules={[{ required: true, message: "Ingrese el nombre de la congregación" }]}
          >
            <Input placeholder="Congregación Central" />
          </Form.Item>

          {editableSections.map((section) => (
            <div key={section.key}>
              <Divider orientation="left">{section.title}</Divider>
              <Row gutter={16}>
                {section.fields.map((field) => (
                  <Col key={field.role} xs={24} md={12}>
                    {renderMemberSelect(field.role, field.label)}
                    {field.auxiliaryLabel
                      ? renderMemberSelect(
                          field.role,
                          field.auxiliaryLabel,
                          "auxiliaryMemberId",
                        )
                      : null}
                  </Col>
                ))}
              </Row>
            </div>
          ))}

          <Divider />
          <Space>
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
