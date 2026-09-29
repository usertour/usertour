import { useState } from 'react';

/** An ordinary app page: a header bar and some copy. */
export const BlankPage = () => (
  <div>
    <header style={{ height: 56, borderBottom: '1px solid #e5e5e5', padding: '0 24px' }}>
      <h1 style={{ margin: 0, lineHeight: '56px', fontSize: 18 }}>Acme dashboard</h1>
    </header>
    <main style={{ padding: 24 }}>
      <p>Welcome back. Here is what changed since your last visit.</p>
    </main>
  </div>
);

export const CenteredTarget = () => (
  <div style={{ height: '100vh', display: 'grid', placeItems: 'center' }}>
    <button type="button" data-gallery-target="" style={{ padding: '8px 16px' }}>
      Target
    </button>
  </div>
);

const SIDEBAR_WIDTH = 256;
const SIDEBAR_ITEMS = ['Dashboard', 'Tasks', 'Apps', 'Chats', 'Users', 'Settings'];

/**
 * A collapsible-app sidebar as common UI kits build it: a fixed full-height
 * rail, a scrollable (overflow:auto) item list, and items that clip their own
 * overflow — so the target sits under a fixed ancestor AND two clipping ones.
 */
export const FixedSidebar = () => (
  <div style={{ display: 'flex', minHeight: '100vh' }}>
    {/* Reserves the rail's width in the page flow. */}
    <div style={{ position: 'relative', width: SIDEBAR_WIDTH }} />
    <aside
      style={{
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        zIndex: 10,
        display: 'flex',
        height: '100vh',
        width: SIDEBAR_WIDTH,
        borderRight: '1px solid #e5e5e5',
        background: '#fafafa',
      }}
    >
      <div style={{ display: 'flex', height: '100%', width: '100%', flexDirection: 'column' }}>
        <nav
          style={{
            display: 'flex',
            minHeight: 0,
            flex: 1,
            flexDirection: 'column',
            gap: 8,
            overflow: 'auto',
            padding: 8,
          }}
        >
          {SIDEBAR_ITEMS.map((label) => (
            <a
              key={label}
              href={`#${label.toLowerCase()}`}
              data-gallery-target={label === 'Tasks' ? '' : undefined}
              style={{
                display: 'flex',
                width: '100%',
                overflow: 'hidden',
                padding: 8,
                borderRadius: 6,
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
    </aside>
    <main style={{ flex: 1, padding: 24 }}>Page content</main>
  </div>
);

/**
 * A target that moves without resizing: content inserted above it pushes it
 * down (the everyday SPA reflow — a banner, an expanded panel, late data).
 */
export const ShiftingTarget = () => {
  const [pushed, setPushed] = useState(false);
  return (
    <div style={{ padding: 24 }}>
      <button type="button" data-gallery-action="shift" onClick={() => setPushed(true)}>
        Insert content above the target
      </button>
      {pushed && <div style={{ height: 200 }}>Inserted content</div>}
      <div style={{ marginTop: 160, marginLeft: 320 }}>
        <button type="button" data-gallery-target="" style={{ padding: '8px 16px' }}>
          Target
        </button>
      </div>
    </div>
  );
};

/**
 * The same page on an app that ships a global CSS reset (the Tailwind-preflight
 * essentials), as many hosts do. Rendering must not depend on it either way.
 */
export const BlankPageWithReset = () => (
  <>
    <style>
      {'*, ::before, ::after { box-sizing: border-box; border-width: 0; border-style: solid; }'}
    </style>
    <BlankPage />
  </>
);

/** A target tucked into the bottom-right corner of the viewport. */
export const CornerTarget = () => (
  <div style={{ position: 'relative', height: '100vh' }}>
    <button
      type="button"
      data-gallery-target=""
      style={{ position: 'absolute', right: 24, bottom: 24, padding: '8px 16px' }}
    >
      Target
    </button>
  </div>
);

/** A target inside a scrollable panel (a list, a table, a settings pane). */
export const ScrollPanelTarget = () => (
  <div style={{ padding: 40 }}>
    <div
      data-gallery-scroller=""
      style={{ height: 400, width: 480, overflow: 'auto', border: '1px solid #e5e5e5' }}
    >
      <div style={{ height: 150 }} />
      <button type="button" data-gallery-target="" style={{ padding: '8px 16px' }}>
        Target
      </button>
      <div style={{ height: 1200 }} />
    </div>
  </div>
);
