import type { FC, ReactNode } from "react";
import { Card, Col, Row } from "antd";
import {
  Button as MobileButton,
  Card as MobileCard,
  NoticeBar,
  Tag,
} from "antd-mobile";
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
  statusLabel: string;
  summary: string;
  title: string;
};

const getStatusLabel = (resource: AppResource) => {
  if (resource.meta.mobileStatus === "ready") {
    return "Listo en móvil";
  }

  if (resource.meta.mobileStatus === "desktop-only") {
    return "Solo desktop";
  }

  return "Abre en desktop";
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
      statusLabel: getStatusLabel(resource),
      summary: resource.meta.summary ?? "Acceso rápido a esta sección.",
    }));

  const mobileReadyItems = dashboardItems.filter((item) => item.mobileReady);
  const desktopFallbackItems = dashboardItems.filter((item) => !item.mobileReady);

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
              <h2 className="dashboard-mobile__title">Una portada más clara para celular</h2>
              <p className="dashboard-mobile__subtitle">
                Mostramos solo los módulos que este usuario puede abrir y separamos
                lo que ya está listo para móvil de lo que todavía necesita vista
                desktop.
              </p>
            </div>

            <div className="dashboard-mobile__stats">
              <div className="dashboard-mobile__stat">
                <strong>{mobileReadyItems.length}</strong>
                <span>listos en móvil</span>
              </div>
              <div className="dashboard-mobile__stat">
                <strong>{desktopFallbackItems.length}</strong>
                <span>abren en desktop</span>
              </div>
            </div>

            <NoticeBar
              content={
                desktopFallbackItems.length > 0
                  ? "Usa las secciones móviles para trabajo diario y cambia a desktop solo cuando una pantalla aún lo necesite."
                  : "Todas tus secciones disponibles ya están listas para móvil."
              }
            />
          </div>
        </MobileCard>

        {mobileReadyItems.length > 0 && (
          <section className="dashboard-mobile__section">
            <div className="dashboard-mobile__section-header">
              <div>
                <h3 className="dashboard-mobile__section-title">Listo para celular</h3>
                <p className="dashboard-mobile__section-copy">
                  Entradas optimizadas para abrir y trabajar sin zoom ni desbordes.
                </p>
              </div>
            </div>

            <div className="dashboard-mobile__grid">
              {mobileReadyItems.map((item) => (
                <MobileCard
                  key={item.route}
                  className="mobile-screen-card dashboard-mobile__card"
                >
                  <div className="dashboard-mobile__card-body">
                    <div className="dashboard-mobile__card-icon dashboard-mobile__card-icon--ready">
                      {item.icon}
                    </div>

                    <div className="dashboard-mobile__card-copy">
                      <div className="dashboard-mobile__card-title">{item.title}</div>
                      <div className="dashboard-mobile__card-summary">{item.summary}</div>
                    </div>

                    <Tag color="primary" fill="outline">
                      {item.statusLabel}
                    </Tag>

                    <MobileButton
                      block
                      color="primary"
                      onClick={() => handleOpen(item.route, item.mobileReady)}
                    >
                      Abrir ahora
                    </MobileButton>
                  </div>
                </MobileCard>
              ))}
            </div>
          </section>
        )}

        {desktopFallbackItems.length > 0 && (
          <section className="dashboard-mobile__section">
            <div className="dashboard-mobile__section-header">
              <div>
                <h3 className="dashboard-mobile__section-title">Disponible en desktop</h3>
                <p className="dashboard-mobile__section-copy">
                  Siguen visibles para este usuario, pero por ahora cambian a la
                  experiencia de escritorio.
                </p>
              </div>
            </div>

            <div className="dashboard-mobile__grid">
              {desktopFallbackItems.map((item) => (
                <MobileCard
                  key={item.route}
                  className="mobile-screen-card dashboard-mobile__card"
                >
                  <div className="dashboard-mobile__card-body">
                    <div className="dashboard-mobile__card-icon dashboard-mobile__card-icon--desktop">
                      {item.icon}
                    </div>

                    <div className="dashboard-mobile__card-copy">
                      <div className="dashboard-mobile__card-title">{item.title}</div>
                      <div className="dashboard-mobile__card-summary">{item.summary}</div>
                    </div>

                    <Tag color="default" fill="outline">
                      {item.statusLabel}
                    </Tag>

                    <MobileButton
                      block
                      fill="outline"
                      onClick={() => handleOpen(item.route, item.mobileReady)}
                    >
                      Abrir en desktop
                    </MobileButton>
                  </div>
                </MobileCard>
              ))}
            </div>
          </section>
        )}
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
              <p className="dashboard-desktop__status">{item.statusLabel}</p>
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
