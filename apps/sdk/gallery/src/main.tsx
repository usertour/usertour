import './calls';
import { StrictMode } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { cases } from './cases';
import { configureSdkEnv, loadHostStylesheet } from './env';

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
  const name = new URLSearchParams(window.location.search).get('case');
  const galleryCase = name ? cases[name] : undefined;
  if (!galleryCase) {
    hostRoot.render(<CaseIndex />);
    return;
  }

  await loadHostStylesheet();
  // Commit the host synchronously so the widget's target exists when it is built.
  const Host = galleryCase.host;
  flushSync(() => hostRoot.render(<Host />));

  const container = document.createElement('div');
  container.id = WIDGET_CONTAINER_ID;
  document.body.appendChild(container);
  createRoot(container).render(<StrictMode>{galleryCase.widget()}</StrictMode>);
};

start();
