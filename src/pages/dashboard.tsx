import { Button, Card, Col, Row } from "antd";
import { Card as MobileCard, Grid, NoticeBar, Space, Tag } from "antd-mobile";
import { useNavigate } from "react-router";
import { useAdaptiveUI } from "../adaptive/useAdaptiveUI";
import { OrganigramaDashboard } from "../components/organigrama/OrganigramaDashboard";

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { resolvedMode, setOverrideMode } = useAdaptiveUI();

  const dashboardItems = [
    {
      title: "Mis Asignaciones",
      emoji: "🗓️",
      route: "/mis-asignaciones",
      mobileReady: true,
      summary: "Tu agenda y perfil personal",
    },
    {
      title: "Pastoreo",
      emoji: "🐑",
      route: "/pastoreo",
      mobileReady: false,
      summary: "Seguimiento pastoral y S-4",
    },
    {
      title: "Mecánicas",
      emoji: "🧰",
      route: "/mecanicas",
      mobileReady: true,
      summary: "Asignaciones operativas",
    },
    {
      title: "Escuela",
      emoji: "📑",
      route: "/escuela",
      mobileReady: false,
      summary: "Programa de la escuela",
    },
    {
      title: "Reuniones",
      emoji: "👔",
      route: "/reuniones",
      mobileReady: true,
      summary: "Lectores, oración y envío",
    },
    {
      title: "Presidencia",
      emoji: "📄",
      route: "/presidencia",
      mobileReady: false,
      summary: "Discursos y preguntas",
    },
    {
      title: "Territorios",
      emoji: "🗺️",
      route: "/territorio",
      mobileReady: true,
      summary: "Mapas y registro",
    },
    {
      title: "Transporte",
      emoji: "🚙",
      route: "/transporte",
      mobileReady: false,
      summary: "Traslados y grupos",
    },
    {
      title: "Conferencias",
      emoji: "🎤",
      route: "/conferencias",
      mobileReady: true,
      summary: "Agenda pública y oradores",
    },
  ];

  const handleOpen = (route: string, mobileReady: boolean) => {
    if (!mobileReady) {
      setOverrideMode("desktop");
    }

    navigate(route);
  };

  if (resolvedMode === "mobile") {
    return (
      <div style={{ display: "grid", gap: 14 }}>
        <MobileCard className="mobile-screen-card">
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <h2 style={{ margin: 0, fontFamily: '"Space Grotesk", sans-serif' }}>
                Centro de la congregación
              </h2>
              <p style={{ margin: "6px 0 0", color: "var(--app-muted)" }}>
                Accede rápido a las vistas móviles listas y cambia a desktop cuando
                una sección todavía lo necesite.
              </p>
            </div>
            <NoticeBar content="Fase 1.5 activa: Inicio, Asignaciones, Conferencias, Reuniones, Mecánicas y Territorios." />
          </div>
        </MobileCard>

        <Grid columns={2} gap={12}>
          {dashboardItems.map((item) => (
            <Grid.Item key={item.title}>
              <MobileCard className="mobile-screen-card">
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ fontSize: 34 }}>{item.emoji}</div>
                  <div>
                    <div style={{ fontWeight: 800, marginBottom: 4 }}>{item.title}</div>
                    <div style={{ color: "var(--app-muted)", fontSize: 13 }}>
                      {item.summary}
                    </div>
                  </div>
                  <Space wrap>
                    <Tag color={item.mobileReady ? "primary" : "default"} fill="outline">
                      {item.mobileReady ? "Mobile" : "Desktop"}
                    </Tag>
                  </Space>
                  <Button
                    type={item.mobileReady ? "primary" : "default"}
                    onClick={() => handleOpen(item.route, item.mobileReady)}
                  >
                    {item.mobileReady ? "Abrir" : "Abrir en desktop"}
                  </Button>
                </div>
              </MobileCard>
            </Grid.Item>
          ))}
        </Grid>
      </div>
    );
  }

  return (
    <>
      <Row gutter={[16, 16]}>
        {dashboardItems.map((item) => (
          <Col key={item.title} xs={24} md={12} lg={6}>
            <Card
              title={item.title}
              style={{ borderRadius: "14px", cursor: "pointer" }}
              size="small"
              cover={
                <span style={{ fontSize: "6rem", textAlign: "center" }}>
                  {item.emoji}
                </span>
              }
              hoverable
              headStyle={{ textAlign: "center", fontSize: "2rem" }}
              onClick={() => navigate(item.route)}
            />
          </Col>
        ))}
      </Row>

      <div style={{ marginTop: 24 }}>
        <OrganigramaDashboard />
      </div>
    </>
  );
};
