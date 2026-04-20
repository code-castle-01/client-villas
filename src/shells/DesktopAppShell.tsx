import React from "react";
import { Typography } from "antd";
import { ThemedLayout, ThemedSider } from "@refinedev/antd";
import { Outlet } from "react-router";
import { Header } from "../components/header";

export const DesktopAppShell: React.FC = () => {
  return (
    <ThemedLayout
      Header={Header}
      Sider={(props) => (
        <ThemedSider
          {...props}
          fixed
          Title={() => (
            <Typography.Title type="success" level={4}>
              LAS VILLAS
            </Typography.Title>
          )}
        />
      )}
    >
      <Outlet />
    </ThemedLayout>
  );
};
