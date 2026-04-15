import React, { useEffect, useMemo, useState } from "react";
import { Form, Skeleton, message } from "antd";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { api, getCollection, getSingle } from "../../api/client";
import useMediaQuery from "../../hooks/useMediaQuery";
import { buildAssignmentItems, groupAssignmentItemsByDate } from "./assignments";
import { AUTH_STORAGE_EVENT } from "./constants";
import { AssignmentsBoard } from "./components/AssignmentsBoard";
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
  PresidenciaSingle,
  ProfileFormValues,
  ProfileMember,
  ProfileResponse,
  ReunionRow,
  VisitaRow,
} from "./types";
import {
  createFallbackProfile,
  fetchAllCollection,
  getDateKey,
  getIsoWeekInfo,
  getProfileErrorMessage,
  parseCurrentUser,
  populateProfileForm,
  resolveProfileState,
  syncStoredProfileUser,
  toProfileMember,
} from "./utils";

dayjs.locale("es");

export const MisAsignacionesPage: React.FC = () => {
  const isSmallScreen = useMediaQuery("(max-width: 992px)");
  const currentWeekLink = useMemo(() => {
    const { year, week } = getIsoWeekInfo(dayjs());
    return `https://wol.jw.org/es/wol/meetings/r4/lp-s/${year}/${week}`;
  }, []);

  const [profileForm] = Form.useForm<ProfileFormValues>();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() =>
    parseCurrentUser()
  );
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [currentMember, setCurrentMember] = useState<ProfileMember>(null);
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [items, setItems] = useState<AssignmentItem[]>([]);
  const [panelMonth, setPanelMonth] = useState(() => getDateKey(dayjs()));
  const [selectedDate, setSelectedDate] = useState(() => getDateKey(dayjs()));
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

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

        const fallbackProfile = createFallbackProfile(currentUser);

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
          fetchAllCollection<MiembroRow>("miembros", {
            populate: ["usuario", "grupos"],
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
        setGroups(grupos.sort((a, b) => a.nombre.localeCompare(b.nombre)));
        setItems(
          resolvedMember
            ? buildAssignmentItems({
                member: resolvedMember,
                reuniones,
                conferencias,
                mecanicas,
                escuela,
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
  }, [currentUser]);

  const monthItems = useMemo(
    () =>
      items.filter((item) => dayjs(item.date).isSame(dayjs(panelMonth), "month")),
    [items, panelMonth]
  );

  const selectedDateItems = useMemo(() => {
    const dateKey = getDateKey(selectedDate);
    return monthItems.filter((item) => item.date === dateKey);
  }, [monthItems, selectedDate]);

  const groupedMonthItems = useMemo(
    () => groupAssignmentItemsByDate(monthItems),
    [monthItems]
  );

  const selectedDateValue = useMemo(() => dayjs(selectedDate), [selectedDate]);

  const openProfileModal = () => {
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

  const handleSaveProfile = async (values: ProfileFormValues) => {
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
      message.success("Perfil actualizado correctamente.");
    } catch (error) {
      message.error(getProfileErrorMessage(error));
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return <Skeleton active paragraph={{ rows: 12 }} />;
  }

  return (
    <section>
      <ProfileSummaryCard
        profile={profile}
        currentMember={currentMember}
        assignmentCount={monthItems.length}
        currentWeekLink={currentWeekLink}
        isSmallScreen={isSmallScreen}
        onEdit={openProfileModal}
      />

      <div style={{ marginTop: 16 }}>
        <AssignmentsBoard
          currentMember={currentMember}
          isSmallScreen={isSmallScreen}
          panelMonth={panelMonth}
          monthItems={monthItems}
          selectedDateItems={selectedDateItems}
          groupedMonthItems={groupedMonthItems}
          selectedDateValue={selectedDateValue}
          onSelectDate={setSelectedDate}
          onPanelChange={setPanelMonth}
        />
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
    </section>
  );
};
