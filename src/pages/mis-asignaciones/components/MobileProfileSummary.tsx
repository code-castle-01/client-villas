import React from "react";
import { Button, Card, NoticeBar, Space, Tag } from "antd-mobile";
import type { ProfileMember, ProfileResponse } from "../types";
import { getProfileDisplayName } from "../utils";

type MobileProfileSummaryProps = {
  profile: ProfileResponse | null;
  currentMember: ProfileMember;
  assignmentCount: number;
  currentWeekLink: string;
  onInform: () => void;
  onSchedule: () => void;
  onEdit: () => void;
};

export const MobileProfileSummary: React.FC<MobileProfileSummaryProps> = ({
  profile,
  currentMember,
  assignmentCount,
  currentWeekLink,
  onInform,
  onSchedule,
  onEdit,
}) => {
  const member = profile?.member ?? currentMember;
  const profileDisplayName = getProfileDisplayName(profile);
  const profileInitial = profileDisplayName.charAt(0).toUpperCase() || "U";

  return (
    <div className="mobile-assignments-stack">
      {!currentMember && (
        <NoticeBar content="Tu usuario todavía no tiene un miembro vinculado. Completa tu perfil para ver tus asignaciones." />
      )}

      <Card className="mobile-screen-card" title="Mi perfil">
        <Space direction="vertical" block style={{ width: "100%" }}>
          <div className="mobile-profile-summary__identity">
            <div
              className="mobile-profile-summary__avatar"
              style={{
                background:
                  "linear-gradient(160deg, var(--app-color-primary), var(--app-color-primary-accent))",
              }}
            >
              {profileInitial}
            </div>
            <div className="mobile-profile-summary__identity-copy">
              <div className="mobile-profile-summary__name">{profileDisplayName}</div>
              <div className="mobile-profile-summary__email">
                {profile?.user?.email || "Sin correo"}
              </div>
            </div>
          </div>

          <div className="mobile-profile-summary__tags">
            <Tag className="mobile-profile-summary__tag" color="primary" fill="outline">
              Usuario: {profile?.user?.username || "Sin usuario"}
            </Tag>
            <Tag
              className="mobile-profile-summary__tag"
              color={currentMember ? "success" : "warning"}
              fill="outline"
            >
              {currentMember ? `Miembro: ${currentMember.nombre}` : "Sin miembro"}
            </Tag>
            <Tag className="mobile-profile-summary__tag" color="primary" fill="outline">
              {assignmentCount} asignaciones
            </Tag>
          </div>

          <div className="mobile-profile-summary__details">
            <div>Celular: {member?.celular || "No registrado"}</div>
            <div>Grupo: {member?.grupos?.[0]?.nombre || "Sin grupo"}</div>
            <div>
              Nombramientos:{" "}
              {member?.nombramientos?.length
                ? member.nombramientos.map((item) => item.replace(/_/g, " ")).join(", ")
                : "Sin nombramientos"}
            </div>
          </div>

          <div className="mobile-profile-summary__actions">
            <Button
              block
              color="primary"
              fill="outline"
              disabled={!currentMember}
              onClick={onInform}
            >
              INFORMAR
            </Button>
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
          </div>
        </Space>
      </Card>
    </div>
  );
};
