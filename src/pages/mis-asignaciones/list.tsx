import React, { useEffect, useMemo, useState } from "react";
import { Form, Skeleton, message } from "antd";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { useAdaptiveUI } from "../../adaptive/useAdaptiveUI";
import { api, getCollection, getOptionalSingle } from "../../api/client";
import { useDirectory } from "../../contexts/directory";
import useMediaQuery from "../../hooks/useMediaQuery";
import { buildAssignmentItems, groupAssignmentItemsByDate } from "./assignments";
import { AUTH_STORAGE_EVENT } from "./constants";
import { AssignmentsBoard } from "./components/AssignmentsBoard";
import { PersonalAppointmentModal } from "./components/PersonalAppointmentModal";
import {
  MobileProfileEditor,
  type MobileProfileFormValues,
} from "./components/MobileProfileEditor";
import { MobileAssignmentsBoard } from "./components/MobileAssignmentsBoard";
import { MobileProfileSummary } from "./components/MobileProfileSummary";
import { ProfileModal } from "./components/ProfileModal";
import { ProfileSummaryCard } from "./components/ProfileSummaryCard";
import type {
  AssignmentItem,
  ConferenciaRow,
  CurrentUser,
  EscuelaRow,
  GroupSummary,
  MecanicaRow,
  MiembroRow,
  PersonalAppointment,
  PersonalAppointmentFormValues,
  PresidenciaSingle,
  ProfileFormValues,
  ProfileMember,
  ProfileResponse,
  ReunionRow,
  VmAssignmentRow,
  VmSettings,
  VisitaRow,
} from "./types";
import {
  createFallbackProfile,
  createPersonalAppointmentId,
  getDateKey,
  getIsoWeekInfo,
  getProfileErrorMessage,
  getProfileFormValues,
  groupPersonalAppointmentsByDate,
  parseCurrentUser,
  persistPersonalAppointments,
  populateProfileForm,
  readPersonalAppointments,
  resolveProfileState,
  sortPersonalAppointments,
  syncStoredProfileUser,
  toProfileMember,
} from "./utils";

dayjs.locale("es");

const normalizeVmAssignees = (raw: unknown): VmAssignmentRow["assignees"] => {
  const items =
    raw && typeof raw === "object" && "data" in raw
      ? (raw as { data?: unknown }).data
      : raw;

  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((person) => {
      if (!person || typeof person !== "object") {
        return null;
      }

      const candidate = person as {
        id?: number;
        fullName?: string;
        attributes?: { fullName?: string };
      };

      if (!candidate.id) {
        return null;
      }

      return {
        id: candidate.id,
        fullName: candidate.attributes?.fullName ?? candidate.fullName ?? "",
      };
    })
    .filter((person): person is VmAssignmentRow["assignees"][number] =>
      Boolean(person?.id && person.fullName)
    );
};

const normalizeVmWeekSummary = (raw: unknown) => {
  const item =
    raw && typeof raw === "object" && "data" in raw
      ? (raw as { data?: unknown }).data
      : raw;

  if (!item || typeof item !== "object") {
    return null;
  }

  const candidate = item as {
    weekStart?: string;
    weekEnd?: string;
    attributes?: { weekStart?: string; weekEnd?: string };
  };

  return {
    weekStart: candidate.attributes?.weekStart ?? candidate.weekStart,
    weekEnd: candidate.attributes?.weekEnd ?? candidate.weekEnd,
  };
};

const meetingDayToDayIndex: Record<NonNullable<VmSettings["meetingDay"]>, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const resolveMeetingDate = (
  week: ReturnType<typeof normalizeVmWeekSummary>,
  meetingDay?: VmSettings["meetingDay"]
) => {
  if (!week?.weekStart) {
    return undefined;
  }

  if (!meetingDay) {
    return week.weekStart;
  }

  const start = dayjs(week.weekStart);
  const end = dayjs(week.weekEnd ?? week.weekStart);
  const targetDay = meetingDayToDayIndex[meetingDay];

  if (!start.isValid() || !end.isValid()) {
    return week.weekStart;
  }

  let cursor = start.startOf("day");
  while (cursor.isBefore(end, "day") || cursor.isSame(end, "day")) {
    if (cursor.day() === targetDay) {
      return cursor.format("YYYY-MM-DD");
    }
    cursor = cursor.add(1, "day");
  }

  return week.weekStart;
};

export const MisAsignacionesPage: React.FC = () => {
  const isSmallScreen = useMediaQuery("(max-width: 992px)");
  const { resolvedMode } = useAdaptiveUI();
  const {
    grupos: directoryGroups,
    miembros: directoryMembers,
    loaded: directoryLoaded,
  } = useDirectory();
  const currentWeekLink = useMemo(() => {
    const { year, week } = getIsoWeekInfo(dayjs());
    return `https://wol.jw.org/es/wol/meetings/r4/lp-s/${year}/${week}`;
  }, []);

  const [profileForm] = Form.useForm<ProfileFormValues>();
  const [appointmentForm] = Form.useForm<PersonalAppointmentFormValues>();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() =>
    parseCurrentUser()
  );
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [currentMember, setCurrentMember] = useState<ProfileMember>(null);
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [items, setItems] = useState<AssignmentItem[]>([]);
  const [personalAppointments, setPersonalAppointments] = useState<
    PersonalAppointment[]
  >([]);
  const [panelMonth, setPanelMonth] = useState(() => getDateKey(dayjs()));
  const [selectedDate, setSelectedDate] = useState(() => getDateKey(dayjs()));
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const [mobileProfileValues, setMobileProfileValues] = useState<MobileProfileFormValues>({
    username: "",
    email: "",
    nombres: "",
    apellidos: "",
    telefono: "",
    celular: "",
    direccion: "",
    genero: undefined,
    grupo: undefined,
    fechaNacimiento: "",
    fechaInmersion: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const miembros = useMemo<MiembroRow[]>(
    () =>
      directoryMembers.map((member) => ({
        id: member.id,
        documentId: member.documentId,
        nombre: member.nombre,
        nombres: member.nombres,
        apellidos: member.apellidos,
        telefono: member.telefono,
        celular: member.celular,
        direccion: member.direccion,
        fechaNacimiento: member.fechaNacimiento,
        fechaInmersion: member.fechaInmersion,
        genero: member.genero ?? "",
        nombramientos: member.nombramientos,
        grupos: member.grupos,
        usuario: {
          id: member.usuarioId,
          email: member.usuarioEmail,
          username: member.usuarioUsername,
        },
      })),
    [directoryMembers]
  );

  useEffect(() => {
    const syncCurrentUser = () => {
      setCurrentUser(parseCurrentUser());
    };

    window.addEventListener(AUTH_STORAGE_EVENT, syncCurrentUser);
    window.addEventListener("storage", syncCurrentUser);

    return () => {
      window.removeEventListener(AUTH_STORAGE_EVENT, syncCurrentUser);
      window.removeEventListener("storage", syncCurrentUser);
    };
  }, []);

  useEffect(() => {
    setPersonalAppointments(readPersonalAppointments(currentUser?.id));
  }, [currentUser?.id]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);

      try {
        if (!currentUser) {
          if (mounted) {
            setProfile(null);
            setCurrentMember(null);
            setGroups([]);
            setItems([]);
            setLoading(false);
          }
          return;
        }

        if (!directoryLoaded) {
          return;
        }

        const fallbackProfile = createFallbackProfile(currentUser);

        if (mounted) {
          setProfile(fallbackProfile);
        }

        const [
          profileResult,
          reuniones,
          conferencias,
          mecanicas,
          escuela,
          vmAssignments,
          vmSettings,
          visitas,
          presidencia,
        ] = await Promise.all([
          api.get<{ data: ProfileResponse }>("/profile/me"),
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
          getCollection<any>("vm-assignments", {
            populate: ["assignees", "week"],
            "pagination[pageSize]": 1000,
          }),
          getOptionalSingle<VmSettings>("vm-setting"),
          getCollection<VisitaRow>("visitas", {
            "pagination[pageSize]": 1000,
          }),
          getOptionalSingle<PresidenciaSingle>("presidencia", {
            populate: [
              "presidente",
              "conductorAtalaya",
              "discursoTema",
              "proximoTema",
            ],
          }),
        ]);

        const { profile: resolvedProfile, member: resolvedMember } =
          resolveProfileState({
            currentUser,
            profileData: profileResult.data.data ?? fallbackProfile,
            miembros,
          });

        if (!mounted) {
          return;
        }

        setProfile(resolvedProfile);
        setCurrentMember(resolvedMember);
        setGroups(
          directoryGroups
            .map((group) => ({
              id: group.id,
              nombre: group.nombre,
            }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre))
        );
        setItems(
          resolvedMember
            ? buildAssignmentItems({
                member: resolvedMember,
                reuniones,
                conferencias,
                mecanicas,
                escuela,
                vmAssignments: vmAssignments.map((assignment) => {
                  const week = normalizeVmWeekSummary(assignment.week);

                  return {
                    id: assignment.id,
                    partOrder: assignment.partOrder ?? 0,
                    role: assignment.role,
                    room: assignment.room,
                    meetingDate: resolveMeetingDate(week, vmSettings?.meetingDay),
                    weekStart: week?.weekStart,
                    weekEnd: week?.weekEnd,
                    assignees: normalizeVmAssignees(assignment.assignees),
                  } satisfies VmAssignmentRow;
                }),
                visitas,
                presidencia,
              })
            : []
        );
      } catch {
        if (mounted) {
          setItems([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [currentUser, directoryGroups, directoryLoaded, miembros]);

  const monthItems = useMemo(
    () =>
      items.filter((item) => dayjs(item.date).isSame(dayjs(panelMonth), "month")),
    [items, panelMonth]
  );

  const monthAppointments = useMemo(
    () =>
      personalAppointments.filter((appointment) =>
        dayjs(appointment.date).isSame(dayjs(panelMonth), "month")
      ),
    [panelMonth, personalAppointments]
  );

  const selectedDateItems = useMemo(() => {
    const dateKey = getDateKey(selectedDate);
    return monthItems.filter((item) => item.date === dateKey);
  }, [monthItems, selectedDate]);

  const selectedDateAppointments = useMemo(() => {
    const dateKey = getDateKey(selectedDate);
    return monthAppointments.filter((appointment) => appointment.date === dateKey);
  }, [monthAppointments, selectedDate]);

  const groupedMonthItems = useMemo(
    () => groupAssignmentItemsByDate(monthItems),
    [monthItems]
  );

  const groupedMonthAppointments = useMemo(
    () => groupPersonalAppointmentsByDate(monthAppointments),
    [monthAppointments]
  );

  const selectedDateValue = useMemo(() => dayjs(selectedDate), [selectedDate]);

  const openAppointmentModal = () => {
    appointmentForm.setFieldsValue({
      date: dayjs(selectedDate),
      title: "",
      description: "",
    });
    setAppointmentModalOpen(true);
  };

  const openProfileModal = () => {
    if (resolvedMode === "mobile") {
      const baseValues = getProfileFormValues({
        profile,
        currentUser,
        currentMember,
      });

      if (!baseValues) {
        return;
      }

      setMobileProfileValues({
        username: baseValues.username,
        email: baseValues.email,
        nombres: baseValues.nombres,
        apellidos: baseValues.apellidos,
        telefono: baseValues.telefono || "",
        celular: baseValues.celular || "",
        direccion: baseValues.direccion || "",
        genero: baseValues.genero,
        grupo: baseValues.grupo,
        fechaNacimiento: baseValues.fechaNacimiento?.format("YYYY-MM-DD") ?? "",
        fechaInmersion: baseValues.fechaInmersion?.format("YYYY-MM-DD") ?? "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setMobileProfileOpen(true);
      return;
    }

    const populated = populateProfileForm({
      form: profileForm,
      profile,
      currentUser,
      currentMember,
    });

    if (!populated) {
      return;
    }

    setProfileModalOpen(true);
  };

  const formatProfileDate = (value: unknown) => {
    if (!value) {
      return null;
    }

    if (typeof value === "string") {
      return value.trim().length > 0 ? value : null;
    }

    return dayjs(value as any).isValid()
      ? dayjs(value as any).format("YYYY-MM-DD")
      : null;
  };

  const handleSaveProfile = async (
    values: ProfileFormValues | MobileProfileFormValues,
  ) => {
    setSavingProfile(true);

    try {
      if (
        values.newPassword &&
        values.confirmPassword &&
        values.newPassword !== values.confirmPassword
      ) {
        throw new Error("La confirmación no coincide con la nueva contraseña.");
      }

      if (values.newPassword && values.newPassword.length < 6) {
        throw new Error("La nueva contraseña debe tener al menos 6 caracteres.");
      }

      const payload: Record<string, unknown> = {
        username: values.username,
        nombres: values.nombres,
        apellidos: values.apellidos,
        telefono: values.telefono,
        celular: values.celular,
        direccion: values.direccion,
        genero: values.genero ?? null,
        fechaNacimiento: formatProfileDate(values.fechaNacimiento),
        fechaInmersion: formatProfileDate(values.fechaInmersion),
        grupo: values.grupo ?? null,
      };

      const { data } = await api.put<{ data: ProfileResponse }>("/profile/me", payload);

      if (values.currentPassword || values.newPassword || values.confirmPassword) {
        await api.post("/auth/change-password", {
          currentPassword: values.currentPassword,
          password: values.newPassword,
          passwordConfirmation: values.confirmPassword,
        });
      }

      const updatedProfile: ProfileResponse = {
        ...data.data,
        member: toProfileMember(data.data.member),
      };

      setProfile(updatedProfile);
      setCurrentMember(updatedProfile.member);
      syncStoredProfileUser(data.data.user);
      setProfileModalOpen(false);
      setMobileProfileOpen(false);
      message.success("Perfil actualizado correctamente.");
    } catch (error) {
      message.error(getProfileErrorMessage(error));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCreateAppointment = (values: PersonalAppointmentFormValues) => {
    if (!currentUser?.id) {
      message.error("No pudimos identificar el usuario para guardar la cita.");
      return;
    }

    const nextAppointment: PersonalAppointment = {
      id: createPersonalAppointmentId(),
      date: getDateKey(values.date ?? dayjs()),
      title: values.title.trim(),
      description: values.description.trim(),
      createdAt: new Date().toISOString(),
    };

    setPersonalAppointments((current) => {
      const nextAppointments = sortPersonalAppointments([
        ...current,
        nextAppointment,
      ]);

      persistPersonalAppointments(currentUser.id, nextAppointments);
      return nextAppointments;
    });

    setPanelMonth(nextAppointment.date);
    setSelectedDate(nextAppointment.date);
    setAppointmentModalOpen(false);
    appointmentForm.resetFields();
    message.success("Cita personal agendada correctamente.");
  };

  if (loading) {
    return <Skeleton active paragraph={{ rows: 12 }} />;
  }

  return (
    <section>
      {resolvedMode === "mobile" ? (
        <MobileProfileSummary
          profile={profile}
          currentMember={currentMember}
          assignmentCount={monthItems.length}
          currentWeekLink={currentWeekLink}
          onSchedule={openAppointmentModal}
          onEdit={openProfileModal}
        />
      ) : (
        <ProfileSummaryCard
          profile={profile}
          currentMember={currentMember}
          assignmentCount={monthItems.length}
          currentWeekLink={currentWeekLink}
          isSmallScreen={isSmallScreen}
          onSchedule={openAppointmentModal}
          onEdit={openProfileModal}
        />
      )}

      <div style={{ marginTop: 16 }}>
        {resolvedMode === "mobile" ? (
          <MobileAssignmentsBoard
            currentMember={currentMember}
            panelMonth={panelMonth}
            selectedDateItems={selectedDateItems}
            selectedDateAppointments={selectedDateAppointments}
            groupedMonthItems={groupedMonthItems}
            groupedMonthAppointments={groupedMonthAppointments}
            selectedDateValue={selectedDateValue}
            onSelectDate={setSelectedDate}
            onPanelChange={setPanelMonth}
          />
        ) : (
          <AssignmentsBoard
            currentMember={currentMember}
            isSmallScreen={isSmallScreen}
            panelMonth={panelMonth}
            monthItems={monthItems}
            monthAppointments={monthAppointments}
            selectedDateItems={selectedDateItems}
            selectedDateAppointments={selectedDateAppointments}
            groupedMonthItems={groupedMonthItems}
            groupedMonthAppointments={groupedMonthAppointments}
            selectedDateValue={selectedDateValue}
            onSelectDate={setSelectedDate}
            onPanelChange={setPanelMonth}
          />
        )}
      </div>

      <ProfileModal
        form={profileForm}
        open={profileModalOpen}
        saving={savingProfile}
        isSmallScreen={isSmallScreen}
        groups={groups}
        profile={profile}
        currentMember={currentMember}
        onCancel={() => setProfileModalOpen(false)}
        onSubmit={handleSaveProfile}
      />
      <PersonalAppointmentModal
        form={appointmentForm}
        open={appointmentModalOpen}
        isSmallScreen={isSmallScreen}
        onCancel={() => {
          setAppointmentModalOpen(false);
          appointmentForm.resetFields();
        }}
        onSubmit={handleCreateAppointment}
      />
      <MobileProfileEditor
        currentMember={currentMember}
        groups={groups}
        open={mobileProfileOpen}
        saving={savingProfile}
        values={mobileProfileValues}
        onChange={setMobileProfileValues}
        onClose={() => setMobileProfileOpen(false)}
        onSubmit={() => handleSaveProfile(mobileProfileValues)}
      />
    </section>
  );
};
