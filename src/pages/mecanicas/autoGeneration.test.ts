import dayjs from "dayjs";
import type { DirectoryMember } from "../../api/groupDirectory";
import {
  buildMecanicaAutoGenerationPlan,
  buildWeekdayDatesInRange,
  inferAutoGenerationWeekdays,
  resolveAutoGenerationMonthRange,
  type MechanicsAssignmentRecord,
} from "./autoGeneration";

const createMember = (
  id: number,
  nombre: string,
  overrides: Partial<DirectoryMember> = {},
): DirectoryMember => ({
  id,
  nombre,
  nombramientos: [],
  roles: ["varon"],
  grupos: [{ id: 1, nombre: "1" }],
  ...overrides,
});

const createAssignment = (
  dateValue: string,
  overrides: Partial<MechanicsAssignmentRecord> = {},
): MechanicsAssignmentRecord => ({
  key: dateValue,
  dateValue,
  accommodators: {},
  microphone: {},
  cleaning: [],
  hospitality: [],
  ...overrides,
});

describe("mecanicas auto generation", () => {
  it("builds all matching Tuesdays and Saturdays inside the selected range", () => {
    expect(
      buildWeekdayDatesInRange(
        dayjs("2026-05-01"),
        dayjs("2026-05-31"),
        [2, 6],
      ),
    ).toEqual([
      "2026-05-02",
      "2026-05-05",
      "2026-05-09",
      "2026-05-12",
      "2026-05-16",
      "2026-05-19",
      "2026-05-23",
      "2026-05-26",
      "2026-05-30",
    ]);
  });

  it("continues cleaning, hospitality and audio sequences while prioritizing brothers not used last month", () => {
    const members: DirectoryMember[] = [
      createMember(1, "Jorge Castillo"),
      createMember(2, "Pedro Luna"),
      createMember(3, "Henry Trejo"),
      createMember(4, "Barreto Joel"),
      createMember(5, "Edgar Hernandez"),
      createMember(6, "Alexander Perez"),
      createMember(7, "Harol Hernández"),
      createMember(8, "Maurisio Sabas"),
      createMember(9, "Daniel Pineda"),
      createMember(10, "Jairo Sierra"),
      createMember(11, "Loncio Murillo"),
      createMember(12, "Jeremías Graterol"),
      createMember(13, "José Rangel"),
      createMember(14, "Leon Jose"),
    ];

    const assignments: MechanicsAssignmentRecord[] = [
      createAssignment("2026-04-25", {
        accommodators: {
          dentroId: 1,
          lobbyId: 4,
          rejaId: 5,
        },
        microphone: {
          micro1Id: 6,
          micro2Id: 7,
          plataformaId: 8,
        },
        audioVideoId: 1,
        cleaning: ["6"],
        hospitality: ["3"],
      }),
      createAssignment("2026-04-28", {
        accommodators: {
          dentroId: 2,
          lobbyId: 3,
          rejaId: 4,
        },
        microphone: {
          micro1Id: 5,
          micro2Id: 6,
          plataformaId: 7,
        },
        audioVideoId: 2,
        cleaning: ["7"],
      }),
      createAssignment("2026-05-05", {
        key: "may-05",
        documentId: "doc-may-05",
      }),
    ];

    const plan = buildMecanicaAutoGenerationPlan({
      assignments,
      members,
      groupSequence: ["1", "2", "3", "4", "5", "6", "7", "8"],
      targetDates: ["2026-05-05", "2026-05-09"],
    });

    expect(plan.warnings).toEqual([]);
    expect(plan.skippedCount).toBe(0);
    expect(plan.operations).toHaveLength(2);

    const mayFiveOperation = plan.operations.find(
      (operation) => operation.dateValue === "2026-05-05",
    );
    const mayNineOperation = plan.operations.find(
      (operation) => operation.dateValue === "2026-05-09",
    );

    expect(mayFiveOperation).toMatchObject({
      mode: "update",
      targetId: "doc-may-05",
      payload: {
        fecha: "2026-05-05",
        limpieza: ["8"],
        hospitalidad: [],
        audioVideo: 3,
        audioVideoAuxiliar: null,
      },
    });

    expect(mayNineOperation).toMatchObject({
      mode: "create",
      payload: {
        fecha: "2026-05-09",
        limpieza: ["1"],
        hospitalidad: ["4"],
        audioVideo: 4,
        audioVideoAuxiliar: null,
      },
    });

    const mayFiveRoles = [
      mayFiveOperation?.payload.acomodadorDentro,
      mayFiveOperation?.payload.acomodadorLobby,
      mayFiveOperation?.payload.acomodadorReja,
      mayFiveOperation?.payload.micro1,
      mayFiveOperation?.payload.micro2,
      mayFiveOperation?.payload.plataforma,
    ];

    expect(new Set(mayFiveRoles)).toEqual(new Set([9, 10, 11, 12, 13, 14]));
  });

  it("reuses weekdays from the previous month and resolves the active month range", () => {
    const assignments: MechanicsAssignmentRecord[] = [
      createAssignment("2026-04-07"),
      createAssignment("2026-04-11"),
      createAssignment("2026-04-14"),
    ];

    const monthRange = resolveAutoGenerationMonthRange(
      assignments,
      "4",
      dayjs("2026-04-19"),
    );

    expect(monthRange.start.format("YYYY-MM-DD")).toBe("2026-05-01");
    expect(monthRange.end.format("YYYY-MM-DD")).toBe("2026-05-31");
    expect(inferAutoGenerationWeekdays(assignments, monthRange.start)).toEqual([2, 6]);
  });
});
