const PREFIX = 'usertour-widget';

export const WidgetClass = {
  // Root
  root: `${PREFIX}-root`,

  // Stage (container with enter animation)
  stage: `${PREFIX}-stage`,

  // Elevation (shadow)
  elevation: `${PREFIX}-elevation`,

  // Surface (popper layout)
  surface: `${PREFIX}-surface`,
  surfaceShell: `${PREFIX}-surface-shell`,
  surfaceShellMinimized: `${PREFIX}-surface-shell--minimized`,
  surfaceFrame: `${PREFIX}-surface-frame`,
  surfaceViewport: `${PREFIX}-surface-viewport`,
  surfacePanel: `${PREFIX}-surface-panel`,

  // Overlay (full-screen backdrop)
  overlay: `${PREFIX}-overlay`,
  overlayVisible: `${PREFIX}-overlay--visible`,

  // Spotlight (element highlight)
  spotlight: `${PREFIX}-spotlight`,
  spotlightVisible: `${PREFIX}-spotlight--visible`,

  // Curtain (click-blocking regions)
  curtain: `${PREFIX}-curtain`,
  curtainVisible: `${PREFIX}-curtain--visible`,
  curtainTop: `${PREFIX}-curtain--top`,
  curtainRight: `${PREFIX}-curtain--right`,
  curtainBottom: `${PREFIX}-curtain--bottom`,
  curtainLeft: `${PREFIX}-curtain--left`,

  // Beacon
  beacon: `${PREFIX}-beacon`,
  beaconHalo: `${PREFIX}-beacon__halo`,
  beaconCore: `${PREFIX}-beacon__core`,

  // Launcher
  launcher: `${PREFIX}-launcher`,
  launcherActivateOnClick: `${PREFIX}-launcher--activate-on-click`,
  launcherIcon: `${PREFIX}-launcher--icon`,
  launcherButton: `${PREFIX}-launcher--button`,

  // Checklist launcher
  checklistLauncher: `${PREFIX}-checklist-launcher`,
  checklistLauncherFixed: `${PREFIX}-checklist-launcher--position-fixed`,

  // Resource center
  resourceCenter: `${PREFIX}-resource-center`,
  resourceCenterFrame: `${PREFIX}-resource-center-frame`,
  resourceCenterFrameResizing: `${PREFIX}-resource-center-frame--resizing`,
  resourceCenterFrameCompact: `${PREFIX}-resource-center-frame--compact`,
  resourceCenterFrameExpanded: `${PREFIX}-resource-center-frame--expanded`,
  resourceCenterLauncher: `${PREFIX}-resource-center-launcher`,
  resourceCenterToast: `${PREFIX}-resource-center-toast`,

  // Indicator (unread badge)
  indicator: `${PREFIX}-indicator`,

  // Bubble avatar
  bubbleAvatar: `${PREFIX}-bubble__avatar`,
  bubbleAvatarMinimizable: `${PREFIX}-bubble__avatar--minimizable`,

  // Banner
  banner: `${PREFIX}-banner`,
  bannerFrame: `${PREFIX}-banner-frame`,
} as const;

export const WidgetAnimation = {
  stageReveal: `${PREFIX}-stage-reveal`,
  beaconHalo: `${PREFIX}-beacon-halo`,
  bannerReveal: `${PREFIX}-banner-reveal`,
  embedReveal: `${PREFIX}-embed-reveal`,
  indicatorEnter: `${PREFIX}-indicator-enter`,
  indicatorRipple: `${PREFIX}-indicator-ripple`,
  resourceCenterReveal: `${PREFIX}-resource-center-reveal`,
} as const;
