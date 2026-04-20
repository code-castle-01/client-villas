import type { FC, ReactNode } from "react";
import { Card, Col, Row } from "antd";
import { Button as MobileButton, Card as MobileCard } from "antd-mobile";
import { useNavigate } from "react-router";
import { useAdaptiveUI } from "../adaptive/useAdaptiveUI";
import type { AppResource } from "../app/resources";
import { OrganigramaDashboard } from "../components/organigrama/OrganigramaDashboard";

type DashboardPageProps = {
  resources: AppResource[];
};

type DashboardCardItem = {
  icon: ReactNode;
  mobileReady: boolean;
  route: string;
  summary: string;
  title: string;
};

export const DashboardPage: FC<DashboardPageProps> = ({ resources }) => {
  const navigate = useNavigate();
  const { resolvedMode, setOverrideMode } = useAdaptiveUI();

  const dashboardItems: DashboardCardItem[] = resources
    .filter((resource) => resource.list !== "/")
    .map((resource) => ({
      title: resource.meta.mobileLabel ?? resource.meta.label,
      icon: resource.meta.mobileIcon ?? resource.meta.icon,
      route: resource.list,
      mobileReady: resource.meta.mobileStatus === "ready",
      summary: resource.meta.summary ?? "Acceso rápido a esta sección.",
    }));

  const handleOpen = (route: string, mobileReady: boolean) => {
    if (!mobileReady) {
      setOverrideMode("desktop");
    }

    navigate(route);
  };

  if (resolvedMode === "mobile") {
    return (
      <div className="dashboard-mobile">
        <MobileCard className="mobile-screen-card dashboard-mobile__hero">
          <div className="dashboard-mobile__hero-body">
            <div className="dashboard-mobile__hero-copy">
              <span className="dashboard-mobile__eyebrow">Centro de la congregación</span>
              <h2 className="dashboard-mobile__title">Todo listo para usar desde tu celular</h2>
              <p className="dashboard-mobile__subtitle">
                Abre tus módulos desde una sola portada móvil, con navegación fija
                abajo y acceso rápido a cada escena.
              </p>
            </div>
          </div>
        </MobileCard>

        <div className="dashboard-mobile__grid">
          {dashboardItems.map((item) => (
            <MobileCard
              key={item.route}
              className="mobile-screen-card dashboard-mobile__card"
            >
              <div className="dashboard-mobile__card-body dashboard-mobile__card-body--centered">
                <div className="dashboard-mobile__card-icon dashboard-mobile__card-icon--ready">
                  {item.icon}
                </div>

                <div className="dashboard-mobile__card-copy dashboard-mobile__card-copy--centered">
                  <div className="dashboard-mobile__card-title">{item.title}</div>
                  <div className="dashboard-mobile__card-summary">{item.summary}</div>
                </div>

                <MobileButton
                  block
                  color="primary"
                  onClick={() => handleOpen(item.route, item.mobileReady)}
                >
                  Abrir
                </MobileButton>
              </div>
            </MobileCard>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <Row gutter={[16, 16]}>
        {dashboardItems.map((item) => (
          <Col key={item.route} xs={24} md={12} lg={6}>
            <Card
              title={item.title}
              style={{ borderRadius: "14px", cursor: "pointer" }}
              size="small"
              cover={
                <div className="dashboard-desktop__cover">
                  <span className="dashboard-desktop__cover-icon">{item.icon}</span>
                </div>
              }
              hoverable
              headStyle={{ textAlign: "center", fontSize: "2rem" }}
              onClick={() => handleOpen(item.route, item.mobileReady)}
            >
              <p className="dashboard-desktop__summary">{item.summary}</p>
            </Card>
          </Col>
        ))}
      </Row>

      <div style={{ marginTop: 24 }}>
        <OrganigramaDashboard />
      </div>
    </>
  );
};
