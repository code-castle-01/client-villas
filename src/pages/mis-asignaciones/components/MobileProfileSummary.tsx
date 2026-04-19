import React from "react";
import { Button, Card, NoticeBar, Space, Tag } from "antd-mobile";
import type { ProfileMember, ProfileResponse } from "../types";
import { getProfileDisplayName } from "../utils";

type MobileProfileSummaryProps = {
  profile: ProfileResponse | null;
  currentMember: ProfileMember;
  assignmentCount: number;
  currentWeekLink: string;
  onSchedule: () => void;
  onEdit: () => void;
};

export const MobileProfileSummary: React.FC<MobileProfileSummaryProps> = ({
  profile,
  currentMember,
  assignmentCount,
  currentWeekLink,
  onSchedule,
  onEdit,
}) => {
  const member = profile?.member ?? currentMember;
  const profileDisplayName = getProfileDisplayName(profile);
  const profileInitial = profileDisplayName.charAt(0).toUpperCase() || "U";

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {!currentMember && (
        <NoticeBar content="Tu usuario todavía no tiene un miembro vinculado. Completa tu perfil para ver tus asignaciones." />
      )}

      <Card className="mobile-screen-card" title="Mi perfil">
        <Space direction="vertical" block style={{ width: "100%" }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                display: "grid",
                placeItems: "center",
                background:
                  "linear-gradient(160deg, var(--app-color-primary), var(--app-color-primary-accent))",
                color: "#fff",
                fontWeight: 800,
                fontSize: 22,
              }}
            >
              {profileInitial}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{profileDisplayName}</div>
              <div style={{ color: "var(--app-muted)", fontSize: 14 }}>
                {profile?.user?.email || "Sin correo"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Tag color="primary" fill="outline">
              Usuario: {profile?.user?.username || "Sin usuario"}
            </Tag>
            <Tag color={currentMember ? "success" : "warning"} fill="outline">
              {currentMember ? `Miembro: ${currentMember.nombre}` : "Sin miembro"}
            </Tag>
            <Tag color="primary" fill="outline">
              {assignmentCount} asignaciones
            </Tag>
          </div>

          <div style={{ display: "grid", gap: 8, color: "var(--app-muted)", fontSize: 14 }}>
            <div>Celular: {member?.celular || "No registrado"}</div>
            <div>Grupo: {member?.grupos?.[0]?.nombre || "Sin grupo"}</div>
            <div>
              Nombramientos:{" "}
              {member?.nombramientos?.length
                ? member.nombramientos.map((item) => item.replace(/_/g, " ")).join(", ")
                : "Sin nombramientos"}
            </div>
          </div>

          <Space direction="vertical" block style={{ width: "100%" }}>
            <Button block color="primary" fill="outline" onClick={onSchedule}>
              Agendar
            </Button>
            <Button block color="primary" onClick={onEdit}>
              Editar perfil
            </Button>
            <Button
              block
              onClick={() => {
                window.open(currentWeekLink, "_blank", "noopener,noreferrer");
              }}
            >
              Reunión de la semana
            </Button>
            <Button
              block
              onClick={() => {
                window.open("https://login.jw.org/username", "_blank", "noopener,noreferrer")
              }}
            >
              Usuario JW Login
            </Button>
          </Space>
        </Space>
      </Card>
    </div>
  );
};
