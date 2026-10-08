import './calls';
import { convertSettings } from '@usertour/helpers';
import type { ThemeTypesSetting } from '@usertour/types';
import { StrictMode } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { cases } from './cases';
import { configureSdkEnv, loadHostStylesheet } from './env';
import { themes } from './fixtures/theme';
import hostileHostCss from './hostile-host.css?raw';

declare global {
  interface Window {
    /** The case's theme after the SDK's own resolution (Auto values filled in). Read by the e2e tests. */
    __galleryTheme: ThemeTypesSetting;
  }
}

// The id the SDK mounts under; index.css scopes its rules to it.
const WIDGET_CONTAINER_ID = 'usertour-widget';

const CaseIndex = () => (
  <ul>
    {Object.keys(cases).map((name) => (
      <li key={name}>
        <a href={`?case=${name}`}>{name}</a>
      </li>
    ))}
  </ul>
);

const start = async () => {
  configureSdkEnv();
  const hostRoot = createRoot(document.getElementById('host') as HTMLElement);
  const search = new URLSearchParams(window.location.search);
  const name = search.get('case');
  const galleryCase = name ? cases[name] : undefined;
  if (!galleryCase) {
    hostRoot.render(<CaseIndex />);
    return;
  }

  if (search.get('host') === 'hostile') {
    const style = document.createElement('style');
    style.textContent = hostileHostCss;
    document.head.appendChild(style);
  }
  const theme = themes[search.get('theme') ?? 'default'];
  if (!theme) {
    throw new Error(`Unknown theme "${search.get('theme')}"; known: ${Object.keys(themes)}`);
  }

  window.__galleryTheme = convertSettings(theme);

  // After the host's own styles, as when the SDK loads into a finished page.
  await loadHostStylesheet();
  // Commit the host synchronously so the widget's target exists when it is built.
  const Host = galleryCase.host;
  flushSync(() => hostRoot.render(<Host />));

  const container = document.createElement('div');
  container.id = WIDGET_CONTAINER_ID;
  document.body.appendChild(container);
  createRoot(container).render(<StrictMode>{galleryCase.widget({ theme, search })}</StrictMode>);
};

start();
