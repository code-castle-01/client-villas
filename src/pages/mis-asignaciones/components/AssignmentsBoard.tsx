import React from "react";
import { Calendar, Card, Empty, Flex, List, Space, Tag, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { categoryMeta } from "../constants";
import type {
  AssignmentItem,
  GroupedAssignmentItems,
  ProfileMember,
} from "../types";
import { getDateKey, monthTitle } from "../utils";

type AssignmentsBoardProps = {
  currentMember: ProfileMember;
  isSmallScreen: boolean;
  panelMonth: string;
  monthItems: AssignmentItem[];
  selectedDateItems: AssignmentItem[];
  groupedMonthItems: GroupedAssignmentItems[];
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
  selectedDateItems,
  groupedMonthItems,
  selectedDateValue,
  onSelectDate,
  onPanelChange,
}) => {
  if (!currentMember) {
    return (
      <Card bordered={false}>
        <Empty
          description="Cuando completes tu perfil, aquí aparecerán tus asignaciones."
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  const cellRender = (value: Dayjs) => {
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
  );
};
