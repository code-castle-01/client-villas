import React from "react";
import { Button, Card, NoticeBar, Space } from "antd-mobile";
import type { AppResource } from "../../app/resources";

type MobileRouteUnavailableProps = {
  activeResource?: AppResource;
  onSwitchToDesktop: () => void;
};

export const MobileRouteUnavailable: React.FC<MobileRouteUnavailableProps> = ({
  activeResource,
  onSwitchToDesktop,
}) => {
  const label = activeResource?.meta.label ?? "esta vista";

  return (
    <div className="mobile-route-unavailable">
      <NoticeBar content={`La vista móvil para ${label} llegará en una siguiente fase.`} />
      <Card title="Usar vista de escritorio">
        <Space direction="vertical" block>
          <div className="mobile-route-unavailable__copy">
            Esta sección todavía depende de componentes avanzados de escritorio.
            Puedes seguir usando la app en tu celular cambiando temporalmente a la
            vista desktop.
          </div>
          <Button color="primary" block onClick={onSwitchToDesktop}>
            Cambiar a vista desktop
          </Button>
        </Space>
      </Card>
    </div>
  );
};
