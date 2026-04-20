import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  Button as MobileButton,
  Card as MobileCard,
  Dialog,
  Empty as MobileEmpty,
  SearchBar,
  Selector,
  Space as MobileSpace,
  Tag as MobileTag,
} from "antd-mobile";
import {
  App as AntdApp,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
  Result,
} from "antd";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { useAdaptiveUI } from "../../adaptive/useAdaptiveUI";
import useMediaQuery from "../../hooks/useMediaQuery";
import { ColorModeContext } from "../../contexts/color-mode";
import { api } from "../../api/client";
import { useIsAdminApp } from "../../hooks/useIsAdminApp";
import "./styles.css";

type Role = {
  id: number;
  name?: string;
  type?: string;
  description?: string;
};

type User = {
  id: number;
  username: string;
  email: string;
  provider?: string;
  confirmed?: boolean;
  blocked?: boolean;
  role?: Role;
  createdAt?: string;
};

const normalizeArray = <T,>(data: any): T[] => {
  if (Array.isArray(data)) return data as T[];
  if (Array.isArray(data?.data)) return data.data as T[];
  if (Array.isArray(data?.roles)) return data.roles as T[];
  if (Array.isArray(data?.users)) return data.users as T[];
  return [];
};

export const UsuariosList: React.FC = () => {
  const isSmallScreen = useMediaQuery("(max-width: 768px)");
  const { resolvedMode } = useAdaptiveUI();
  const isNativeMobile = resolvedMode === "mobile";
  const isAdminApp = useIsAdminApp();
  const { mode } = useContext(ColorModeContext);
  const { notification } = AntdApp.useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState<number | null>(null);
  const [accessFilter, setAccessFilter] = useState<
    "active" | "blocked" | "unconfirmed" | null
  >(null);
  const [form] = Form.useForm();

  const notifySuccess = (title: string, description?: string) => {
    notification.success({
      message: title,
      description,
      placement: "topRight",
    });
  };

  const notifyError = (title: string, description?: string) => {
    notification.error({
      message: title,
      description,
      placement: "topRight",
    });
  };

  const loadRoles = async () => {
    const { data } = await api.get("/users-permissions/roles");
    return normalizeArray<Role>(data);
  };

  const loadUsers = async () => {
    const { data } = await api.get("/users", { params: { populate: "role" } });
    return normalizeArray<User>(data);
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const [rolesData, usersData] = await Promise.all([
        loadRoles(),
        loadUsers(),
      ]);
      setRoles(rolesData);
      setUsers(usersData);
    } catch (error) {
      notifyError("No se pudieron cargar los usuarios", "Revisa los permisos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdminApp) return;
    refresh();
  }, [isAdminApp]);

  const roleOptions = useMemo(
    () =>
      roles.map((role) => ({
        label: role.name || role.type || `Rol ${role.id}`,
        value: role.id,
      })),
    [roles],
  );

  const roleFilters = useMemo(
    () =>
      roles.map((role) => ({
        text: role.name || role.type || `Rol ${role.id}`,
        value: role.id,
      })),
    [roles],
  );

  const mobileRoleOptions = useMemo(
    () =>
      roleOptions.map((role) => ({
        label: role.label,
        value: role.value,
      })),
    [roleOptions],
  );

  const accessOptions = [
    { label: "Activos", value: "active" },
    { label: "Bloqueados", value: "blocked" },
    { label: "Sin confirmar", value: "unconfirmed" },
  ];

  const roleLabelFor = (role?: Role) => role?.name || role?.type || "Sin rol";

  const roleTagClass = (role?: Role) => {
    const type = role?.type?.toLowerCase() || role?.name?.toLowerCase() || "";
    if (type.includes("admin-app"))
      return "usuarios-role-tag usuarios-role-tag--admin-app";
    if (type.includes("authenticated"))
      return "usuarios-role-tag usuarios-role-tag--authenticated";
    if (type.includes("viewer"))
      return "usuarios-role-tag usuarios-role-tag--viewer";
    return "usuarios-role-tag usuarios-role-tag--none";
  };

  const openModal = (record?: User) => {
    setEditingUser(record || null);
    if (record) {
      form.setFieldsValue({
        username: record.username,
        email: record.email,
        role: record.role?.id,
        confirmed: record.confirmed ?? true,
        blocked: record.blocked ?? false,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ confirmed: true, blocked: false });
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!isAdminApp) return;
    try {
      await api.delete(`/users/${id}`);
      setUsers(users.filter((user) => user.id !== id));
      notifySuccess("Usuario eliminado");
    } catch (error: any) {
      const detail =
        error?.response?.data?.error?.message ||
        error?.message ||
        "No se pudo eliminar el usuario.";
      notifyError("No se pudo eliminar el usuario", detail);
    }
  };

  const handleSave = async (values: any) => {
    if (!isAdminApp) return;
    const payload: Record<string, unknown> = {
      username: values.username,
      email: values.email,
      role: values.role,
      confirmed: values.confirmed ?? true,
      blocked: values.blocked ?? false,
    };

    if (values.password) {
      payload.password = values.password;
    }

    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, payload);
        notifySuccess("Usuario actualizado");
      } else {
        await api.post("/users", payload);
        notifySuccess("Usuario creado");
      }
      await refresh();
      setIsModalOpen(false);
      setEditingUser(null);
      form.resetFields();
    } catch (error) {
      notifyError("No se pudo guardar el usuario", "Revisa los permisos.");
    }
  };

  const filteredUsers = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return users.filter((user) => {
      if (roleFilter && user.role?.id !== roleFilter) {
        return false;
      }

      if (accessFilter === "active" && (user.blocked || !user.confirmed)) {
        return false;
      }

      if (accessFilter === "blocked" && !user.blocked) {
        return false;
      }

      if (accessFilter === "unconfirmed" && user.confirmed) {
        return false;
      }

      if (!query) {
        return true;
      }

      return `${user.username} ${user.email} ${roleLabelFor(user.role)}`
        .toLowerCase()
        .includes(query);
    });
  }, [accessFilter, roleFilter, searchText, users]);

  const getMobileStatusTag = (user: User) => {
    if (user.blocked) {
      return <MobileTag color="danger">Bloqueado</MobileTag>;
    }

    if (!user.confirmed) {
      return <MobileTag color="warning">Sin confirmar</MobileTag>;
    }

    return <MobileTag color="success">Activo</MobileTag>;
  };

  const confirmMobileDelete = (user: User) => {
    Dialog.confirm({
      title: "Eliminar usuario",
      content: `Se eliminará ${user.username}.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      onConfirm: () => handleDelete(user.id),
    });
  };

  const renderMobileUsers = () => (
    <div className="usuarios-mobile">
      <MobileCard className="mobile-screen-card usuarios-mobile__filters">
        <SearchBar
          value={searchText}
          onChange={setSearchText}
          placeholder="Buscar usuario, correo o rol"
        />

        <div className="usuarios-mobile__selector-group">
          <span className="usuarios-mobile__selector-label">Rol</span>
          <Selector
            columns={2}
            options={mobileRoleOptions}
            value={roleFilter ? [roleFilter] : []}
            onChange={(value) => setRoleFilter(value[0] ? Number(value[0]) : null)}
          />
        </div>

        <div className="usuarios-mobile__selector-group">
          <span className="usuarios-mobile__selector-label">Estado</span>
          <Selector
            columns={3}
            options={accessOptions}
            value={accessFilter ? [accessFilter] : []}
            onChange={(value) =>
              setAccessFilter((value[0] as typeof accessFilter) ?? null)
            }
          />
        </div>
      </MobileCard>

      {filteredUsers.length ? (
        filteredUsers.map((user) => (
          <MobileCard
            key={user.id}
            className="mobile-screen-card usuarios-mobile-card"
            title={user.username}
            extra={getMobileStatusTag(user)}
          >
            <MobileSpace direction="vertical" block style={{ width: "100%" }}>
              <div className="usuarios-mobile-card__email">{user.email}</div>

              <div className="usuarios-mobile-card__meta">
                <div>
                  <span>Rol</span>
                  <MobileTag color="primary" fill="outline">
                    {roleLabelFor(user.role)}
                  </MobileTag>
                </div>
                <div>
                  <span>Proveedor</span>
                  <strong>{user.provider || "local"}</strong>
                </div>
              </div>

              <div className="usuarios-mobile-card__actions">
                <MobileButton
                  size="small"
                  fill="outline"
                  onClick={() => openModal(user)}
                >
                  <EditOutlined /> Editar
                </MobileButton>
                <MobileButton
                  size="small"
                  color="danger"
                  fill="outline"
                  onClick={() => confirmMobileDelete(user)}
                >
                  <DeleteOutlined /> Eliminar
                </MobileButton>
              </div>
            </MobileSpace>
          </MobileCard>
        ))
      ) : (
        <MobileCard className="mobile-screen-card">
          <MobileEmpty description="No hay usuarios que coincidan con los filtros." />
        </MobileCard>
      )}
    </div>
  );

  return (
    <section
      className={`usuarios-page ${
        mode === "dark" ? "usuarios-page--dark" : "usuarios-page--light"
      }`}
    >
      {!isAdminApp ? (
        <Result
          status="403"
          title="Sin acceso"
          subTitle="Solo admin-app puede administrar usuarios."
        />
      ) : (
        <>
          <div className="usuarios-page__header">
            <div>
              <Typography.Title level={3} className="usuarios-page__title">
                Usuarios
              </Typography.Title>
              <Typography.Text className="usuarios-page__subtitle">
                Administra roles, permisos y estados de acceso.
              </Typography.Text>
            </div>
            <Space wrap>
              <Button
                className="usuarios-btn usuarios-btn--ghost"
                icon={<ReloadOutlined />}
                onClick={refresh}
                loading={loading}
              >
                Recargar
              </Button>
              <Button
                type="primary"
                className="usuarios-btn usuarios-btn--primary"
                icon={<PlusOutlined />}
                onClick={() => openModal()}
              >
                Crear Usuario
              </Button>
            </Space>
          </div>

          {isNativeMobile ? (
            renderMobileUsers()
          ) : (
            <Card className="usuarios-card" bordered={false}>
              <Table<User>
                className="usuarios-table"
                dataSource={filteredUsers}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10, showSizeChanger: false }}
                scroll={{ x: 900 }}
                columns={[
                  {
                    title: "Usuario",
                    dataIndex: "username",
                    sorter: (a, b) => a.username.localeCompare(b.username),
                  },
                  {
                    title: "Email",
                    dataIndex: "email",
                    sorter: (a, b) => a.email.localeCompare(b.email),
                  },
                  {
                    title: "Rol",
                    filters: roleFilters,
                    onFilter: (value, record) =>
                      String(record.role?.id ?? "") === String(value),
                    sorter: (a, b) =>
                      roleLabelFor(a.role).localeCompare(roleLabelFor(b.role)),
                    render: (_, record) => (
                      <Tag className={roleTagClass(record.role)}>
                        {roleLabelFor(record.role)}
                      </Tag>
                    ),
                  },
                  {
                    title: "Confirmado",
                    filters: [
                      { text: "Sí", value: "true" },
                      { text: "No", value: "false" },
                    ],
                    onFilter: (value, record) =>
                      String(record.confirmed ?? false) === String(value),
                    render: (_, record) =>
                      record.confirmed ? (
                        <Tag color="green">Sí</Tag>
                      ) : (
                        <Tag>No</Tag>
                      ),
                  },
                  {
                    title: "Bloqueado",
                    filters: [
                      { text: "Sí", value: "true" },
                      { text: "No", value: "false" },
                    ],
                    onFilter: (value, record) =>
                      String(record.blocked ?? false) === String(value),
                    render: (_, record) =>
                      record.blocked ? (
                        <Tag color="red">Sí</Tag>
                      ) : (
                        <Tag color="green">No</Tag>
                      ),
                  },
                  {
                    title: "Proveedor",
                    dataIndex: "provider",
                    filters: [
                      { text: "local", value: "local" },
                      { text: "google", value: "google" },
                    ],
                    onFilter: (value, record) =>
                      String(record.provider ?? "") === String(value),
                    sorter: (a, b) =>
                      (a.provider ?? "").localeCompare(b.provider ?? ""),
                  },
                  {
                    title: "Acciones",
                    render: (_, record) => (
                      <Space>
                        <Button
                          size="small"
                          type="text"
                          className="usuarios-action-btn"
                          icon={<EditOutlined />}
                          onClick={() => openModal(record)}
                        />
                        <Popconfirm
                          title="¿Eliminar usuario?"
                          onConfirm={() => handleDelete(record.id)}
                          okText="Sí"
                          cancelText="No"
                        >
                          <Button
                            size="small"
                            type="text"
                            className="usuarios-action-btn usuarios-action-btn--danger"
                            danger
                            icon={<DeleteOutlined />}
                          />
                        </Popconfirm>
                      </Space>
                    ),
                  },
                ]}
              />
            </Card>
          )}

          <Modal
            title={editingUser ? "Editar usuario" : "Crear usuario"}
            open={isModalOpen}
            onCancel={() => setIsModalOpen(false)}
            footer={null}
            width={isSmallScreen ? "100%" : 520}
          >
            <Form form={form} layout="vertical" onFinish={handleSave}>
              <Form.Item
                name="username"
                label="Usuario"
                rules={[{ required: true, message: "Ingresa el usuario" }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  {
                    required: true,
                    type: "email",
                    message: "Ingresa un email válido",
                  },
                ]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="password"
                label={
                  editingUser ? "Nueva contraseña (opcional)" : "Contraseña"
                }
                rules={
                  editingUser
                    ? []
                    : [{ required: true, message: "Ingresa una contraseña" }]
                }
              >
                <Input.Password />
              </Form.Item>
              <Form.Item
                name="role"
                label="Rol"
                rules={[{ required: true, message: "Selecciona un rol" }]}
              >
                <Select options={roleOptions} placeholder="Selecciona un rol" />
              </Form.Item>
              <Space size="large">
                <Form.Item name="confirmed" valuePropName="checked">
                  <Switch
                    checkedChildren="Confirmado"
                    unCheckedChildren="Sin confirmar"
                  />
                </Form.Item>
                <Form.Item name="blocked" valuePropName="checked">
                  <Switch
                    checkedChildren="Bloqueado"
                    unCheckedChildren="Activo"
                  />
                </Form.Item>
              </Space>
              <Form.Item>
                <Button type="primary" htmlType="submit" block>
                  {editingUser ? "Guardar cambios" : "Crear usuario"}
                </Button>
              </Form.Item>
            </Form>
          </Modal>
        </>
      )}
    </section>
  );
};
