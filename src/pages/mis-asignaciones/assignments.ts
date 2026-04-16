import type {
  AssignmentItem,
  ConferenciaRow,
  EscuelaRelation,
  EscuelaRow,
  GroupedAssignmentItems,
  MecanicaRow,
  PresidenciaSingle,
  ProfileMember,
  RelationSummary,
  ReunionRow,
  VmAssignmentRow,
  VisitaRow,
} from "./types";
import {
  getRelationId,
  getRelationName,
  getTemaTitulo,
  normalizeNameKey,
} from "./utils";

export const buildAssignmentItems = ({
  member,
  reuniones,
  conferencias,
  mecanicas,
  escuela,
  vmAssignments,
  visitas,
  presidencia,
}: {
  member: NonNullable<ProfileMember>;
  reuniones: ReunionRow[];
  conferencias: ConferenciaRow[];
  mecanicas: MecanicaRow[];
  escuela: EscuelaRow[];
  vmAssignments: VmAssignmentRow[];
  visitas: VisitaRow[];
  presidencia: PresidenciaSingle | null;
}) => {
  const nextItems: AssignmentItem[] = [];
  const memberName = member.nombre;
  const memberId = member.id;
  const memberNameKey = normalizeNameKey(memberName);

  const matchesMember = (relation?: RelationSummary) =>
    Boolean(
      relation &&
        (relation.id === memberId ||
          normalizeNameKey(relation.nombre) === normalizeNameKey(memberName))
    );

  const matchesAssignmentRelation = (
    relation?: RelationSummary | EscuelaRelation
  ) =>
    Boolean(
      relation &&
        (getRelationId(relation as EscuelaRelation | RelationSummary) === memberId ||
          normalizeNameKey(
            getRelationName(relation as EscuelaRelation | RelationSummary, "")
          ) === normalizeNameKey(memberName))
    );

  const resolveVmSchoolRoleLabel = (row: VmAssignmentRow) => {
    switch (row.role) {
      case "president":
        return "Presidente";
      case "counselor":
        return "Consejero";
      case "prayer_open":
        return "Oración de apertura";
      case "prayer_close":
        return "Oración de cierre";
      case "cbs_conductor":
        return "Conductor CBS";
      case "cbs_reader":
        return "Lector CBS";
      case "student":
        if (row.partOrder === 1) return "Tesoros (Discurso)";
        if (row.partOrder === 2) return "Tesoros (Perlas escondidas)";
        return "";
      default:
        return "";
    }
  };

  const resolveVmRoomLabel = (room?: VmAssignmentRow["room"]) => {
    if (room === "MAIN") return "Sala principal";
    if (room === "AUX") return "Sala auxiliar";
    return "";
  };

  const resolveSchoolPresentationLocationLabel = (location?: string) => {
    if (location === "main_hall") return "Sala principal";
    if (location === "auxiliary_hall") return "Sala auxiliar";
    return "";
  };

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
          `Lugar: ${resolveSchoolPresentationLocationLabel(row.presentationLocation) || row.presentationLocation}`,
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
          `Lugar: ${resolveSchoolPresentationLocationLabel(row.presentationLocation) || row.presentationLocation}`,
          `Encargado: ${getRelationName(row.encargado, "Sin encargado") || "Sin encargado"}`,
        ],
        status: "programada",
      });
    }
  });

  vmAssignments.forEach((row) => {
    const roleLabel = resolveVmSchoolRoleLabel(row);
    if (!roleLabel || !row.weekStart) {
      return;
    }

    const isAssigned = row.assignees.some(
      (assignee) => normalizeNameKey(assignee.fullName) === memberNameKey
    );

    if (!isAssigned) {
      return;
    }

    const details = [`Rol: ${roleLabel}`];
    const roomLabel = resolveVmRoomLabel(row.room);

    if (row.role === "student" && row.partOrder > 0) {
      details.push(`Parte: ${row.partOrder}`);
    }

    if (roomLabel) {
      details.push(`Lugar: ${roomLabel}`);
    }

    details.push(
      row.weekEnd && row.weekEnd !== row.weekStart
        ? `Semana: ${row.weekStart} - ${row.weekEnd}`
        : `Semana: ${row.weekStart}`
    );

    nextItems.push({
      id: `esc-vm-${row.id}-${row.role}-${row.partOrder}`,
      date: row.meetingDate || row.weekStart,
      title: "Asignación en escuela",
      category: "escuela",
      label: "Escuela",
      details,
      status: "programada",
    });
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

  return nextItems.sort((a, b) =>
    a.date === b.date
      ? a.title.localeCompare(b.title)
      : a.date.localeCompare(b.date)
  );
};

export const groupAssignmentItemsByDate = (items: AssignmentItem[]) => {
  const groups = new Map<string, AssignmentItem[]>();

  items.forEach((item) => {
    const current = groups.get(item.date) ?? [];
    current.push(item);
    groups.set(item.date, current);
  });

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([date, dateItems]) =>
        ({
          date,
          items: dateItems,
        }) satisfies GroupedAssignmentItems
    );
};
