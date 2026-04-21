import { createEntry, getCollection, updateEntry, updateSingle } from "../api/client";

type LocalConferencia = {
  orador: string;
  tema: string;
  cancion: number | string;
  cong: string;
  auxiliar: string;
  fecha: string;
};

type LocalReunion = {
  fecha: string;
  presidente: string;
  lector: string;
  oracion: string;
};

type LocalEscuela = {
  manager: string;
  assistant?: string;
  date: string;
  intervention_number: number;
  presentation_location: string;
};

type LocalMecanica = {
  date: string;
  accommodators: { dentro: string; lobby: string; reja: string };
  microphone: { micro1: string; micro2: string; plataforma: string };
  audioVideo: string;
  cleaning: string[];
};

type LocalTerritorio = {
  n: number;
  fechaAsignado: string;
  fechaCompletado: string;
  asignadoA: string;
};

type LocalPago = {
  miembro: string;
  monto: number;
  fecha: string;
};

type LocalGrupo = {
  nombre: string;
  miembros: string[];
};

const getLocal = <T>(key: string): T[] => {
  const raw = localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T[]) : [];
};

export const migrateLocalStorageToApi = async () => {
  if (localStorage.getItem("migration_done") === "true") {
    return { ok: false, message: "La migración ya se ejecutó." };
  }

  const miembros = await getCollection<{ nombre: string }>("miembros", {
    "pagination[pageSize]": 1000,
  });
  const temas = await getCollection<{ titulo: string }>("temas", {
    "pagination[pageSize]": 1000,
  });
  const territorios = await getCollection<{ numero: number }>("territorios", {
    "pagination[pageSize]": 1000,
  });

  const miembrosByName = new Map(miembros.map((m) => [m.nombre, m.id]));
  const temasByTitulo = new Map(temas.map((t) => [t.titulo, t.id]));
  const territoriosByNumero = new Map(territorios.map((t) => [t.numero, t.id]));

  const gruposLocal = getLocal<LocalGrupo>("grupos");
  if (gruposLocal.length) {
    const gruposApi = await getCollection<{ nombre: string }>("grupos", {
      "pagination[pageSize]": 1000,
    });
    const gruposByName = new Map(gruposApi.map((g) => [g.nombre, g.id]));

    for (const grupo of gruposLocal) {
      let grupoId = gruposByName.get(grupo.nombre);
      if (!grupoId) {
        const created = await createEntry("grupos", {
          nombre: grupo.nombre,
        });
        grupoId = created.id;
        gruposByName.set(grupo.nombre, grupoId);
      }

      const memberIds: number[] = [];
      for (const name of grupo.miembros) {
        let miembroId = miembrosByName.get(name);
        if (!miembroId) {
          const created = await createEntry("miembros", {
            nombre: name,
            roles: [],
            grupos: [grupoId],
          });
          miembroId = created.id;
          miembrosByName.set(name, miembroId);
        }
        memberIds.push(miembroId);
      }

      await updateEntry("grupos", grupoId, {
        miembros: memberIds,
      });
    }
  }

  const totalAPagarRaw = localStorage.getItem("totalAPagar");
  if (totalAPagarRaw) {
    await updateSingle("transporte-config", {
      totalAPagar: Number(totalAPagarRaw),
    });
  }

  const conferencias = getLocal<LocalConferencia>("conferencias");
  for (const c of conferencias) {
    await createEntry("conferencias", {
      orador: c.orador,
      tema: temasByTitulo.get(c.tema) ?? null,
      cancion: Number(c.cancion),
      cong: c.cong,
      auxiliar: miembrosByName.get(c.auxiliar) ?? null,
      fecha: c.fecha,
    });
  }

  const reuniones = getLocal<LocalReunion>("reuniones");
  for (const r of reuniones) {
    await createEntry("reunions", {
      fecha: r.fecha,
      presidente: miembrosByName.get(r.presidente) ?? null,
      lector: miembrosByName.get(r.lector) ?? null,
      oracion: miembrosByName.get(r.oracion) ?? null,
    });
  }

  const escuela = getLocal<LocalEscuela>("meetingAssignments");
  for (const a of escuela) {
    await createEntry("escuela-asignacions", {
      encargado: miembrosByName.get(a.manager) ?? null,
      ayudante: a.intervention_number === 3
        ? null
        : miembrosByName.get(a.assistant ?? "") ?? null,
      fecha: a.date,
      interventionNumber: a.intervention_number,
      presentationLocation: a.presentation_location,
    });
  }

  const mecanicas = getLocal<LocalMecanica>("scheduleData");
  for (const m of mecanicas) {
    await createEntry("mecanica-asignacions", {
      fecha: m.date,
      acomodadorDentro: miembrosByName.get(m.accommodators.dentro) ?? null,
      acomodadorLobby: miembrosByName.get(m.accommodators.lobby) ?? null,
      acomodadorReja: miembrosByName.get(m.accommodators.reja) ?? null,
      micro1: miembrosByName.get(m.microphone.micro1) ?? null,
      micro2: miembrosByName.get(m.microphone.micro2) ?? null,
      plataforma: miembrosByName.get(m.microphone.plataforma) ?? null,
      audioVideo: miembrosByName.get(m.audioVideo) ?? null,
      limpieza: m.cleaning,
    });
  }

  const territoriosData = getLocal<LocalTerritorio>("territorioData");
  for (const t of territoriosData) {
    await createEntry("territorio-asignacions", {
      territorio: territoriosByNumero.get(t.n) ?? null,
      asignadoA: miembrosByName.get(t.asignadoA) ?? null,
      fechaAsignado: t.fechaAsignado || null,
      fechaCompletado: t.fechaCompletado || null,
    });
  }

  const pagos = getLocal<LocalPago>("pagos");
  for (const p of pagos) {
    await createEntry("pagos", {
      miembro: miembrosByName.get(p.miembro) ?? null,
      monto: p.monto,
      fecha: p.fecha,
    });
  }

  const presidenciaRaw = localStorage.getItem("meeting_instructions_form");
  if (presidenciaRaw) {
    const p = JSON.parse(presidenciaRaw);
    await updateSingle("presidencia", {
      presidente: miembrosByName.get(p.president) ?? null,
      fecha: p.date ?? null,
      discursoTema: temasByTitulo.get(p.discourseTopic) ?? null,
      numeroCancion: p.songNumber ?? null,
      preguntasOpcionales: p.optionalQuestions ?? "",
      orador: p.speaker ?? "",
      congregacion: p.congregation ?? "",
      proximoTema: temasByTitulo.get(p.nextWeekTitle) ?? null,
      conductorAtalaya: miembrosByName.get(p.watchtowerConductor) ?? null,
    });
  }

  localStorage.setItem("migration_done", "true");
  return { ok: true };
};
