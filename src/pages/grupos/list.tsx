import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  App as AntdApp,
  Button,
  Card,
  Collapse,
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  Modal,
  Popconfirm,
  Result,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
  Upload,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { UploadFile } from "antd/es/upload/interface";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import {
  api,
  createEntry,
  getCollection,
  updateEntry,
  deleteEntry,
} from "../../api/client";
import { useIsAdminApp } from "../../hooks/useIsAdminApp";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import "dayjs/locale/es";
import PDFGrupos from "../../components/PDFGrupos";
import { ColorModeContext } from "../../contexts/color-mode";
import "./styles.css";

type Grupo = {
  id: number;
  documentId?: string;
  nombre: string;
  superintendenteId?: number;
  superintendenteNombre?: string;
  auxiliarId?: number;
  auxiliarNombre?: string;
  miembros: Array<{ id: number; nombre: string }>;
};

type Role = {
  id: number;
  name?: string;
  type?: string;
};

type Usuario = {
  id: number;
  username: string;
  email: string;
  blocked?: boolean;
  confirmed?: boolean;
  role?: Role;
};

type Miembro = {
  id: number;
  documentId?: string;
  nombre: string;
  nombres?: string;
  apellidos?: string;
  telefono?: string;
  celular?: string;
  direccion?: string;
  fechaNacimiento?: string;
  fechaInmersion?: string;
  genero?: "hombre" | "mujer";
  nombramientos?: Array<
    | "precursor_regular"
    | "precursor_auxiliar"
    | "precursor_especial"
    | "publicador"
    | "publicador_no_bautizado"
    | "anciano"
    | "siervo_ministerial"
  >;
  usuarioId?: number;
  usuarioEmail?: string;
  usuarioUsername?: string;
  grupos: number[];
};

type Nombramiento = NonNullable<Miembro["nombramientos"]>[number];

dayjs.extend(customParseFormat);
dayjs.locale("es");

const miembroNombramientoLabels: Record<Nombramiento, string> = {
  precursor_regular: "Precursor Regular",
  precursor_auxiliar: "Precursor Auxiliar",
  precursor_especial: "Precursor Especial",
  publicador: "Publicador",
  publicador_no_bautizado: "Publicador No Bautizado",
  anciano: "Anciano",
  siervo_ministerial: "Siervo Ministerial",
};

const nombramientoTagClass: Record<Nombramiento, string> = {
  precursor_regular: "grupos-tag grupos-tag--precursor_regular",
  precursor_auxiliar: "grupos-tag grupos-tag--precursor_auxiliar",
  precursor_especial: "grupos-tag grupos-tag--precursor_especial",
  publicador: "grupos-tag grupos-tag--publicador",
  publicador_no_bautizado: "grupos-tag grupos-tag--publicador_no_bautizado",
  anciano: "grupos-tag grupos-tag--anciano",
  siervo_ministerial: "grupos-tag grupos-tag--siervo_ministerial",
};

const isNombramiento = (value: string): value is Nombramiento =>
  Object.prototype.hasOwnProperty.call(miembroNombramientoLabels, value);

const generoLabels: Record<NonNullable<Miembro["genero"]>, string> = {
  hombre: "Hombre",
  mujer: "Mujer",
};

const normalizeArray = <T,>(data: any): T[] => {
  if (Array.isArray(data)) return data as T[];
  if (Array.isArray(data?.data)) return data.data as T[];
  if (Array.isArray(data?.roles)) return data.roles as T[];
  if (Array.isArray(data?.users)) return data.users as T[];
  return [];
};

const parseDateValue = (value?: string) => {
  if (!value) return null;
  const formats = [
    "YYYY-MM-DD",
    "DD/MM/YYYY",
    "D/M/YYYY",
    "DD-MM-YYYY",
    "D-M-YYYY",
    "D MMMM YYYY",
    "D [de] MMMM [de] YYYY",
    "D MMM YYYY",
  ];
  const parsed = dayjs(value, formats, "es", true);
  return parsed.isValid() ? parsed : null;
};

const sanitizeNombramientos = (
  nombramientos: string[] | undefined,
  genero?: string,
) => {
  const unique = Array.from(
    new Set((nombramientos ?? []).filter(isNombramiento)),
  );

  if (unique.includes("publicador_no_bautizado")) {
    return ["publicador_no_bautizado"];
  }

  if (genero === "mujer") {
    return unique.filter(
      (value) => value !== "anciano" && value !== "siervo_ministerial",
    );
  }

  return unique;
};

const isValidEmail = (value?: string) => {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const getInitials = (miembro: Miembro) => {
  const base =
    `${miembro.nombres ?? ""} ${miembro.apellidos ?? ""}`.trim() ||
    miembro.nombre ||
    "";
  const parts = base.split(" ").filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return initials || "M";
};

export const GruposAdminPage: React.FC = () => {
  const isAdminApp = useIsAdminApp();
  const { mode } = useContext(ColorModeContext);
  const { notification } = AntdApp.useApp();
  const [loading, setLoading] = useState(false);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  const [grupoModalOpen, setGrupoModalOpen] = useState(false);
  const [editingGrupo, setEditingGrupo] = useState<Grupo | null>(null);
  const [grupoForm] = Form.useForm();

  const [miembroModalOpen, setMiembroModalOpen] = useState(false);
  const [editingMiembro, setEditingMiembro] = useState<Miembro | null>(null);
  const [miembroForm] = Form.useForm();
  const [miembroUserMode, setMiembroUserMode] = useState<"existing" | "new">(
    "existing",
  );
  const [userSearch, setUserSearch] = useState("");
  const [creatingInlineUser, setCreatingInlineUser] = useState(false);
  const [selectedLinkedMiembro, setSelectedLinkedMiembro] =
    useState<Miembro | null>(null);
  const generoValue = Form.useWatch("genero", miembroForm);
  const nombramientosValue =
    (Form.useWatch("nombramientos", miembroForm) as string[] | undefined) ?? [];
  const usuarioValue = Form.useWatch("usuario", miembroForm);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<UploadFile | null>(null);
  const [importSummary, setImportSummary] = useState<{ total: number } | null>(
    null,
  );

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

  const fetchRoles = async () => {
    const { data } = await api.get("/users-permissions/roles");
    return normalizeArray<Role>(data);
  };

  const fetchUsuarios = async () => {
    const { data } = await api.get("/users", { params: { populate: "role" } });
    return normalizeArray<Usuario>(data).filter((u) => !u.blocked);
  };

  const fetchMiembros = async () => {
    const data = await getCollection<{
      documentId?: string;
      nombre: string;
      nombres?: string;
      apellidos?: string;
      telefono?: string;
      celular?: string;
      direccion?: string;
      fechaNacimiento?: string;
      fechaInmersion?: string;
      genero?: "hombre" | "mujer";
      nombramientos?: Miembro["nombramientos"];
      categoria?: string;
      usuario?:
        | {
            data: {
              id: number;
              attributes: { email: string; username: string };
            };
          }
        | { id: number; email: string; username: string };
      grupos?: { data: Array<{ id: number }> } | Array<{ id: number }>;
    }>("miembros", {
      populate: ["usuario", "grupos"],
      "pagination[pageSize]": 1000,
    });

    return data.map((m) => ({
      id: m.id,
      documentId: m.documentId,
      nombre: m.nombre,
      nombres: m.nombres,
      apellidos: m.apellidos,
      telefono: m.telefono,
      celular: m.celular,
      direccion: m.direccion,
      fechaNacimiento: m.fechaNacimiento,
      fechaInmersion: m.fechaInmersion,
      genero: m.genero,
      nombramientos: Array.isArray((m as any).nombramientos)
        ? (m as any).nombramientos
        : m.categoria
        ? [m.categoria]
        : [],
      usuarioId: (m.usuario as any)?.data?.id ?? (m.usuario as any)?.id,
      usuarioEmail:
        (m.usuario as any)?.data?.attributes?.email ??
        (m.usuario as any)?.email,
      usuarioUsername:
        (m.usuario as any)?.data?.attributes?.username ??
        (m.usuario as any)?.username,
      grupos:
        (m.grupos as any)?.data?.map((g: any) => g.id) ??
        (m.grupos as any)?.map((g: any) => g.id) ??
        [],
    }));
  };

  const fetchGrupos = async () => {
    const data = await getCollection<{
      documentId?: string;
      nombre: string;
      superintendente?:
        | { data: { id: number; attributes?: { nombre?: string } } }
        | { id: number; nombre?: string };
      auxiliar?:
        | { data: { id: number; attributes?: { nombre?: string } } }
        | { id: number; nombre?: string };
      miembros?:
        | { data: Array<{ id: number; attributes?: { nombre?: string } }> }
        | Array<{ id: number; nombre?: string }>;
    }>("grupos", {
      populate: ["miembros", "superintendente", "auxiliar"],
      "pagination[pageSize]": 1000,
    });

    return data.map((g) => ({
      id: g.id,
      documentId: g.documentId,
      nombre: g.nombre,
      superintendenteId:
        (g.superintendente as any)?.data?.id ?? (g.superintendente as any)?.id,
      superintendenteNombre:
        (g.superintendente as any)?.data?.attributes?.nombre ??
        (g.superintendente as any)?.nombre,
      auxiliarId: (g.auxiliar as any)?.data?.id ?? (g.auxiliar as any)?.id,
      auxiliarNombre:
        (g.auxiliar as any)?.data?.attributes?.nombre ??
        (g.auxiliar as any)?.nombre,
      miembros: ((g.miembros as any)?.data ?? (g.miembros as any) ?? []).map(
        (m: any) => ({
          id: m.id,
          nombre: m.attributes?.nombre ?? m.nombre ?? "",
        }),
      ),
    }));
  };

  const refreshAll = async () => {
    if (!isAdminApp) return;
    setLoading(true);
    try {
      const [rolesData, usuariosData, miembrosData, gruposData] =
        await Promise.all([
          fetchRoles(),
          fetchUsuarios(),
          fetchMiembros(),
          fetchGrupos(),
        ]);
      setRoles(rolesData);
      setUsuarios(usuariosData);
      setMiembros(miembrosData);

      // Construir la lista de grupos usando `miembros` como fuente de la verdad
      const mappedGrupos = gruposData.map((g) => ({
        ...g,
        miembros: miembrosData
          .filter((m) => m.grupos.includes(g.id))
          .map((m) => ({ id: m.id, nombre: m.nombre })),
      }));
      setGrupos(mappedGrupos);
    } catch (error) {
      notifyError(
        "No se pudieron cargar los datos",
        "Revisa los permisos o el servidor.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, [isAdminApp]);

  useEffect(() => {
    if (!miembroModalOpen) return;
    const next = sanitizeNombramientos(nombramientosValue, generoValue);
    if (JSON.stringify(next) !== JSON.stringify(nombramientosValue)) {
      miembroForm.setFieldsValue({ nombramientos: next });
    }
  }, [generoValue, miembroModalOpen, nombramientosValue, miembroForm]);

  const rolesOptions = useMemo(
    () =>
      roles.map((role) => ({
        label: role.name || role.type || `Rol ${role.id}`,
        value: role.id,
      })),
    [roles],
  );

  const defaultRoleId = useMemo(() => {
    const viewer = roles.find(
      (role) => role.type === "viewer" || role.name?.toLowerCase() === "viewer",
    );
    if (viewer) return viewer.id;

    const authenticated = roles.find(
      (role) =>
        role.type === "authenticated" ||
        role.name?.toLowerCase() === "authenticated",
    );
    return authenticated?.id ?? roles[0]?.id;
  }, [roles]);

  const nombramientoOptions = useMemo(() => {
    const selected = new Set(nombramientosValue);
    const isNoBautizado = selected.has("publicador_no_bautizado");
    return [
      { value: "precursor_regular", label: "Precursor Regular" },
      { value: "precursor_auxiliar", label: "Precursor Auxiliar" },
      { value: "precursor_especial", label: "Precursor Especial" },
      { value: "publicador", label: "Publicador" },
      { value: "publicador_no_bautizado", label: "Publicador No Bautizado" },
      { value: "anciano", label: "Anciano" },
      { value: "siervo_ministerial", label: "Siervo Ministerial" },
    ].map((option) => {
      let disabled = false;
      if (isNoBautizado && option.value !== "publicador_no_bautizado") {
        disabled = true;
      }
      if (
        !isNoBautizado &&
        selected.size > 0 &&
        option.value === "publicador_no_bautizado"
      ) {
        disabled = true;
      }
      if (
        generoValue === "mujer" &&
        (option.value === "anciano" || option.value === "siervo_ministerial")
      ) {
        disabled = true;
      }
      return { ...option, disabled };
    });
  }, [generoValue, nombramientosValue]);

  const groupedMemberRows = useMemo(() => {
    const groupRows = grupos
      .map((g) => ({
        id: g.id,
        nombre: g.nombre,
        miembros: miembros.filter((m) => m.grupos.includes(g.id)),
      }))
      .sort((a, b) => {
        const getNum = (value: string) => Number(value.match(/\d+/)?.[0] ?? 0);
        const diff = getNum(a.nombre) - getNum(b.nombre);
        return diff !== 0 ? diff : a.nombre.localeCompare(b.nombre);
      });

    const sinGrupo = miembros.filter((m) => m.grupos.length === 0);
    if (sinGrupo.length) {
      groupRows.push({
        id: 0,
        nombre: "Sin grupo",
        miembros: sinGrupo,
      });
    }

    return groupRows;
  }, [grupos, miembros]);

  const leadershipOptions = useMemo(() => {
    const groups: Record<string, Array<{ value: number; label: string }>> = {
      anciano: [],
      siervo_ministerial: [],
      publicador: [],
    };

    miembros.forEach((miembro) => {
      if (miembro.genero !== "hombre") return;
      const nombramientos = miembro.nombramientos ?? [];
      let bucket: keyof typeof groups | null = null;
      if (nombramientos.includes("anciano")) {
        bucket = "anciano";
      } else if (nombramientos.includes("siervo_ministerial")) {
        bucket = "siervo_ministerial";
      } else if (nombramientos.includes("publicador")) {
        bucket = "publicador";
      }
      if (!bucket) return;
      const label =
        miembro.nombre ||
        `${miembro.nombres ?? ""} ${miembro.apellidos ?? ""}`.trim();
      groups[bucket].push({
        value: miembro.id,
        label,
      });
    });

    return [
      { label: "Ancianos", options: groups.anciano },
      { label: "Siervo Ministerial", options: groups.siervo_ministerial },
      { label: "Publicadores", options: groups.publicador },
    ].filter((group) => group.options.length > 0);
  }, [miembros]);

  const leadershipIds = useMemo(() => {
    const ids = new Set<number>();
    leadershipOptions.forEach((group) => {
      group.options.forEach((opt) => ids.add(opt.value));
    });
    return ids;
  }, [leadershipOptions]);

  const openGrupoModal = (grupo?: Grupo) => {
    if (!isAdminApp) return;
    setEditingGrupo(grupo || null);
    if (grupo) {
      grupoForm.setFieldsValue({
        nombre: grupo.nombre,
        superintendente: grupo.superintendenteId,
        auxiliar: grupo.auxiliarId,
      });
    } else {
      grupoForm.resetFields();
    }
    setGrupoModalOpen(true);
  };

  const saveGrupo = async (values: any) => {
    if (!isAdminApp) return;
    if (values.superintendente && values.superintendente === values.auxiliar) {
      message.error(
        "Superintendente y Auxiliar no pueden ser la misma persona.",
      );
      return;
    }

    if (values.superintendente && !leadershipIds.has(values.superintendente)) {
      message.error(
        "El Superintendente debe ser varón y tener un nombramiento válido.",
      );
      return;
    }
    if (values.auxiliar && !leadershipIds.has(values.auxiliar)) {
      message.error(
        "El Auxiliar debe ser varón y tener un nombramiento válido.",
      );
      return;
    }

    const payload = {
      nombre: values.nombre,
      superintendente: values.superintendente ?? null,
      auxiliar: values.auxiliar ?? null,
    };

    try {
      if (editingGrupo) {
        const primaryId = editingGrupo.documentId ?? editingGrupo.id;
        try {
          await updateEntry("grupos", primaryId, payload);
        } catch (error) {
          if (primaryId !== editingGrupo.id) {
            await updateEntry("grupos", editingGrupo.id, payload);
          } else {
            throw error;
          }
        }
        notifySuccess("Grupo actualizado");
      } else {
        await createEntry<Grupo>("grupos", payload);
        notifySuccess("Grupo creado");
      }

      await refreshAll();
      setGrupoModalOpen(false);
      setEditingGrupo(null);
      grupoForm.resetFields();
    } catch (error: any) {
      const detail =
        error?.response?.data?.error?.message ||
        error?.message ||
        "No se pudo guardar el grupo. Revisa permisos o datos.";
      notifyError("No se pudo guardar el grupo", detail);
    }
  };

  const deleteGrupo = async (id: number, documentId?: string) => {
    if (!isAdminApp) return;
    try {
      const primaryId = documentId ?? id;
      try {
        await deleteEntry("grupos", primaryId as any);
      } catch (error) {
        if (primaryId !== id) {
          await deleteEntry("grupos", id as any);
        } else {
          throw error;
        }
      }
      notifySuccess("Grupo eliminado");
    } catch (error: any) {
      const detail =
        error?.response?.data?.error?.message ||
        error?.message ||
        "No se pudo eliminar el grupo.";
      notifyError("No se pudo eliminar el grupo", detail);
    }
    await refreshAll();
  };

  const openMiembroModal = (miembro?: Miembro) => {
    if (!isAdminApp) return;
    setEditingMiembro(miembro || null);
    setSelectedLinkedMiembro(miembro || null);
    setMiembroUserMode("existing");
    setUserSearch("");
    if (miembro) {
      miembroForm.setFieldsValue({
        usuario: miembro.usuarioId,
        usuarioEmail: miembro.usuarioEmail,
        nombres: miembro.nombres,
        apellidos: miembro.apellidos,
        telefono: miembro.telefono,
        celular: miembro.celular,
        direccion: miembro.direccion,
        fechaNacimiento: parseDateValue(miembro.fechaNacimiento),
        fechaInmersion: parseDateValue(miembro.fechaInmersion),
        genero: miembro.genero,
        nombramientos: miembro.nombramientos,
        grupo: miembro.grupos[0] ?? undefined,
      });
    } else {
      setSelectedLinkedMiembro(null);
      miembroForm.resetFields();
    }
    setMiembroModalOpen(true);
  };

  const availableUsers = useMemo(() => {
    const usedUserIds = new Set(
      miembros.map((m) => m.usuarioId).filter(Boolean),
    );
    return usuarios.filter((u) => !usedUserIds.has(u.id));
  }, [usuarios, miembros]);

  const selectableUsers = useMemo(() => {
    if (editingMiembro?.usuarioId) {
      const current = usuarios.find((u) => u.id === editingMiembro.usuarioId);
      const list = current ? [current, ...availableUsers] : availableUsers;
      const unique = new Map(list.map((u) => [u.id, u]));
      return Array.from(unique.values());
    }
    return availableUsers;
  }, [availableUsers, editingMiembro, usuarios]);

  const modalClassName = `grupos-modal ${
    mode === "dark" ? "grupos-modal--dark" : "grupos-modal--light"
  }`;

  const createUserFromEmail = async (email: string) => {
    const normalized = email.trim().toLowerCase();
    if (!isValidEmail(normalized)) {
      message.warning("Ingresa un email válido.");
      return null;
    }
    const existing = usuarios.find(
      (u) => u.email?.toLowerCase() === normalized,
    );
    if (existing) {
      return existing;
    }

    const username = normalized.split("@")[0] || normalized;
    const payload: Record<string, unknown> = {
      username,
      email: normalized,
      password: "123456",
      confirmed: true,
      blocked: false,
    };
    if (defaultRoleId) {
      payload.role = defaultRoleId;
    }

    const { data } = await api.post("/users", payload);
    const created = data as Usuario;
    setUsuarios((prev) => [created, ...prev]);
    notifySuccess("Usuario creado", "Contraseña temporal: 123456");
    return created;
  };

  const handleUsuarioSelect = async (userId?: number) => {
    if (!userId) {
      setSelectedLinkedMiembro(null);
      if (!editingMiembro) {
        miembroForm.setFieldsValue({
          usuario: undefined,
          usuarioEmail: undefined,
        });
      }
      return;
    }

    const selectedUser = usuarios.find((u) => u.id === userId);
    let linkedMember = miembros.find((m) => m.usuarioId === userId);

    if (!linkedMember) {
      try {
        const [fetchedMember] = await getCollection<{
          documentId?: string;
          nombre: string;
          nombres?: string;
          apellidos?: string;
          telefono?: string;
          celular?: string;
          direccion?: string;
          fechaNacimiento?: string;
          fechaInmersion?: string;
          genero?: "hombre" | "mujer";
          nombramientos?: Miembro["nombramientos"];
          usuario?:
            | {
                data: {
                  id: number;
                  attributes: { email: string; username: string };
                };
              }
            | { id: number; email: string; username: string };
          grupos?: { data: Array<{ id: number }> } | Array<{ id: number }>;
        }>("miembros", {
          populate: ["usuario", "grupos"],
          "filters[usuario][id][$eq]": userId,
          "pagination[pageSize]": 1,
        });

        if (fetchedMember) {
          linkedMember = {
            id: fetchedMember.id,
            documentId: fetchedMember.documentId,
            nombre: fetchedMember.nombre,
            nombres: fetchedMember.nombres,
            apellidos: fetchedMember.apellidos,
            telefono: fetchedMember.telefono,
            celular: fetchedMember.celular,
            direccion: fetchedMember.direccion,
            fechaNacimiento: fetchedMember.fechaNacimiento,
            fechaInmersion: fetchedMember.fechaInmersion,
            genero: fetchedMember.genero,
            nombramientos: Array.isArray((fetchedMember as any).nombramientos)
              ? (fetchedMember as any).nombramientos
              : [],
            usuarioId:
              (fetchedMember.usuario as any)?.data?.id ??
              (fetchedMember.usuario as any)?.id,
            usuarioEmail:
              (fetchedMember.usuario as any)?.data?.attributes?.email ??
              (fetchedMember.usuario as any)?.email,
            usuarioUsername:
              (fetchedMember.usuario as any)?.data?.attributes?.username ??
              (fetchedMember.usuario as any)?.username,
            grupos:
              (fetchedMember.grupos as any)?.data?.map((g: any) => g.id) ??
              (fetchedMember.grupos as any)?.map((g: any) => g.id) ??
              [],
          };
        }
      } catch {
        // Keep manual fill available if no linked member can be resolved.
      }
    }

    setSelectedLinkedMiembro(linkedMember ?? null);

    miembroForm.setFieldsValue({
      usuario: userId,
      usuarioEmail: selectedUser?.email,
      ...(linkedMember
        ? {
            nombres: linkedMember.nombres,
            apellidos: linkedMember.apellidos,
            telefono: linkedMember.telefono,
            celular: linkedMember.celular,
            direccion: linkedMember.direccion,
            fechaNacimiento: parseDateValue(linkedMember.fechaNacimiento),
            fechaInmersion: parseDateValue(linkedMember.fechaInmersion),
            genero: linkedMember.genero,
            nombramientos: linkedMember.nombramientos,
            grupo: linkedMember.grupos[0] ?? undefined,
          }
        : {}),
    });
  };

  const saveMiembro = async (values: any) => {
    if (!isAdminApp) return;
    let userId = values.usuario;

    if (miembroUserMode === "new") {
      const { data } = await api.post("/users", {
        username: values.new_username,
        email: values.new_email,
        password: values.new_password,
        role: values.new_role,
        confirmed: true,
        blocked: false,
      });
      userId = data.id;
    }
    if (!userId && values.usuarioEmail) {
      const created = await createUserFromEmail(String(values.usuarioEmail));
      if (created) userId = created.id;
    }

    const nombreCompleto = `${values.nombres ?? ""} ${
      values.apellidos ?? ""
    }`.trim();
    const nombramientos = sanitizeNombramientos(
      values.nombramientos,
      values.genero,
    );
    if (
      JSON.stringify(nombramientos) !== JSON.stringify(values.nombramientos)
    ) {
      message.info("Se ajustaron los nombramientos según las reglas.");
    }

    const fechaNacimiento =
      values.fechaNacimiento?.format?.("YYYY-MM-DD") ??
      (values.fechaNacimiento === null
        ? null
        : editingMiembro?.fechaNacimiento);
    const fechaInmersion =
      values.fechaInmersion?.format?.("YYYY-MM-DD") ??
      (values.fechaInmersion === null ? null : editingMiembro?.fechaInmersion);

    const payload = {
      nombre: nombreCompleto || values.nombres || values.apellidos || "Miembro",
      nombres: values.nombres,
      apellidos: values.apellidos,
      telefono: values.telefono,
      celular: values.celular,
      direccion: values.direccion,
      fechaNacimiento,
      fechaInmersion,
      genero: values.genero,
      nombramientos,
      usuario: userId ?? null,
      grupos: values.grupo ? [values.grupo] : [],
    };

    try {
      const targetMiembro = editingMiembro ?? selectedLinkedMiembro;

      if (targetMiembro) {
        try {
          await updateEntry("miembros", targetMiembro.id, payload);
        } catch (error) {
          if (targetMiembro.documentId) {
            await updateEntry("miembros", targetMiembro.documentId, payload);
          } else {
            throw error;
          }
        }
        notifySuccess("Miembro actualizado");
      } else {
        await createEntry("miembros", payload);
        notifySuccess("Miembro creado");
      }

      await refreshAll();
      setMiembroModalOpen(false);
      setEditingMiembro(null);
      setSelectedLinkedMiembro(null);
      miembroForm.resetFields();
    } catch (error: any) {
      const detail =
        error?.response?.data?.error?.message ||
        error?.message ||
        "No se pudo guardar el miembro.";
      notifyError("No se pudo guardar el miembro", detail);
    }
  };

  const deleteMiembro = async (id: number, documentId?: string) => {
    if (!isAdminApp) return;
    try {
      const primaryId = documentId ?? id;
      try {
        await deleteEntry("miembros", primaryId as any);
      } catch (error) {
        if (primaryId !== id) {
          await deleteEntry("miembros", id as any);
        } else {
          throw error;
        }
      }
      notifySuccess("Miembro eliminado");
    } catch (error: any) {
      const detail =
        error?.response?.data?.error?.message ||
        error?.message ||
        "No se pudo eliminar el miembro.";
      notifyError("No se pudo eliminar el miembro", detail);
    }
    await refreshAll();
  };

  const renderMiembroDetail = (miembro: Miembro) => {
    const nombramientos =
      miembro.nombramientos?.map((value) => miembroNombramientoLabels[value]) ??
      [];
    return (
      <div className="miembro-detail">
        <div className="miembro-detail__avatar">{getInitials(miembro)}</div>
        <div className="miembro-detail__grid">
          <div>
            <div className="miembro-detail__label">Email</div>
            <div>{miembro.usuarioEmail || "N/A"}</div>
          </div>
          <div>
            <div className="miembro-detail__label">Celular</div>
            <div>{miembro.celular || "N/A"}</div>
          </div>
          <div>
            <div className="miembro-detail__label">Dirección</div>
            <div>{miembro.direccion || "N/A"}</div>
          </div>
          <div>
            <div className="miembro-detail__label">Nacimiento</div>
            <div>{miembro.fechaNacimiento || "N/A"}</div>
          </div>
          <div>
            <div className="miembro-detail__label">Inmersión</div>
            <div>{miembro.fechaInmersion || "N/A"}</div>
          </div>
          <div>
            <div className="miembro-detail__label">Género</div>
            <div>{miembro.genero ? generoLabels[miembro.genero] : "N/A"}</div>
          </div>
          <div>
            <div className="miembro-detail__label">Nombramientos</div>
            <div>{nombramientos.length ? nombramientos.join(", ") : "N/A"}</div>
          </div>
        </div>
      </div>
    );
  };

  const grupoColumns: ColumnsType<Grupo> = [
    {
      title: "Nombre",
      dataIndex: "nombre",
      key: "nombre",
      render: (value) => <span className="grupos-table__name">{value}</span>,
    },
    {
      title: "Miembros",
      key: "miembros",
      render: (_, record) => (
        <span className="grupos-table__count">
          {record.miembros.length} miembros
        </span>
      ),
    },
    {
      title: "Superintendente",
      dataIndex: "superintendenteNombre",
      key: "superintendenteNombre",
      render: (value) =>
        value ? value : <span className="text-muted">N/A</span>,
    },
    {
      title: "Auxiliar",
      dataIndex: "auxiliarNombre",
      key: "auxiliarNombre",
      render: (value) =>
        value ? value : <span className="text-muted">N/A</span>,
    },
    {
      title: "Acciones",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            type="text"
            className="grupos-action-btn"
            icon={<EditOutlined />}
            onClick={() => openGrupoModal(record)}
          />
          <Popconfirm
            title="¿Eliminar grupo?"
            okText="Sí"
            cancelText="No"
            onConfirm={() => deleteGrupo(record.id, record.documentId)}
          >
            <Button
              size="small"
              type="text"
              className="grupos-action-btn grupos-action-btn--danger"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const miembroColumns: ColumnsType<Miembro> = [
    {
      title: "Apellidos",
      dataIndex: "apellidos",
      key: "apellidos",
      render: (value, record) => value || record.apellidos || "",
      sorter: (a, b) => (a.apellidos ?? "").localeCompare(b.apellidos ?? ""),
    },
    {
      title: "Nombres",
      dataIndex: "nombres",
      key: "nombres",
      render: (value, record) => value || record.nombres || record.nombre,
      sorter: (a, b) =>
        (a.nombres ?? a.nombre ?? "").localeCompare(
          b.nombres ?? b.nombre ?? "",
        ),
    },
    {
      title: "Teléfono",
      key: "telefono",
      render: (_, record) =>
        record.telefono || record.celular ? (
          record.telefono || record.celular
        ) : (
          <span className="text-muted">N/A</span>
        ),
    },
    {
      title: "Nombramientos",
      dataIndex: "nombramientos",
      key: "nombramientos",
      filters: Object.entries(miembroNombramientoLabels).map(
        ([value, label]) => ({
          text: label,
          value,
        }),
      ),
      onFilter: (value, record) => {
        const selected = String(value);
        return isNombramiento(selected)
          ? (record.nombramientos ?? []).includes(selected)
          : false;
      },
      render: (values?: Miembro["nombramientos"]) => {
        const list = (Array.isArray(values) ? values : []).filter(isNombramiento);
        return list.length ? (
          <Space wrap>
            {list.map((value) => (
              <Tag
                key={value}
                className={nombramientoTagClass[value] ?? "grupos-tag"}
              >
                {miembroNombramientoLabels[value] ?? value}
              </Tag>
            ))}
          </Space>
        ) : (
          <span className="text-muted">N/A</span>
        );
      },
    },
    {
      title: "Acciones",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            type="text"
            className="grupos-action-btn"
            icon={<EditOutlined />}
            onClick={() => openMiembroModal(record)}
          />
          <Popconfirm
            title="¿Eliminar miembro?"
            okText="Sí"
            cancelText="No"
            onConfirm={() => deleteMiembro(record.id, record.documentId)}
          >
            <Button
              size="small"
              type="text"
              className="grupos-action-btn grupos-action-btn--danger"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const membersCollapseItems = useMemo(
    () =>
      groupedMemberRows.map((group) => ({
        key: String(group.id),
        label: (
          <div className="grupos-collapse__label">
            <span className="grupos-collapse__title">{group.nombre}</span>
            <span className="grupos-collapse__count">
              {group.miembros.length} miembros
            </span>
          </div>
        ),
        children: (
          <div className="miembros-table">
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: 12,
              }}
            >
              <PDFGrupos
                groupName={group.nombre}
                data={group.miembros.map((miembro) => ({
                  id: miembro.id,
                  apellidos: miembro.apellidos,
                  nombres: miembro.nombres,
                  nombre: miembro.nombre,
                  telefono: miembro.telefono,
                  celular: miembro.celular,
                  nombramientos:
                    miembro.nombramientos?.map(
                      (value) => miembroNombramientoLabels[value] ?? value,
                    ) ?? [],
                }))}
              />
            </div>
            <Table
              rowKey="id"
              columns={miembroColumns}
              dataSource={group.miembros}
              loading={loading}
              pagination={{
                pageSize: 30,
                hideOnSinglePage: true,
                size: "small",
              }}
              expandable={{
                expandedRowRender: (miembro: Miembro) =>
                  renderMiembroDetail(miembro),
                expandRowByClick: true,
              }}
            />
          </div>
        ),
      })),
    [groupedMemberRows, miembroColumns, loading],
  );

  if (!isAdminApp) {
    return (
      <Result
        status="403"
        title="Sin acceso"
        subTitle="Solo admin-app puede administrar grupos y miembros."
      />
    );
  }

  return (
    <section
      className={`grupos-page ${
        mode === "dark" ? "grupos-page--dark" : "grupos-page--light"
      }`}
    >
      <div className="grupos-page__header">
        <div>
          <Typography.Title level={3} className="grupos-page__title">
            Administración de Grupos y Miembros
          </Typography.Title>
          <Typography.Text className="grupos-page__subtitle">
            Gestiona grupos, miembros y nombramientos desde un solo lugar.
          </Typography.Text>
        </div>
        <Button
          className="grupos-btn grupos-btn--ghost"
          icon={<ReloadOutlined />}
          onClick={refreshAll}
          loading={loading}
        >
          Recargar
        </Button>
      </div>

      <Tabs
        className="grupos-tabs"
        tabBarExtraContent={
          <Space size="middle" className="grupos-actions">
            <Button
              className="grupos-btn grupos-btn--ghost"
              onClick={() => setImportModalOpen(true)}
            >
              Importar Excel
            </Button>
            <Button
              className="grupos-btn grupos-btn--ghost"
              icon={<UserAddOutlined />}
              onClick={() => openMiembroModal()}
            >
              Crear Miembro
            </Button>
            <Button
              type="primary"
              className="grupos-btn grupos-btn--primary"
              icon={<PlusOutlined />}
              onClick={() => openGrupoModal()}
            >
              Crear Grupo
            </Button>
          </Space>
        }
        items={[
          {
            key: "grupos",
            label: "Grupos",
            children: (
              <Card className="grupos-card" bordered={false}>
                <Table
                  className="grupos-table"
                  dataSource={grupos}
                  columns={grupoColumns}
                  rowKey="id"
                  pagination={{ pageSize: 30, showSizeChanger: false }}
                  loading={loading}
                />
              </Card>
            ),
          },
          {
            key: "miembros",
            label: "Miembros",
            children: (
              <div className="grupos-collapse">
                <Collapse
                  ghost
                  expandIconPosition="end"
                  items={membersCollapseItems}
                />
              </div>
            ),
          },
        ]}
      />

      <Modal
        title={editingGrupo ? "Editar Grupo" : "Crear Grupo"}
        open={grupoModalOpen}
        onCancel={() => setGrupoModalOpen(false)}
        onOk={() => grupoForm.submit()}
        width={720}
        className={modalClassName}
        okText="Aceptar"
        cancelText="Cancelar"
      >
        <Form
          form={grupoForm}
          layout="vertical"
          onFinish={saveGrupo}
          onFinishFailed={() =>
            message.error("Completa los campos obligatorios del grupo.")
          }
        >
          <Form.Item
            name="nombre"
            label="Nombre del grupo"
            rules={[{ required: true, message: "Ingresa el nombre" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="superintendente"
            label="Superintendente"
            rules={[
              { required: true, message: "Selecciona el superintendente" },
              {
                validator: (_, value) => {
                  const auxiliar = grupoForm.getFieldValue("auxiliar");
                  if (value && auxiliar && value === auxiliar) {
                    return Promise.reject(
                      new Error(
                        "Superintendente no puede ser la misma persona que el auxiliar.",
                      ),
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={leadershipOptions}
              placeholder="Selecciona el superintendente"
            />
          </Form.Item>
          <Form.Item
            name="auxiliar"
            label="Auxiliar"
            rules={[
              { required: true, message: "Selecciona el auxiliar" },
              {
                validator: (_, value) => {
                  const superintendente =
                    grupoForm.getFieldValue("superintendente");
                  if (value && superintendente && value === superintendente) {
                    return Promise.reject(
                      new Error(
                        "Auxiliar no puede ser la misma persona que el superintendente.",
                      ),
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={leadershipOptions}
              placeholder="Selecciona el auxiliar"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingMiembro ? "Editar Miembro" : "Crear Miembro"}
        open={miembroModalOpen}
        onCancel={() => setMiembroModalOpen(false)}
        onOk={() => miembroForm.submit()}
        width={820}
        className={modalClassName}
        okText="Aceptar"
        cancelText="Cancelar"
      >
        <Form form={miembroForm} layout="vertical" onFinish={saveMiembro}>
          <Typography.Text className="grupos-section-title">
            Vinculación de Usuario
          </Typography.Text>
          <Row gutter={16}>
            {!editingMiembro && (
              <Col xs={24} md={12}>
                <Form.Item label="Tipo de usuario">
                  <Select
                    value={miembroUserMode}
                    onChange={(value) =>
                      setMiembroUserMode(value as "existing" | "new")
                    }
                    options={[
                      { value: "existing", label: "Usuario existente" },
                      { value: "new", label: "Crear usuario nuevo" },
                    ]}
                  />
                </Form.Item>
              </Col>
            )}

            {(miembroUserMode === "existing" || editingMiembro) && (
              <Col xs={24} md={editingMiembro ? 24 : 12}>
                <Form.Item name="usuario" label="Seleccionar usuario">
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    onChange={(value) => handleUsuarioSelect(value)}
                    onSearch={(value) => setUserSearch(value)}
                    filterOption={(input, option) =>
                      String(option?.label ?? "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    popupRender={(menu) => {
                      const normalizedSearch = userSearch.trim().toLowerCase();
                      const canCreate =
                        isValidEmail(normalizedSearch) &&
                        !usuarios.some(
                          (u) => u.email?.toLowerCase() === normalizedSearch,
                        );

                      return (
                        <div>
                          {menu}
                          {canCreate && (
                            <>
                              <Divider style={{ margin: "8px 0" }} />
                              <Space style={{ padding: "0 8px 8px" }}>
                                <Button
                                  type="link"
                                  loading={creatingInlineUser}
                                  onClick={async () => {
                                    setCreatingInlineUser(true);
                                    const created = await createUserFromEmail(
                                      normalizedSearch,
                                    );
                                    if (created) {
                                      miembroForm.setFieldsValue({
                                        usuario: created.id,
                                        usuarioEmail: undefined,
                                      });
                                    }
                                    setCreatingInlineUser(false);
                                  }}
                                >
                                  Crear usuario "{normalizedSearch}"
                                </Button>
                              </Space>
                            </>
                          )}
                        </div>
                      );
                    }}
                    options={selectableUsers.map((u) => ({
                      value: u.id,
                      label: `${u.username} (${u.email})`,
                    }))}
                  />
                </Form.Item>
              </Col>
            )}
          </Row>

          {miembroUserMode === "new" && !editingMiembro && (
            <Card size="small" style={{ marginBottom: 12 }}>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="new_username"
                    label="Usuario"
                    rules={[{ required: true, message: "Ingresa el usuario" }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="new_email"
                    label="Email"
                    rules={[
                      {
                        required: true,
                        type: "email",
                        message: "Email válido",
                      },
                    ]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="new_password"
                    label="Contraseña"
                    rules={[
                      { required: true, message: "Ingresa la contraseña" },
                    ]}
                  >
                    <Input.Password />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="new_role"
                    label="Rol"
                    rules={[{ required: true, message: "Selecciona un rol" }]}
                  >
                    <Select
                      options={rolesOptions}
                      placeholder="Selecciona un rol"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          )}

          {(miembroUserMode === "existing" || editingMiembro) &&
            !usuarioValue && (
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="usuarioEmail"
                    label="Correo electrónico (opcional)"
                    rules={[{ type: "email", message: "Email válido" }]}
                  >
                    <Input placeholder="correo@ejemplo.com" />
                  </Form.Item>
                </Col>
              </Row>
            )}

          <Divider />
          <Typography.Text className="grupos-section-title">
            Información Personal
          </Typography.Text>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="nombres"
                label="Nombres"
                rules={[{ required: true, message: "Ingresa los nombres" }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="apellidos"
                label="Apellidos"
                rules={[{ required: true, message: "Ingresa los apellidos" }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="celular" label="Celular">
                <PhoneInput
                  className="grupos-phone"
                  defaultCountry="CO"
                  international
                  countryCallingCodeEditable={false}
                  placeholder="Ej: +57 3201234567"
                  value={miembroForm.getFieldValue("celular")}
                  onChange={(value) =>
                    miembroForm.setFieldValue("celular", value)
                  }
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="telefono" label="Teléfono fijo">
                <PhoneInput
                  className="grupos-phone"
                  defaultCountry="CO"
                  international
                  countryCallingCodeEditable={false}
                  placeholder="Ej: +57 571234567"
                  value={miembroForm.getFieldValue("telefono")}
                  onChange={(value) =>
                    miembroForm.setFieldValue("telefono", value)
                  }
                />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="direccion" label="Dirección de residencia">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Divider />
          <Typography.Text className="grupos-section-title">
            Provilegios
          </Typography.Text>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="fechaNacimiento" label="Fecha de Nacimiento">
                <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="fechaInmersion" label="Fecha de Inmersión">
                <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="genero"
                label="Género"
                rules={[{ required: true, message: "Selecciona el género" }]}
              >
                <Select
                  options={[
                    { value: "hombre", label: "Hombre" },
                    { value: "mujer", label: "Mujer" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="nombramientos"
                label="Nombramientos"
                rules={[
                  { required: true, message: "Selecciona el nombramiento" },
                ]}
              >
                <Select
                  mode="multiple"
                  options={nombramientoOptions}
                  placeholder="Selecciona nombramientos"
                  onChange={(values) => {
                    const next = sanitizeNombramientos(values, generoValue);
                    if (JSON.stringify(next) !== JSON.stringify(values)) {
                      message.info(
                        "Se ajustaron los nombramientos según las reglas.",
                      );
                    }
                    miembroForm.setFieldsValue({ nombramientos: next });
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="grupo" label="Asignar a grupo">
                <Select
                  options={grupos.map((g) => ({
                    value: g.id,
                    label: g.nombre,
                  }))}
                  placeholder="Selecciona un grupo"
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title="Importar miembros desde Excel"
        open={importModalOpen}
        onCancel={() => setImportModalOpen(false)}
        onOk={async () => {
          if (!importFile?.originFileObj) {
            message.warning("Selecciona un archivo Excel.");
            return;
          }
          setImporting(true);
          try {
            const formData = new FormData();
            formData.append("file", importFile.originFileObj as File);
            const { data } = await api.post(
              "/miembros/import-excel",
              formData,
              {
                headers: { "Content-Type": "multipart/form-data" },
              },
            );
            setImportSummary({ total: data?.total ?? 0 });
            notifySuccess(
              "Importación completada",
              `Filas procesadas: ${data?.total ?? 0}`,
            );
            await refreshAll();
            setImportFile(null);
            setImportModalOpen(false);
          } catch (error) {
            notifyError("No se pudo importar el Excel");
          } finally {
            setImporting(false);
          }
        }}
        okButtonProps={{ loading: importing }}
        width={640}
        className={modalClassName}
        okText="Aceptar"
        cancelText="Cancelar"
      >
        <Typography.Paragraph>
          Sube un archivo Excel con columnas como:{" "}
          <Typography.Text code>
            GRUPO, NOMBRE COMPLETO, CELULAR, TELEFONO, DIRECCION, FECHA DE
            NACIMIENTO, FECHA DE INMERSIÓN
          </Typography.Text>
        </Typography.Paragraph>
        <Upload.Dragger
          className="grupos-import"
          name="file"
          multiple={false}
          accept=".xlsx,.xls,.csv"
          beforeUpload={(file) => {
            setImportFile({
              uid: file.uid,
              name: file.name,
              status: "done",
              originFileObj: file,
            });
            return false;
          }}
          onRemove={() => setImportFile(null)}
          fileList={importFile ? [importFile] : []}
        >
          <p className="ant-upload-drag-icon">
            <span>📄</span>
          </p>
          <p className="ant-upload-text">
            Arrastra el Excel aquí o haz clic para seleccionar
          </p>
          <p className="ant-upload-hint">
            Se importarán miembros y se crearán grupos según la columna GRUPO.
          </p>
        </Upload.Dragger>
        {importSummary && (
          <Typography.Paragraph style={{ marginTop: 12 }}>
            Filas procesadas: <strong>{importSummary.total}</strong>
          </Typography.Paragraph>
        )}
      </Modal>
    </section>
  );
};
