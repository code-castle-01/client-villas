import React, { useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import {
  Badge,
  Button,
  NoticeBar,
  Popup,
  SafeArea,
  Selector,
  Space,
  TabBar,
  Toast,
  NavBar,
} from "antd-mobile";
import { BulbOutlined, DownloadOutlined, LaptopOutlined } from "@ant-design/icons";
import {
  type AppResource,
  getActiveResource,
  getMobileTabResources,
} from "../app/resources";
import { MobileRouteUnavailable } from "../components/mobile/MobileRouteUnavailable";
import { useAdaptiveUI } from "../adaptive/useAdaptiveUI";
import { usePwaInstallPrompt } from "../pwa/usePwaInstallPrompt";
import { usePwaLifecycle } from "../pwa/usePwaLifecycle";
import { ColorModeContext } from "../contexts/color-mode";

type MobileAppShellProps = {
  resources: AppResource[];
  children?: React.ReactNode;
};

export const MobileAppShell: React.FC<MobileAppShellProps> = ({
  resources,
  children,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { mode, toggleMode } = React.useContext(ColorModeContext);
  const { overrideMode, setOverrideMode } = useAdaptiveUI();
  const { canInstall, promptInstall } = usePwaInstallPrompt();
  const { applyUpdate, isOfflineReady, isUpdateReady, resetUpdateReady } =
    usePwaLifecycle();

  const activeResource = useMemo(
    () => getActiveResource(location.pathname, resources),
    [location.pathname, resources],
  );
  const tabResources = useMemo(() => getMobileTabResources(resources), [resources]);
  const isMobileReadyRoute =
    location.pathname === "/login" ||
    location.pathname === "/migracion" ||
    activeResource?.meta.mobileStatus === "ready";

  const handleInstall = async () => {
    const installed = await promptInstall();
    if (installed) {
      Toast.show({
        content: "La app quedó lista para instalarse desde tu dispositivo.",
      });
    }
  };

  const handleApplyUpdate = () => {
    applyUpdate?.();
    resetUpdateReady();
  };

  return (
    <div className="mobile-app-shell">
      <SafeArea position="top" />
      <NavBar
        className="mobile-app-shell__navbar"
        backArrow={false}
        right={
          <Button
            size="small"
            fill="none"
            className="mobile-app-shell__settings-trigger"
            onClick={() => setSettingsOpen(true)}
          >
            Ajustes
          </Button>
        }
      >
        {activeResource?.meta.mobileLabel ?? activeResource?.meta.label ?? "Congregación"}
      </NavBar>

      <div className="mobile-app-shell__content">
        {isUpdateReady && (
          <NoticeBar
            content="Hay una nueva versión lista para instalarse."
            extra={<Button size="mini" onClick={handleApplyUpdate}>Actualizar</Button>}
          />
        )}
        {!isUpdateReady && isOfflineReady && (
          <NoticeBar content="La app ya puede usarse sin conexión básica." />
        )}

        {isMobileReadyRoute ? (
          children ?? <Outlet />
        ) : (
          <MobileRouteUnavailable
            activeResource={activeResource}
            onSwitchToDesktop={() => setOverrideMode("desktop")}
          />
        )}
      </div>

      {tabResources.length > 0 && location.pathname !== "/login" && (
        <>
          <TabBar
            className="mobile-app-shell__tabbar"
            safeArea={false}
            activeKey={location.pathname}
          >
            {tabResources.map((resource) => (
              <TabBar.Item
                key={resource.list}
                title={resource.meta.mobileLabel ?? resource.meta.label}
                icon={resource.meta.mobileIcon ?? resource.meta.icon}
                onClick={() => navigate(resource.list)}
              />
            ))}
          </TabBar>
          <SafeArea position="bottom" />
        </>
      )}

      <Popup
        visible={settingsOpen}
        onMaskClick={() => setSettingsOpen(false)}
        bodyStyle={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
      >
        <div className="mobile-app-shell__settings">
          <h3>Experiencia de la app</h3>
          <Space direction="vertical" block>
            <div className="mobile-app-shell__setting-group">
              <div className="mobile-app-shell__setting-label">
                <LaptopOutlined /> Vista activa
              </div>
              <Selector
                columns={3}
                value={[overrideMode]}
                options={[
                  { label: "Auto", value: "auto" },
                  { label: "Mobile", value: "mobile" },
                  { label: "Desktop", value: "desktop" },
                ]}
                onChange={(value) => setOverrideMode((value[0] ?? "auto") as any)}
              />
            </div>

            <div className="mobile-app-shell__setting-row">
              <span className="mobile-app-shell__setting-label">
                <BulbOutlined /> Tema
              </span>
              <Button size="small" onClick={toggleMode}>
                {mode === "dark" ? "Modo claro" : "Modo oscuro"}
              </Button>
            </div>

            {canInstall && (
              <div className="mobile-app-shell__setting-row">
                <span className="mobile-app-shell__setting-label">
                  <DownloadOutlined /> Instalar PWA
                </span>
                <Button color="primary" size="small" onClick={handleInstall}>
                  Instalar
                </Button>
              </div>
            )}

            {activeResource?.meta.mobileStatus !== "ready" && (
              <NoticeBar content="Esta sección todavía usa la experiencia de escritorio." />
            )}

            <div className="mobile-app-shell__setting-hint">
              <Badge color="var(--app-color-primary)" />
              Usa “Desktop” si una pantalla administrativa necesita más espacio.
            </div>
          </Space>
        </div>
      </Popup>
    </div>
  );
};
