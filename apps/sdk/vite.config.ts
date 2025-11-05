import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { babel } from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import react from '@vitejs/plugin-react';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import filesize from 'rollup-plugin-filesize';
import license from 'rollup-plugin-license';
import postcss from 'rollup-plugin-postcss';
import uglify from 'rollup-plugin-uglify';
import { visualizer } from 'rollup-plugin-visualizer';
import tailwindcss from 'tailwindcss';
import type { UserConfigExport } from 'vite';
import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read package.json for version and name
const pkg = JSON.parse(readFileSync(resolve(__dirname, './package.json'), 'utf-8')) as {
  name: string;
  version: string;
};
const banner = ['/*!', pkg.name, pkg.version, '*/\n'].join(' ');

// Helper function to get CSS paths
const getCssPaths = (version: string, folderName: string) => {
  const basePath = `/${version}/${folderName}/css`;
  return {
    main: `${basePath}/index.css`,
    usertour: `${basePath}/usertour.css`,
  };
};

// Helper function to create build plugins
const createBuildPlugins = (env: 'development' | 'production') => [
  react(),
  nodeResolve({
    extensions: ['.ts', '.json', '.tsx'],
  }),
  commonjs(),
  replace({
    'process.env.NODE_ENV': JSON.stringify(env),
    preventAssignment: true,
  }),
  babel({
    extensions: ['.ts', '.mts', '.tsx'],
    babelHelpers: 'bundled',
  }),
  postcss({
    plugins: [tailwindcss, autoprefixer, cssnano],
    extract: 'css/usertour.css',
  }),
  viteStaticCopy({
    targets: [
      {
        src: '../../packages/shared/assets/sdk/index.css',
        dest: 'css/',
      },
    ],
  }),
  uglify.uglify(),
  license({
    banner,
  }),
  filesize(),
  visualizer(),
];

// Helper function for code splitting
// Separates @usertour-packages into its own chunk and keeps core initialization code with main bundle
const createManualChunks = (moduleName: string): string | undefined => {
  // Internal Usertour packages - separate chunk
  if (moduleName.includes('@usertour-packages') || moduleName.includes('@usertour/')) {
    return 'vendor-usertour';
  }

  // Other third-party dependencies
  if (moduleName.includes('node_modules')) {
    return 'vendor';
  }

  // Keep core initialization code with main bundle to increase its size
  // Include all core modules that are needed for initialization
  if (
    moduleName.includes('/src/utils/') ||
    moduleName.includes('/src/types/') ||
    moduleName.includes('/src/core/')
  ) {
    // Return undefined to keep all core modules with main bundle
    return undefined;
  }

  // React components - split lazy loaded components separately
  if (moduleName.includes('/src/components/')) {
    // Split each lazy loaded component into its own chunk
    if (moduleName.includes('/src/components/tour')) {
      return 'tour';
    }
    if (moduleName.includes('/src/components/checklist')) {
      return 'checklist';
    }
    if (moduleName.includes('/src/components/launcher')) {
      return 'launcher';
    }
    // index.tsx stays with main bundle (it's the entry point for components)
    return undefined;
  }

  // Other business code stays with main bundle
  return undefined;
};

// Base configuration shared across all modes
const baseConfig = {
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/usertour.ts'),
      name: 'usertour',
      fileName: 'usertour',
    },
    sourcemap: true,
  },
} as const;

export default defineConfig(({ command, mode }) => {
  const isIffeBundle = process.argv.includes('--iife');
  const version = pkg.version;
  const folderName = isIffeBundle ? 'legacy' : 'es2020';
  const isBuild = command === 'build';
  const isDevelopment = process.env.DEVELOPMENT === 'true' || mode === 'development';
  const env = isDevelopment ? 'development' : 'production';

  const cssPaths = getCssPaths(version, folderName);

  const commonDefine = {
    USERTOUR_APP_VERSION: JSON.stringify(version),
    USERTOUR_APP_MAIN_CSS: JSON.stringify(cssPaths.main),
    USERTOUR_APP_USER_TOUR_CSS: JSON.stringify(cssPaths.usertour),
  };

  // Development configuration
  if (!isBuild) {
    return {
      plugins: [react(), mkcert()],
      ...baseConfig,
      define: commonDefine,
      server: {
        port: 5173,
        https: false,
        open: true,
        hmr: {
          overlay: true,
        },
      },
      optimizeDeps: {
        include: ['@dnd-kit/core', '@radix-ui/react-popover'],
        force: true,
      },
    } satisfies UserConfigExport;
  }

  // Build configuration for IIFE bundle
  if (isIffeBundle) {
    return {
      ...baseConfig,
      plugins: createBuildPlugins(env),
      define: commonDefine,
      build: {
        ...baseConfig.build,
        lib: {
          ...baseConfig.build.lib,
          formats: ['iife'],
        },
        commonjsOptions: { include: [] },
        outDir: `dist/${version}/${folderName}`,
      },
    } satisfies UserConfigExport;
  }

  // Build configuration for ES module bundle
  return {
    ...baseConfig,
    plugins: createBuildPlugins(env),
    define: commonDefine,
    build: {
      ...baseConfig.build,
      lib: {
        ...baseConfig.build.lib,
        formats: ['es'],
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: false,
          manualChunks: createManualChunks,
          chunkFileNames: '[name]-[hash].js',
        },
      },
      commonjsOptions: { include: [] },
      outDir: `dist/${version}/${folderName}`,
    },
  } satisfies UserConfigExport;
});
