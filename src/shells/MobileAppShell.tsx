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
} from "antd-mobile";
import {
  BulbOutlined,
  CloseOutlined,
  DownloadOutlined,
  LaptopOutlined,
  SettingOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import {
  type AppResource,
  getActiveResource,
  getMobileTabResources,
} from "../app/resources";
import { MobileRouteUnavailable } from "../components/mobile/MobileRouteUnavailable";
import { useAdaptiveUI } from "../adaptive/useAdaptiveUI";
import { appName } from "../config/env";
import { usePwaInstallPrompt } from "../pwa/usePwaInstallPrompt";
import { usePwaLifecycle } from "../pwa/usePwaLifecycle";
import { ColorModeContext } from "../contexts/color-mode";

type MobileAppShellProps = {
  resources: AppResource[];
  children?: React.ReactNode;
};

type HeaderActionButtonProps = {
  "aria-label": string;
  children: React.ReactNode;
  onClick: () => void;
};

const HeaderActionButton: React.FC<HeaderActionButtonProps> = ({
  children,
  onClick,
  ...props
}) => (
  <button
    type="button"
    className="mobile-app-shell__action-button"
    onClick={onClick}
    {...props}
  >
    {children}
  </button>
);

export const MobileAppShell: React.FC<MobileAppShellProps> = ({
  resources,
  children,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [installBannerDismissed, setInstallBannerDismissed] = useState(false);
  const { mode, toggleMode } = React.useContext(ColorModeContext);
  const { isStandalone, overrideMode, setOverrideMode } = useAdaptiveUI();
  const { canInstall, manualInstallPlatform, promptInstall } = usePwaInstallPrompt();
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
  const showInstallBanner =
    location.pathname !== "/login" &&
    location.pathname !== "/migracion" &&
    !isStandalone &&
    !installBannerDismissed &&
    Boolean(canInstall || manualInstallPlatform);
  const title =
    activeResource?.meta.mobileLabel ?? activeResource?.meta.label ?? "Congregación";
  const subtitle = appName || "Las Villas";

  const handleInstall = async () => {
    const installed = await promptInstall();
    if (installed) {
      setInstallBannerDismissed(true);
      Toast.show({
        content: "La app quedó lista para abrirse desde tu pantalla de inicio.",
      });
    }
  };

  const handleApplyUpdate = () => {
    applyUpdate?.();
    resetUpdateReady();
  };

  const renderInstallBanner = () => {
    if (!showInstallBanner) {
      return null;
    }

    const description = canInstall
      ? "Instala esta app para abrirla más rápido, usarla a pantalla completa y mejorar la experiencia móvil."
      : "En Safari toca Compartir y luego “Añadir a pantalla de inicio” para instalarla.";

    return (
      <div className="mobile-app-shell__install-banner" role="status">
        <div className="mobile-app-shell__install-icon">
          <DownloadOutlined />
        </div>

        <div className="mobile-app-shell__install-copy">
          <div className="mobile-app-shell__install-title">Instala la app</div>
          <div className="mobile-app-shell__install-description">{description}</div>
        </div>

        <div className="mobile-app-shell__install-actions">
          {canInstall ? (
            <Button color="primary" size="small" onClick={handleInstall}>
              Instalar
            </Button>
          ) : null}

          <HeaderActionButton
            aria-label="Ocultar aviso de instalación"
            onClick={() => setInstallBannerDismissed(true)}
          >
            <CloseOutlined />
          </HeaderActionButton>
        </div>
      </div>
    );
  };

  return (
    <div className="mobile-app-shell">
      <SafeArea position="top" />

      <header className="mobile-app-shell__header">
        <div className="mobile-app-shell__header-bar">
          <div className="mobile-app-shell__heading">
            <h1 className="mobile-app-shell__title">{title}</h1>
            <p className="mobile-app-shell__subtitle">{subtitle}</p>
          </div>

          <div className="mobile-app-shell__header-actions">
            {isUpdateReady ? (
              <HeaderActionButton
                aria-label="Actualizar aplicación"
                onClick={handleApplyUpdate}
              >
                <SyncOutlined />
              </HeaderActionButton>
            ) : null}

            {canInstall && showInstallBanner ? (
              <HeaderActionButton
                aria-label="Instalar aplicación"
                onClick={handleInstall}
              >
                <DownloadOutlined />
              </HeaderActionButton>
            ) : null}

            <HeaderActionButton
              aria-label="Abrir ajustes"
              onClick={() => setSettingsOpen(true)}
            >
              <SettingOutlined />
            </HeaderActionButton>
          </div>
        </div>

        {renderInstallBanner()}
      </header>

      <div className="mobile-app-shell__content">
        <div className="mobile-app-shell__surface">
          {isUpdateReady && (
            <NoticeBar
              content="Hay una nueva versión lista para instalarse."
              extra={
                <Button size="mini" onClick={handleApplyUpdate}>
                  Actualizar
                </Button>
              }
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
      </div>

      {tabResources.length > 0 && location.pathname !== "/login" && (
        <>
          <div className="mobile-app-shell__tabbar-shell">
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
          </div>
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

            {canInstall && !isStandalone && (
              <div className="mobile-app-shell__setting-row">
                <span className="mobile-app-shell__setting-label">
                  <DownloadOutlined /> Instalar PWA
                </span>
                <Button color="primary" size="small" onClick={handleInstall}>
                  Instalar
                </Button>
              </div>
            )}

            {!canInstall && manualInstallPlatform === "ios" && !isStandalone && (
              <NoticeBar content="En Safari puedes instalarla desde Compartir > Añadir a pantalla de inicio." />
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
