import React from "react";
import { Button, Card, Empty, Space, Tag } from "antd-mobile";
import dayjs, { type Dayjs } from "dayjs";
import { categoryMeta } from "../constants";
import type {
  AssignmentItem,
  GroupedAssignmentItems,
  GroupedPersonalAppointments,
  PersonalAppointment,
  ProfileMember,
} from "../types";
import { monthTitle } from "../utils";

type MobileAssignmentsBoardProps = {
  currentMember: ProfileMember;
  panelMonth: string;
  selectedDateValue: Dayjs;
  selectedDateItems: AssignmentItem[];
  selectedDateAppointments: PersonalAppointment[];
  groupedMonthItems: GroupedAssignmentItems[];
  groupedMonthAppointments: GroupedPersonalAppointments[];
  onSelectDate: (nextDateKey: string) => void;
  onPanelChange: (nextDateKey: string) => void;
};

const mobileTagColor = (category: AssignmentItem["category"]) => {
  switch (category) {
    case "conferencia":
      return "warning";
    case "escuela":
      return "primary";
    case "mecanica":
      return "success";
    case "pastoreo":
      return "danger";
    case "presidencia":
      return "success";
    case "reunion":
    default:
      return "primary";
  }
};

export const MobileAssignmentsBoard: React.FC<MobileAssignmentsBoardProps> = ({
  currentMember,
  panelMonth,
  selectedDateValue,
  selectedDateItems,
  selectedDateAppointments,
  groupedMonthItems,
  groupedMonthAppointments,
  onSelectDate,
  onPanelChange,
}) => {
  const moveMonth = (direction: -1 | 1) => {
    const nextMonth = dayjs(panelMonth).add(direction, "month").format("YYYY-MM-DD");
    onPanelChange(nextMonth);
    onSelectDate(nextMonth);
  };

  const monthDateOptions = Array.from(
    new Set([
      ...groupedMonthItems.map((group) => group.date),
      ...groupedMonthAppointments.map((group) => group.date),
    ])
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Card className="mobile-screen-card" title="Tu agenda del mes">
        <Space direction="vertical" block style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <Button size="small" onClick={() => moveMonth(-1)}>
              Mes anterior
            </Button>
            <strong>{monthTitle(panelMonth)}</strong>
            <Button size="small" onClick={() => moveMonth(1)}>
              Siguiente
            </Button>
          </div>

          {monthDateOptions.length ? (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {monthDateOptions.map((date) => {
                const selected = date === selectedDateValue.format("YYYY-MM-DD");
                return (
                  <Button
                    key={date}
                    size="mini"
                    color={selected ? "primary" : "default"}
                    onClick={() => onSelectDate(date)}
                  >
                    {dayjs(date).locale("es").format("D MMM")}
                  </Button>
                );
              })}
            </div>
          ) : (
            <Empty description="No hay asignaciones este mes." />
          )}
        </Space>
      </Card>

      <Card
        className="mobile-screen-card"
        title={selectedDateValue.locale("es").format("D [de] MMMM [de] YYYY")}
      >
        {selectedDateItems.length ? (
          <Space direction="vertical" block style={{ width: "100%" }}>
            {selectedDateItems.map((item) => (
              <div key={item.id} className="mobile-assignment-item">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong>{item.title}</strong>
                  <Tag color={mobileTagColor(item.category)} fill="outline">
                    {categoryMeta[item.category].label}
                  </Tag>
                </div>
                <div style={{ color: "var(--app-muted)", fontSize: 14 }}>
                  {item.details.join(" • ")}
                </div>
              </div>
            ))}
          </Space>
        ) : (
          <Empty description="No tienes asignaciones para esta fecha." />
        )}
      </Card>

      <Card className="mobile-screen-card" title="Citas personales">
        {selectedDateAppointments.length ? (
          <Space direction="vertical" block style={{ width: "100%" }}>
            {selectedDateAppointments.map((appointment) => (
              <div key={appointment.id} className="mobile-assignment-item">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong>{appointment.title}</strong>
                  <Tag color="danger" fill="outline">
                    Cita personal
                  </Tag>
                </div>
                <div style={{ color: "var(--app-muted)", fontSize: 14 }}>
                  {appointment.description}
                </div>
              </div>
            ))}
          </Space>
        ) : (
          <Empty description="No tienes citas personales para esta fecha." />
        )}
      </Card>

      <Card className="mobile-screen-card" title="Resumen del mes">
        {groupedMonthItems.length ? (
          <Space direction="vertical" block style={{ width: "100%" }}>
            {groupedMonthItems.map((group) => (
              <div key={group.date} className="mobile-assignment-summary">
                <strong>{dayjs(group.date).locale("es").format("ddd, D MMM YYYY")}</strong>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {group.items.map((item) => (
                    <Tag
                      key={item.id}
                      color={mobileTagColor(item.category)}
                      fill="outline"
                    >
                      {item.title}
                    </Tag>
                  ))}
                </div>
              </div>
            ))}
          </Space>
        ) : (
          <Empty description="No hay asignaciones disponibles." />
        )}
      </Card>

      <Card className="mobile-screen-card" title="Agenda personal del mes">
        {groupedMonthAppointments.length ? (
          <Space direction="vertical" block style={{ width: "100%" }}>
            {groupedMonthAppointments.map((group) => (
              <div key={group.date} className="mobile-assignment-summary">
                <strong>{dayjs(group.date).locale("es").format("ddd, D MMM YYYY")}</strong>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {group.items.map((appointment) => (
                    <Tag
                      key={appointment.id}
                      color="danger"
                      fill="outline"
                    >
                      {appointment.title}
                    </Tag>
                  ))}
                </div>
              </div>
            ))}
          </Space>
        ) : (
          <Empty description="No has agendado citas personales este mes." />
        )}
      </Card>
    </div>
  );
};
