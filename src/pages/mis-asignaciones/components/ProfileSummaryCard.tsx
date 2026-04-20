import React from "react";
import {
  CalendarOutlined,
  EditOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Descriptions,
  Flex,
  Space,
  Tag,
  Typography,
} from "antd";
import type { ProfileMember, ProfileResponse } from "../types";
import { getProfileDisplayName } from "../utils";

type ProfileSummaryCardProps = {
  profile: ProfileResponse | null;
  currentMember: ProfileMember;
  assignmentCount: number;
  currentWeekLink: string;
  isSmallScreen: boolean;
  onInform: () => void;
  onSchedule: () => void;
  onEdit: () => void;
};

export const ProfileSummaryCard: React.FC<ProfileSummaryCardProps> = ({
  profile,
  currentMember,
  assignmentCount,
  currentWeekLink,
  isSmallScreen,
  onInform,
  onSchedule,
  onEdit,
}) => {
  const member = profile?.member ?? currentMember;
  const profileDisplayName = getProfileDisplayName(profile);
  const profileInitial = profileDisplayName.charAt(0).toUpperCase() || "U";

  return (
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
                <Badge count={assignmentCount} showZero color="#722ed1" />
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
            type="primary"
            ghost
            icon={<FileTextOutlined />}
            onClick={onInform}
            disabled={!currentMember}
          >
            INFORMAR
          </Button>
          <Button icon={<CalendarOutlined />} onClick={onSchedule}>
            Agendar
          </Button>
          <Button icon={<EditOutlined />} type="primary" onClick={onEdit}>
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
              children: member?.telefono || "No registrado",
            },
            {
              key: "celular",
              label: "Celular",
              children: member?.celular || "No registrado",
            },
            {
              key: "inmersion",
              label: "Fecha de Bautismo",
              children: member?.fechaInmersion || "No registrada",
            },
            {
              key: "genero",
              label: "Género",
              children:
                member?.genero === "hombre"
                  ? "Hombre"
                  : member?.genero === "mujer"
                  ? "Mujer"
                  : "No registrado",
            },
            {
              key: "grupo",
              label: "Grupo",
              children: member?.grupos?.[0]?.nombre || "Sin grupo",
            },
            {
              key: "nombramientos",
              label: "Nombramientos",
              children: member?.nombramientos?.length ? (
                <Space wrap size={[4, 4]}>
                  {member.nombramientos.map((nombramiento) => (
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
  );
};
