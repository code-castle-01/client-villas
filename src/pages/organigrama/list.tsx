import type { FC } from "react";
import { Typography } from "antd";
import { OrganigramaDashboard } from "../../components/organigrama/OrganigramaDashboard";
import "./styles.css";

export const OrganigramaPage: FC = () => (
  <section className="organigrama-page">
    <div className="organigrama-page__header">
      <Typography.Title level={3} className="organigrama-page__title">
        Organigrama
      </Typography.Title>
      <Typography.Text className="organigrama-page__subtitle">
        Estructura de servicio, encargos y grupos de la congregación.
      </Typography.Text>
    </div>

    <OrganigramaDashboard />
  </section>
);
