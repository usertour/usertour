import { resolve } from 'node:path';
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
import { UserConfigExport, defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const pkg = require('./package.json');
const banner = ['/*!', pkg.name, pkg.version, '*/\n'].join(' ');
const env = process.env.DEVELOPMENT ? 'development' : 'production';
const buildPlugins = [
  react(),
  nodeResolve({
    extensions: ['.ts', '.json', '.tsx'],
  }),
  commonjs(),
  replace({
    'process.env.NODE_ENV': JSON.stringify(env),
  }),
  babel({
    extensions: ['.ts', '.mts', '.tsx'],
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

export default defineConfig(({ command }) => {
  const isIffeBundle = process.argv.includes('--iife');
  const version = process.env.npm_package_version;
  const folderName = isIffeBundle ? 'legacy' : 'es2020';
  const isBuild = command === 'build';

  const css1 = `/${version}/${folderName}/css/index.css`;
  const css2 = `/${version}/${folderName}/css/usertour.css`;

  const defaultConfig: UserConfigExport = {
    plugins: [react()],
    define: {
      USERTOUR_APP_VERSION: JSON.stringify(version),
      USERTOUR_APP_MAIN_CSS: JSON.stringify(css1),
      USERTOUR_APP_USER_TOUR_CSS: JSON.stringify(css2),
    },
    build: {
      lib: {
        // Could also be a dictionary or array of multiple entry points
        entry: resolve(__dirname, 'src/usertour.ts'),
        name: 'usertour',
        formats: ['es'],
        // the proper extensions will be added
        fileName: 'usertour',
      },
      sourcemap: true,
    },
  };

  const devConfig: UserConfigExport = {
    plugins: [react(), mkcert()],
    define: {
      ...defaultConfig.define,
    },
    build: {
      ...defaultConfig.build,
      sourcemap: true,
    },
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
  };

  //mode=build
  if (isBuild) {
    if (isIffeBundle) {
      return {
        ...defaultConfig,
        build: {
          lib: {
            // Could also be a dictionary or array of multiple entry points
            entry: resolve(__dirname, 'src/usertour.ts'),
            name: 'usertour',
            formats: ['iife'],
            // the proper extensions will be added
            fileName: 'usertour',
          },
          commonjsOptions: { include: [] },
          outDir: `dist/${version}/${folderName}`,
          sourcemap: true,
        },
        plugins: [...buildPlugins],
      };
    }
    return {
      ...defaultConfig,
      build: {
        ...defaultConfig.build,
        rollupOptions: {
          output: {
            inlineDynamicImports: false,
            manualChunks: (moduleName) => {
              if (moduleName.includes('node_modules')) {
                return 'vendor';
              }

              // if (moduleName.includes("src/components/")) {
              //   return "components";
              // }
            },
            chunkFileNames: '[name]-[hash].js',
          },
        },
        commonjsOptions: { include: [] },
        outDir: `dist/${version}/${folderName}`,
        sourcemap: true,
      },
      plugins: [...buildPlugins],
    };
  }
  return devConfig;
});
