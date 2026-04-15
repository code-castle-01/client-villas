import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Calendar,
  Card,
  DatePicker,
  Descriptions,
  Empty,
  Flex,
  Form,
  Input,
  List,
  Modal,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import {
  CalendarOutlined,
  BookOutlined,
  EditOutlined,
  ToolOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { api, getCollection, getSingle } from "../../api/client";
import useMediaQuery from "../../hooks/useMediaQuery";

dayjs.locale("es");

type CurrentUser = {
  id: number;
  email?: string;
  username?: string;
};

type RelationSummary = {
  id: number;
  nombre: string;
} | null;

type UserRelation =
  | { id?: number; email?: string; username?: string }
  | { data?: { id?: number; email?: string; username?: string } }
  | null
  | undefined;

type MiembroRow = {
  id: number;
  nombre: string;
  usuario?: UserRelation;
};

type GroupSummary = {
  id: number;
  nombre: string;
};

type ProfileUser = {
  id: number;
  username: string;
  email: string;
  firstname?: string;
  lastname?: string;
  role?: {
    id: number;
    name: string;
    type: string;
  } | null;
};

type ProfileMember = {
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
  genero?: "hombre" | "mujer" | "";
  nombramientos?: string[];
  grupos?: GroupSummary[];
} | null;

type ProfileResponse = {
  user: ProfileUser;
  member: ProfileMember;
};

type ReunionRow = {
  id: number;
  fecha: string;
  presidente?: RelationSummary;
  lector?: RelationSummary;
  oracion?: RelationSummary;
};

type ConferenciaRow = {
  id: number;
  fecha: string;
  orador: string;
  cong: string;
  cancion: number;
  tema?: { id: number; titulo: string } | null;
  auxiliar?: RelationSummary;
};

type MecanicaRow = {
  id: number;
  fecha: string;
  limpieza?: string[];
  acomodadorDentro?: RelationSummary;
  acomodadorLobby?: RelationSummary;
  acomodadorReja?: RelationSummary;
  micro1?: RelationSummary;
  micro2?: RelationSummary;
  plataforma?: RelationSummary;
  audioVideo?: RelationSummary;
};

type EscuelaRelation =
  | { id?: number; nombre?: string }
  | { data?: { id?: number; attributes?: { nombre?: string } } }
  | null
  | undefined;

type EscuelaRow = {
  id: number;
  fecha: string;
  interventionNumber: number;
  presentationLocation: string;
  encargado?: EscuelaRelation;
  ayudante?: EscuelaRelation;
};

type VisitaRow = {
  id: number;
  fecha: string;
  tema?: string;
  completada: boolean;
  tipoRegistro?: "visita" | "s4";
  miembro?: RelationSummary;
  acompanante?: RelationSummary;
};

type PresidenciaSingle = {
  fecha?: string;
  orador?: string;
  congregacion?: string;
  numeroCancion?: number;
  presidente?:
    | RelationSummary
    | { data?: { id?: number; attributes?: { nombre?: string } } };
  conductorAtalaya?:
    | RelationSummary
    | { data?: { id?: number; attributes?: { nombre?: string } } };
  discursoTema?:
    | { id?: number; titulo?: string }
    | { data?: { id?: number; attributes?: { titulo?: string } } };
  proximoTema?:
    | { id?: number; titulo?: string }
    | { data?: { id?: number; attributes?: { titulo?: string } } };
};

type AssignmentCategory =
  | "reunion"
  | "conferencia"
  | "escuela"
  | "mecanica"
  | "pastoreo"
  | "presidencia";

type AssignmentItem = {
  id: string;
  date: string;
  title: string;
  category: AssignmentCategory;
  label: string;
  details: string[];
  status?: "pendiente" | "completada" | "programada";
};

const categoryMeta: Record<
  AssignmentCategory,
  { color: string; icon: React.ReactNode; label: string }
> = {
  reunion: {
    color: "blue",
    icon: <TeamOutlined />,
    label: "Reuniones",
  },
  conferencia: {
    color: "gold",
    icon: <UserOutlined />,
    label: "Conferencias",
  },
  escuela: {
    color: "geekblue",
    icon: <BookOutlined />,
    label: "Escuela",
  },
  mecanica: {
    color: "cyan",
    icon: <ToolOutlined />,
    label: "Mecánicas",
  },
  pastoreo: {
    color: "volcano",
    icon: <CalendarOutlined />,
    label: "Pastoreo",
  },
  presidencia: {
    color: "green",
    icon: <CalendarOutlined />,
    label: "Presidencia",
  },
};

const parseCurrentUser = (): CurrentUser | null => {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw) as CurrentUser;
  } catch {
    return null;
  }
};

const hasNestedUser = (
  relation?: UserRelation
): relation is { data?: { id?: number; email?: string; username?: string } } =>
  Boolean(relation && typeof relation === "object" && "data" in relation);

const getUserId = (relation?: UserRelation) =>
  hasNestedUser(relation) ? (relation.data?.id ?? 0) : (relation?.id ?? 0);

const getUserEmail = (relation?: UserRelation) =>
  hasNestedUser(relation)
    ? (relation.data?.email ?? "")
    : (relation?.email ?? "");

const hasNestedRelation = (
  relation?: EscuelaRelation | RelationSummary | PresidenciaSingle["presidente"]
): relation is { data?: { id?: number; attributes?: { nombre?: string } } } =>
  Boolean(relation && typeof relation === "object" && "data" in relation);

const getRelationId = (relation?: EscuelaRelation | RelationSummary) => {
  if (!relation) return 0;
  if (hasNestedRelation(relation)) {
    return relation.data?.id ?? 0;
  }
  return relation.id ?? 0;
};

const getRelationName = (
  relation: EscuelaRelation | RelationSummary,
  fallback = ""
) => {
  if (!relation) return fallback;
  if (hasNestedRelation(relation)) {
    return relation.data?.attributes?.nombre ?? fallback;
  }
  return relation.nombre ?? fallback;
};

const hasNestedTema = (
  tema?: PresidenciaSingle["discursoTema"] | PresidenciaSingle["proximoTema"]
): tema is { data?: { id?: number; attributes?: { titulo?: string } } } =>
  Boolean(tema && typeof tema === "object" && "data" in tema);

const getTemaTitulo = (
  tema?: PresidenciaSingle["discursoTema"] | PresidenciaSingle["proximoTema"]
) => {
  if (!tema) return "";
  if (hasNestedTema(tema)) {
    return tema.data?.attributes?.titulo ?? "";
  }
  return tema.titulo ?? "";
};

const getDateKey = (value: { format: (pattern: string) => string } | string) =>
  typeof value === "string" ? dayjs(value).format("YYYY-MM-DD") : value.format("YYYY-MM-DD");

const monthTitle = (value: string) =>
  dayjs(value).locale("es").format("MMMM [de] YYYY");

const getIsoWeekInfo = (value: dayjs.Dayjs) => {
  const date = value.toDate();
  const utcDate = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNumber = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );

  return {
    year: utcDate.getUTCFullYear(),
    week,
  };
};

const normalizeNameKey = (value?: string) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const statusTag = (status?: AssignmentItem["status"]) => {
  if (!status) return null;
  if (status === "pendiente") {
    return <Tag color="volcano">Pendiente</Tag>;
  }
  if (status === "completada") {
    return <Tag color="green">Completada</Tag>;
  }
  return <Tag color="blue">Programada</Tag>;
};

export const MisAsignacionesPage: React.FC = () => {
  const isSmallScreen = useMediaQuery("(max-width: 992px)");
  const currentUser = useMemo(() => parseCurrentUser(), []);
  const currentWeekLink = useMemo(() => {
    const { year, week } = getIsoWeekInfo(dayjs());
    return `https://wol.jw.org/es/wol/meetings/r4/lp-s/${year}/${week}`;
  }, []);
  const [profileForm] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [currentMember, setCurrentMember] = useState<MiembroRow | null>(null);
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [items, setItems] = useState<AssignmentItem[]>([]);
  const [panelMonth, setPanelMonth] = useState(() => getDateKey(dayjs()));
  const [selectedDate, setSelectedDate] = useState(() => getDateKey(dayjs()));
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        if (!currentUser) {
          if (mounted) {
            setProfile(null);
            setCurrentMember(null);
            setItems([]);
          }
          return;
        }

        const fallbackProfile: ProfileResponse = {
          user: {
            id: currentUser.id,
            username: currentUser.username || "",
            email: currentUser.email || "",
          },
          member: null,
        };

        if (mounted) {
          setProfile(fallbackProfile);
        }

        const [
          profileResult,
          grupos,
          miembros,
          reuniones,
          conferencias,
          mecanicas,
          escuela,
          visitas,
          presidencia,
        ] = await Promise.all([
          api.get<{ data: ProfileResponse }>("/profile/me"),
          getCollection<GroupSummary>("grupos", {
            "pagination[pageSize]": 1000,
          }),
          getCollection<MiembroRow>("miembros", {
            populate: ["usuario"],
            "pagination[pageSize]": 1000,
          }),
          getCollection<ReunionRow>("reunions", {
            "pagination[pageSize]": 1000,
          }),
          getCollection<ConferenciaRow>("conferencias", {
            "pagination[pageSize]": 1000,
          }),
          getCollection<MecanicaRow>("mecanica-asignacions", {
            "pagination[pageSize]": 1000,
          }),
          getCollection<EscuelaRow>("escuela-asignacions", {
            populate: ["encargado", "ayudante"],
            "pagination[pageSize]": 1000,
          }),
          getCollection<VisitaRow>("visitas", {
            "pagination[pageSize]": 1000,
          }),
          getSingle<PresidenciaSingle>("presidencia", {
            populate: [
              "presidente",
              "conductorAtalaya",
              "discursoTema",
              "proximoTema",
            ],
          }),
        ]);

        const profileData = profileResult.data.data ?? fallbackProfile;
        const member =
          (profileData.member
            ? {
                id: profileData.member.id,
                nombre: profileData.member.nombre,
              }
            : null) ??
          miembros.find((item) => getUserId(item.usuario) === currentUser.id) ??
          miembros.find(
            (item) =>
              getUserEmail(item.usuario).toLowerCase() ===
              (currentUser.email ?? "").toLowerCase()
          ) ??
          null;

        if (!mounted) return;

        setProfile(profileData);
        setGroups(grupos.sort((a, b) => a.nombre.localeCompare(b.nombre)));
        setCurrentMember(member);

        if (!member) {
          setItems([]);
          return;
        }

        const nextItems: AssignmentItem[] = [];
        const memberName = member.nombre;
        const memberId = member.id;
        const matchesMember = (relation?: RelationSummary) =>
          Boolean(
            relation &&
              (relation.id === memberId ||
                normalizeNameKey(relation.nombre) ===
                  normalizeNameKey(memberName))
          );
        const matchesAssignmentRelation = (
          relation?: RelationSummary | EscuelaRelation
        ) =>
          Boolean(
            relation &&
              (getRelationId(relation as EscuelaRelation | RelationSummary) === memberId ||
                normalizeNameKey(
                  getRelationName(
                    relation as EscuelaRelation | RelationSummary,
                    ""
                  )
                ) === normalizeNameKey(memberName))
          );

        reuniones.forEach((row) => {
          if (matchesMember(row.presidente)) {
            nextItems.push({
              id: `reunion-pres-${row.id}`,
              date: row.fecha,
              title: "Presidente de reunión",
              category: "reunion",
              label: "Reunión",
              details: ["Rol: Presidente"],
              status: "programada",
            });
          }
          if (matchesMember(row.lector)) {
            nextItems.push({
              id: `reunion-lec-${row.id}`,
              date: row.fecha,
              title: "Lector de reunión",
              category: "reunion",
              label: "Reunión",
              details: ["Rol: Lector"],
              status: "programada",
            });
          }
          if (matchesMember(row.oracion)) {
            nextItems.push({
              id: `reunion-ora-${row.id}`,
              date: row.fecha,
              title: "Oración en reunión",
              category: "reunion",
              label: "Reunión",
              details: ["Rol: Oración"],
              status: "programada",
            });
          }
        });

        conferencias.forEach((row) => {
          if (row.auxiliar?.id === memberId) {
            nextItems.push({
              id: `conf-aux-${row.id}`,
              date: row.fecha,
              title: "Auxiliar de conferencia",
              category: "conferencia",
              label: "Conferencia",
              details: [
                `Orador: ${row.orador}`,
                `Congregación: ${row.cong}`,
                `Tema: ${row.tema?.titulo ?? "Pendiente"}`,
                `Canción: ${row.cancion ?? "Pendiente"}`,
              ],
              status: "programada",
            });
          }

          if (row.orador?.trim().toLowerCase() === memberName.trim().toLowerCase()) {
            nextItems.push({
              id: `conf-ora-${row.id}`,
              date: row.fecha,
              title: "Orador de conferencia",
              category: "conferencia",
              label: "Conferencia",
              details: [
                `Congregación: ${row.cong}`,
                `Tema: ${row.tema?.titulo ?? "Pendiente"}`,
                `Canción: ${row.cancion ?? "Pendiente"}`,
              ],
              status: "programada",
            });
          }
        });

        mecanicas.forEach((row) => {
          const roles: string[] = [];
          if (matchesMember(row.acomodadorDentro)) roles.push("Acomodador Dentro");
          if (matchesMember(row.acomodadorLobby)) roles.push("Acomodador Lobby");
          if (matchesMember(row.acomodadorReja)) roles.push("Acomodador Reja");
          if (matchesMember(row.micro1)) roles.push("Micrófono 1");
          if (matchesMember(row.micro2)) roles.push("Micrófono 2");
          if (matchesMember(row.plataforma)) roles.push("Plataforma");
          if (matchesMember(row.audioVideo)) roles.push("Zoom / Audio y Video");

          if (roles.length) {
            nextItems.push({
              id: `mec-${row.id}-${roles.join("-")}`,
              date: row.fecha,
              title: "Asignación de mecánicas",
              category: "mecanica",
              label: "Mecánicas",
              details: [
                `Rol(es): ${roles.join(", ")}`,
                `Limpieza: ${row.limpieza?.length ? row.limpieza.join(", ") : "Pendiente"}`,
              ],
              status: "programada",
            });
          }
        });

        escuela.forEach((row) => {
          if (matchesAssignmentRelation(row.encargado)) {
            nextItems.push({
              id: `esc-enc-${row.id}`,
              date: row.fecha,
              title: "Asignación en escuela",
              category: "escuela",
              label: "Escuela",
              details: [
                "Rol: Encargado",
                `Intervención: ${row.interventionNumber}`,
                `Lugar: ${row.presentationLocation}`,
                `Ayudante: ${getRelationName(row.ayudante, "Sin ayudante") || "Sin ayudante"}`,
              ],
              status: "programada",
            });
          }

          if (matchesAssignmentRelation(row.ayudante)) {
            nextItems.push({
              id: `esc-ayu-${row.id}`,
              date: row.fecha,
              title: "Asignación en escuela",
              category: "escuela",
              label: "Escuela",
              details: [
                "Rol: Ayudante",
                `Intervención: ${row.interventionNumber}`,
                `Lugar: ${row.presentationLocation}`,
                `Encargado: ${getRelationName(row.encargado, "Sin encargado") || "Sin encargado"}`,
              ],
              status: "programada",
            });
          }
        });

        if (presidencia?.fecha) {
          const presidenteId = getRelationId(
            presidencia.presidente as EscuelaRelation | RelationSummary
          );
          const conductorId = getRelationId(
            presidencia.conductorAtalaya as EscuelaRelation | RelationSummary
          );

          if (presidenteId === memberId) {
            nextItems.push({
              id: "presidencia-presidente",
              date: presidencia.fecha,
              title: "Presidente de reunión pública",
              category: "presidencia",
              label: "Presidencia",
              details: [
                `Orador: ${presidencia.orador ?? "Pendiente"}`,
                `Congregación: ${presidencia.congregacion ?? "Pendiente"}`,
                `Tema: ${getTemaTitulo(presidencia.discursoTema) || "Pendiente"}`,
                `Canción: ${presidencia.numeroCancion ?? "Pendiente"}`,
              ],
              status: "programada",
            });
          }

          if (conductorId === memberId) {
            nextItems.push({
              id: "presidencia-atalaya",
              date: presidencia.fecha,
              title: "Conductor de La Atalaya",
              category: "presidencia",
              label: "Presidencia",
              details: [
                `Orador: ${presidencia.orador ?? "Pendiente"}`,
                `Congregación: ${presidencia.congregacion ?? "Pendiente"}`,
                `Próximo tema: ${getTemaTitulo(presidencia.proximoTema) || "Pendiente"}`,
              ],
              status: "programada",
            });
          }
        }

        visitas
          .filter((row) => row.tipoRegistro !== "s4")
          .forEach((row) => {
          if (row.acompanante?.id === memberId) {
            nextItems.push({
              id: `visita-hacer-${row.id}`,
              date: row.fecha,
              title: `Pastoreo a ${row.miembro?.nombre ?? "miembro"}`,
              category: "pastoreo",
              label: "Pastoreo",
              details: [
                "Tipo: Por hacer",
                `Tema: ${row.tema || "Sin tema"}`,
                `Destino: ${row.miembro?.nombre ?? "Sin miembro"}`,
              ],
              status: row.completada ? "completada" : "pendiente",
            });
          }

          if (row.miembro?.id === memberId) {
            nextItems.push({
              id: `visita-recibir-${row.id}`,
              date: row.fecha,
              title: "Recibir visita de pastoreo",
              category: "pastoreo",
              label: "Pastoreo",
              details: [
                "Tipo: Por recibir",
                `Tema: ${row.tema || "Sin tema"}`,
                `Acompañante: ${row.acompanante?.nombre ?? "Sin acompañante"}`,
              ],
              status: row.completada ? "completada" : "pendiente",
            });
          }
        });

        setItems(
          nextItems.sort((a, b) =>
            a.date === b.date
              ? a.title.localeCompare(b.title)
              : a.date.localeCompare(b.date)
          )
        );
      } catch {
        if (mounted) {
          setItems([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const monthItems = useMemo(
    () =>
      items.filter((item) => dayjs(item.date).isSame(dayjs(panelMonth), "month")),
    [items, panelMonth]
  );

  const selectedDateItems = useMemo(() => {
    const dateKey = getDateKey(selectedDate);
    return monthItems.filter((item) => item.date === dateKey);
  }, [monthItems, selectedDate]);

  const groupedMonthItems = useMemo(() => {
    const groups = new Map<string, AssignmentItem[]>();
    monthItems.forEach((item) => {
      const current = groups.get(item.date) ?? [];
      current.push(item);
      groups.set(item.date, current);
    });

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dateItems]) => ({
        date,
        items: dateItems,
      }));
  }, [monthItems]);

  const selectedDateValue = dayjs(selectedDate);

  const profileDisplayName =
    profile?.member?.nombre ||
    [profile?.user?.firstname, profile?.user?.lastname]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    profile?.user?.username ||
    "Usuario";

  const profileInitial = profileDisplayName.charAt(0).toUpperCase() || "U";

  const openProfileModal = () => {
    const activeProfile =
      profile ??
      (currentUser
        ? {
            user: {
              id: currentUser.id,
              username: currentUser.username || "",
              email: currentUser.email || "",
            },
            member: null,
          }
        : null);

    if (!activeProfile) return;

    profileForm.setFieldsValue({
      username: activeProfile.user.username,
      email: activeProfile.user.email,
      nombres: activeProfile.member?.nombres || activeProfile.user.firstname || "",
      apellidos: activeProfile.member?.apellidos || activeProfile.user.lastname || "",
      telefono: activeProfile.member?.telefono || "",
      celular: activeProfile.member?.celular || "",
      direccion: activeProfile.member?.direccion || "",
      genero: activeProfile.member?.genero || undefined,
      grupo: activeProfile.member?.grupos?.[0]?.id,
      fechaNacimiento: activeProfile.member?.fechaNacimiento
        ? dayjs(activeProfile.member.fechaNacimiento)
        : null,
      fechaInmersion: activeProfile.member?.fechaInmersion
        ? dayjs(activeProfile.member.fechaInmersion)
        : null,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    setProfileModalOpen(true);
  };

  const handleSaveProfile = async (values: any) => {
    setSavingProfile(true);
    try {
      const payload: Record<string, unknown> = {
        username: values.username,
        nombres: values.nombres,
        apellidos: values.apellidos,
        telefono: values.telefono,
        celular: values.celular,
        direccion: values.direccion,
        genero: values.genero ?? null,
        fechaNacimiento: values.fechaNacimiento?.format?.("YYYY-MM-DD") ?? null,
        fechaInmersion: values.fechaInmersion?.format?.("YYYY-MM-DD") ?? null,
      };

      if (profileForm.isFieldTouched("grupo")) {
        payload.grupo = values.grupo ?? null;
      }

      const { data } = await api.put<{ data: ProfileResponse }>(
        "/profile/me",
        payload
      );

      if (values.currentPassword || values.newPassword || values.confirmPassword) {
        await api.post("/auth/change-password", {
          currentPassword: values.currentPassword,
          password: values.newPassword,
          passwordConfirmation: values.confirmPassword,
        });
      }

      setProfile(data.data);
      if (data.data.member) {
        setCurrentMember({
          id: data.data.member.id,
          nombre: data.data.member.nombre,
        });
      }

      localStorage.setItem("user", JSON.stringify(data.data.user));
      setProfileModalOpen(false);
      message.success("Perfil actualizado correctamente.");
    } catch (error: any) {
      const detail =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message?.[0]?.messages?.[0]?.message ||
        error?.message ||
        "No se pudo actualizar el perfil.";
      message.error(detail);
    } finally {
      setSavingProfile(false);
    }
  };

  const cellRender = (value: { format: (pattern: string) => string }) => {
    const dateKey = getDateKey(value);
    const dayItems = monthItems.filter((item) => item.date === dateKey);

    if (!dayItems.length) return null;

    return (
      <div style={{ paddingTop: 6 }}>
        <Space direction="vertical" size={4} style={{ width: "100%" }}>
          {dayItems.slice(0, 2).map((item) => (
            <Tag
              key={item.id}
              color={categoryMeta[item.category].color}
              style={{
                width: "100%",
                marginInlineEnd: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {item.label}
            </Tag>
          ))}
          {dayItems.length > 2 && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              +{dayItems.length - 2} más
            </Typography.Text>
          )}
        </Space>
      </div>
    );
  };

  if (loading) {
    return <Skeleton active paragraph={{ rows: 12 }} />;
  }

  return (
    <section>
      <Flex vertical gap={16}>
        <Card bordered={false}>
          <Flex
            justify="space-between"
            align={isSmallScreen ? "flex-start" : "center"}
            vertical={isSmallScreen}
            gap={12}
          >
            <Flex align="center" gap={16} wrap="wrap">
              <Avatar size={72} style={{ backgroundColor: "#1677ff" }}>
                {profileInitial}
              </Avatar>
              <div>
                <Typography.Title level={3} style={{ margin: 0 }}>
                  {profileDisplayName}
                </Typography.Title>
                <Typography.Text type="secondary">
                  {profile?.user?.email || "Sin correo"}
                </Typography.Text>
                <div style={{ marginTop: 8 }}>
                  <Space wrap size="middle">
                    <Badge
                      color="#1677ff"
                      text={`Usuario: ${profile?.user?.username || "Sin usuario"}`}
                    />
                    <Badge
                      color={currentMember ? "#52c41a" : "#faad14"}
                      text={
                        currentMember
                          ? `Miembro: ${currentMember.nombre}`
                          : "Sin miembro vinculado"
                      }
                    />
                    <Badge count={monthItems.length} showZero color="#722ed1" />
                  </Space>
                </div>
              </div>
            </Flex>
            <Space
              direction={isSmallScreen ? "vertical" : "horizontal"}
              size={12}
              style={{ width: isSmallScreen ? "100%" : "auto" }}
            >
              <Button
                type="link"
                href="https://login.jw.org/username"
                target="_blank"
                rel="noreferrer"
              >
                Usuario JW Login
              </Button>
              <Button
                type="link"
                href={currentWeekLink}
                target="_blank"
                rel="noreferrer"
              >
                Reunión de la semana
              </Button>
              <Button
                icon={<EditOutlined />}
                type="primary"
                onClick={openProfileModal}
              >
                Editar perfil
              </Button>
            </Space>
          </Flex>
          <div style={{ marginTop: 16 }}>
            <Descriptions
              size="small"
              column={isSmallScreen ? 1 : 3}
              items={[
                {
                  key: "telefono",
                  label: "Teléfono",
                  children: profile?.member?.telefono || "No registrado",
                },
                {
                  key: "celular",
                  label: "Celular",
                  children: profile?.member?.celular || "No registrado",
                },
                {
                  key: "inmersion",
                  label: "Fecha de Bautismo",
                  children: profile?.member?.fechaInmersion || "No registrada",
                },
                {
                  key: "genero",
                  label: "Género",
                  children:
                    profile?.member?.genero === "hombre"
                      ? "Hombre"
                      : profile?.member?.genero === "mujer"
                      ? "Mujer"
                      : "No registrado",
                },
                {
                  key: "grupo",
                  label: "Grupo",
                  children: profile?.member?.grupos?.[0]?.nombre || "Sin grupo",
                },
                {
                  key: "nombramientos",
                  label: "Nombramientos",
                  children: profile?.member?.nombramientos?.length ? (
                    <Space wrap size={[4, 4]}>
                      {profile.member.nombramientos.map((nombramiento) => (
                        <Tag key={nombramiento} color="geekblue">
                          {nombramiento.replace(/_/g, " ")}
                        </Tag>
                      ))}
                    </Space>
                  ) : (
                    "Sin nombramientos"
                  ),
                },
              ]}
            />
          </div>
          {!currentMember && (
            <Alert
              style={{ marginTop: 16 }}
              type="warning"
              showIcon
              message="Tu usuario todavía no tiene un miembro vinculado."
              description="Completa y guarda tu perfil para crear o corregir tu información personal y empezar a ver tus asignaciones."
            />
          )}
        </Card>

        {currentMember ? (
          <Flex gap={16} vertical={isSmallScreen} align="stretch">
            <Card
              bordered={false}
              style={{ flex: 1, minWidth: 0 }}
              bodyStyle={{ padding: isSmallScreen ? 12 : 20 }}
            >
              <Typography.Title level={4} style={{ marginTop: 0 }}>
                {monthTitle(panelMonth)}
              </Typography.Title>
              <Calendar
                value={selectedDateValue}
                fullscreen
                cellRender={cellRender}
                onSelect={(value) => setSelectedDate(getDateKey(value))}
                onPanelChange={(value) => {
                  const nextDate = getDateKey(value);
                  setPanelMonth(nextDate);
                  setSelectedDate(nextDate);
                }}
              />
            </Card>

            <div style={{ width: isSmallScreen ? "100%" : 360, flexShrink: 0 }}>
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <Card bordered={false}>
                  <Typography.Title level={4} style={{ marginTop: 0 }}>
                    {selectedDateValue.locale("es").format("D [de] MMMM [de] YYYY")}
                  </Typography.Title>
                  {selectedDateItems.length ? (
                    <List
                      itemLayout="vertical"
                      dataSource={selectedDateItems}
                      renderItem={(item) => (
                        <List.Item key={item.id}>
                          <Space direction="vertical" size={6} style={{ width: "100%" }}>
                            <Space wrap>
                              <Tag color={categoryMeta[item.category].color}>
                                {categoryMeta[item.category].label}
                              </Tag>
                              {statusTag(item.status)}
                            </Space>
                            <Typography.Text strong>{item.title}</Typography.Text>
                            <Space direction="vertical" size={2}>
                              {item.details.map((detail) => (
                                <Typography.Text key={detail} type="secondary">
                                  {detail}
                                </Typography.Text>
                              ))}
                            </Space>
                          </Space>
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Empty
                      description="No tienes asignaciones para esta fecha."
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  )}
                </Card>

                <Card bordered={false}>
                  <Typography.Title level={4} style={{ marginTop: 0 }}>
                    Resumen del Mes
                  </Typography.Title>
                  {groupedMonthItems.length ? (
                    <List
                      dataSource={groupedMonthItems}
                      renderItem={(group) => (
                        <List.Item key={group.date}>
                          <Space direction="vertical" size={8} style={{ width: "100%" }}>
                            <Typography.Text strong>
                              {dayjs(group.date).locale("es").format("ddd, D MMM YYYY")}
                            </Typography.Text>
                            <Space wrap>
                              {group.items.map((item) => (
                                <Tag
                                  key={item.id}
                                  color={categoryMeta[item.category].color}
                                  style={{ marginInlineEnd: 0 }}
                                >
                                  {item.title}
                                </Tag>
                              ))}
                            </Space>
                          </Space>
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Empty
                      description="No hay asignaciones este mes."
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  )}
                </Card>
              </Space>
            </div>
          </Flex>
        ) : (
          <Card bordered={false}>
            <Empty
              description="Cuando completes tu perfil, aquí aparecerán tus asignaciones."
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </Card>
        )}
      </Flex>

      <Modal
        title="Editar mi perfil"
        open={profileModalOpen}
        onCancel={() => setProfileModalOpen(false)}
        onOk={() => profileForm.submit()}
        confirmLoading={savingProfile}
        width={isSmallScreen ? "100%" : 720}
        okText="Guardar cambios"
        cancelText="Cancelar"
      >
        <Form form={profileForm} layout="vertical" onFinish={handleSaveProfile}>
          <Flex gap={16} vertical={isSmallScreen}>
            <Form.Item
              name="username"
              label="Usuario"
              rules={[{ required: true, message: "Ingresa tu usuario" }]}
              style={{ flex: 1 }}
            >
              <Input disabled />
            </Form.Item>
            <Form.Item name="email" label="Correo electrónico" style={{ flex: 1 }}>
              <Input disabled />
            </Form.Item>
          </Flex>

          <Flex gap={16} vertical={isSmallScreen}>
            <Form.Item
              name="nombres"
              label="Nombres"
              rules={[{ required: true, message: "Ingresa tus nombres" }]}
              style={{ flex: 1 }}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="apellidos"
              label="Apellidos"
              rules={[{ required: true, message: "Ingresa tus apellidos" }]}
              style={{ flex: 1 }}
            >
              <Input />
            </Form.Item>
          </Flex>

          <Flex gap={16} vertical={isSmallScreen}>
            <Form.Item name="telefono" label="Teléfono" style={{ flex: 1 }}>
              <PhoneInput
                className="grupos-phone"
                defaultCountry="CO"
                international
                countryCallingCodeEditable={false}
                placeholder="Ej: +57 571234567"
                value={profileForm.getFieldValue("telefono")}
                onChange={(value) => profileForm.setFieldValue("telefono", value)}
              />
            </Form.Item>
            <Form.Item name="celular" label="Celular" style={{ flex: 1 }}>
              <PhoneInput
                className="grupos-phone"
                defaultCountry="CO"
                international
                countryCallingCodeEditable={false}
                placeholder="Ej: +57 3201234567"
                value={profileForm.getFieldValue("celular")}
                onChange={(value) => profileForm.setFieldValue("celular", value)}
              />
            </Form.Item>
          </Flex>

          <Flex gap={16} vertical={isSmallScreen}>
            <Form.Item name="fechaNacimiento" label="Fecha de nacimiento" style={{ flex: 1 }}>
              <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
            </Form.Item>
            <Form.Item name="fechaInmersion" label="Fecha de bautismo" style={{ flex: 1 }}>
              <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
            </Form.Item>
          </Flex>

          <Flex gap={16} vertical={isSmallScreen}>
            <Form.Item
              name="genero"
              label="Género"
              style={{ flex: 1 }}
              rules={[{ required: true, message: "Selecciona tu género" }]}
            >
              <Select
                options={[
                  { value: "hombre", label: "Hombre" },
                  { value: "mujer", label: "Mujer" },
                ]}
                placeholder="Selecciona tu género"
              />
            </Form.Item>
            <Form.Item name="grupo" label="Grupo" style={{ flex: 1 }}>
              <Select
                allowClear
                placeholder="Selecciona un grupo"
                options={groups.map((group) => ({
                  value: group.id,
                  label: group.nombre,
                }))}
              />
            </Form.Item>
          </Flex>

          <Form.Item name="direccion" label="Dirección">
            <Input />
          </Form.Item>

          <Form.Item label="Nombramientos">
            <Space wrap size={[4, 4]}>
              {(profile?.member?.nombramientos?.length
                ? profile.member.nombramientos
                : ["Sin nombramientos"]
              ).map((nombramiento) => (
                <Tag
                  key={nombramiento}
                  color={nombramiento === "Sin nombramientos" ? "default" : "geekblue"}
                >
                  {nombramiento === "Sin nombramientos"
                    ? nombramiento
                    : nombramiento.replace(/_/g, " ")}
                </Tag>
              ))}
            </Space>
          </Form.Item>

          <Typography.Title level={5}>Cambiar contraseña</Typography.Title>
          <Flex gap={16} vertical>
            <Form.Item name="currentPassword" label="Contraseña actual">
              <Input.Password />
            </Form.Item>
            <Form.Item
              name="newPassword"
              label="Nueva contraseña"
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value && !getFieldValue("currentPassword")) {
                      return Promise.resolve();
                    }
                    if (value && value.length >= 6) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error("La nueva contraseña debe tener al menos 6 caracteres.")
                    );
                  },
                }),
              ]}
            >
              <Input.Password />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label="Confirmar nueva contraseña"
              dependencies={["newPassword"]}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!getFieldValue("newPassword") && !value) {
                      return Promise.resolve();
                    }
                    if (value === getFieldValue("newPassword")) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error("La confirmación no coincide con la nueva contraseña.")
                    );
                  },
                }),
              ]}
            >
              <Input.Password />
            </Form.Item>
          </Flex>
        </Form>
      </Modal>
    </section>
  );
};
