import React from "react";
import { Calendar, Card, Empty, Flex, List, Space, Tag, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { categoryMeta } from "../constants";
import type {
  AssignmentItem,
  GroupedAssignmentItems,
  GroupedPersonalAppointments,
  PersonalAppointment,
  ProfileMember,
} from "../types";
import { getDateKey, monthTitle } from "../utils";

type AssignmentsBoardProps = {
  currentMember: ProfileMember;
  isSmallScreen: boolean;
  panelMonth: string;
  monthItems: AssignmentItem[];
  monthAppointments: PersonalAppointment[];
  selectedDateItems: AssignmentItem[];
  selectedDateAppointments: PersonalAppointment[];
  groupedMonthItems: GroupedAssignmentItems[];
  groupedMonthAppointments: GroupedPersonalAppointments[];
  selectedDateValue: Dayjs;
  onSelectDate: (nextDateKey: string) => void;
  onPanelChange: (nextDateKey: string) => void;
};

const renderStatusTag = (status?: AssignmentItem["status"]) => {
  if (!status) return null;
  if (status === "pendiente") {
    return <Tag color="volcano">Pendiente</Tag>;
  }
  if (status === "completada") {
    return <Tag color="green">Completada</Tag>;
  }
  return <Tag color="blue">Programada</Tag>;
};

export const AssignmentsBoard: React.FC<AssignmentsBoardProps> = ({
  currentMember,
  isSmallScreen,
  panelMonth,
  monthItems,
  monthAppointments,
  selectedDateItems,
  selectedDateAppointments,
  groupedMonthItems,
  groupedMonthAppointments,
  selectedDateValue,
  onSelectDate,
  onPanelChange,
}) => {
  const cellRender = (value: Dayjs) => {
    const dateKey = getDateKey(value);
    const dayItems = monthItems.filter((item) => item.date === dateKey);
    const dayAppointments = monthAppointments.filter(
      (appointment) => appointment.date === dateKey
    );

    if (!dayItems.length && !dayAppointments.length) return null;

    const assignmentPreview = dayItems
      .slice(0, dayAppointments.length ? 1 : 2)
      .map((item) => ({
        key: item.id,
        color: categoryMeta[item.category].color,
        text: item.label,
      }));

    const appointmentPreview = dayAppointments
      .slice(0, dayItems.length ? 1 : 2)
      .map((appointment) => ({
        key: appointment.id,
        color: "magenta",
        text: appointment.title,
      }));

    const previewItems = [...assignmentPreview, ...appointmentPreview].slice(0, 2);
    const hiddenCount =
      dayItems.length + dayAppointments.length - previewItems.length;

    return (
      <div style={{ paddingTop: 6 }}>
        <Space direction="vertical" size={4} style={{ width: "100%" }}>
          {previewItems.map((item) => (
            <Tag
              key={item.key}
              color={item.color}
              style={{
                width: "100%",
                marginInlineEnd: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {item.text}
            </Tag>
          ))}
          {hiddenCount > 0 && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              +{hiddenCount} más
            </Typography.Text>
          )}
        </Space>
      </div>
    );
  };

  return (
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
          onSelect={(value) => onSelectDate(getDateKey(value))}
          onPanelChange={(value) => {
            const nextDate = getDateKey(value);
            onPanelChange(nextDate);
            onSelectDate(nextDate);
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
                        {renderStatusTag(item.status)}
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
              Citas personales
            </Typography.Title>
            {selectedDateAppointments.length ? (
              <List
                itemLayout="vertical"
                dataSource={selectedDateAppointments}
                renderItem={(appointment) => (
                  <List.Item key={appointment.id}>
                    <Space direction="vertical" size={6} style={{ width: "100%" }}>
                      <Tag color="magenta">Cita personal</Tag>
                      <Typography.Text strong>{appointment.title}</Typography.Text>
                      <Typography.Text type="secondary">
                        {appointment.description}
                      </Typography.Text>
                    </Space>
                  </List.Item>
                )}
              />
            ) : (
              <Empty
                description="No tienes citas personales para esta fecha."
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

          <Card bordered={false}>
            <Typography.Title level={4} style={{ marginTop: 0 }}>
              Agenda personal del mes
            </Typography.Title>
            {groupedMonthAppointments.length ? (
              <List
                dataSource={groupedMonthAppointments}
                renderItem={(group) => (
                  <List.Item key={group.date}>
                    <Space direction="vertical" size={8} style={{ width: "100%" }}>
                      <Typography.Text strong>
                        {dayjs(group.date).locale("es").format("ddd, D MMM YYYY")}
                      </Typography.Text>
                      <Space wrap>
                        {group.items.map((appointment) => (
                          <Tag
                            key={appointment.id}
                            color="magenta"
                            style={{ marginInlineEnd: 0 }}
                          >
                            {appointment.title}
                          </Tag>
                        ))}
                      </Space>
                    </Space>
                  </List.Item>
                )}
              />
            ) : (
              <Empty
                description="No has agendado citas personales este mes."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </Space>
      </div>
    </Flex>
  );
};
