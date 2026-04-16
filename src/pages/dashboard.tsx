import { Card, Col, Row } from "antd";
import { useNavigate } from "react-router";
import { OrganigramaDashboard } from "../components/organigrama/OrganigramaDashboard";

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const dashboardItems = [
    { title: "Mis Asignaciones", emoji: "🗓️", route: "/mis-asignaciones" },
    { title: "Pastoreo", emoji: "🐑", route: "/pastoreo" },
    { title: "Mecánicas", emoji: "🧰", route: "/mecanicas" },
    { title: "Escuela", emoji: "📑", route: "/escuela" },
    { title: "Reuniones", emoji: "👔", route: "/reuniones" },
    { title: "Presidencia", emoji: "📄", route: "/presidencia" },
    { title: "Territorios", emoji: "🗺️", route: "/territorio" },
    { title: "Transporte", emoji: "🚙", route: "/transporte" },
  ];

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
