import { RouteObject } from 'react-router-dom';
import { AdminProvidersOutlet } from '@/pages/layouts/components/admin-layout';
import { AdminBuilderLayout } from '@/pages/layouts/admin-builder-layout';
import { AdminSettingsLayout } from '@/pages/layouts/admin-settings-layout';
import { AdminShell, AdminShellMuted } from '@/pages/layouts/admin-shell';
import { AuthLayout } from '@/pages/layouts/auth';
import { SystemAdminLayout } from '@/pages/admin/layout';
import { AuthGuard } from './auth-guard';
import { LandingRedirect } from './landing-redirect';
import { NotFound } from './not-found';

const lazyComponent =
  (loader: () => Promise<Record<string, unknown>>, exportName: string) => async () => {
    const mod = await loader();
    return { Component: mod[exportName] as React.ComponentType };
  };

const config: RouteObject[] = [
  // Setup admin — only when the instance still needs initialisation.
  {
    element: <AuthGuard mode="setup" />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          {
            path: '/auth/setup-admin',
            lazy: lazyComponent(() => import('@/pages/authentication/setup-admin'), 'SetupAdmin'),
          },
        ],
      },
    ],
  },

  // 2FA verify / setup is open to both the mid-login (no userInfo, has
  // challenge token) and the logged-in must-enrol case — so it sits
  // outside guest/user guards. AuthLayout still applies for the visuals.
  {
    element: <AuthLayout />,
    children: [
      {
        path: '/auth/2fa',
        lazy: lazyComponent(() => import('@/pages/authentication/two-factor'), 'TwoFactor'),
      },
      {
        path: '/auth/2fa/setup',
        lazy: lazyComponent(
          () => import('@/pages/authentication/two-factor-setup'),
          'TwoFactorSetup',
        ),
      },
    ],
  },

  // Public / guest surface.
  {
    element: <AuthGuard mode="guest" />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          {
            path: '/auth/signin',
            lazy: lazyComponent(() => import('@/pages/authentication/sign-in'), 'SignIn'),
          },
          {
            path: '/auth/signup',
            lazy: lazyComponent(() => import('@/pages/authentication/sign-up'), 'SignUp'),
          },
          {
            path: '/auth/reset-password',
            lazy: lazyComponent(
              () => import('@/pages/authentication/reset-password'),
              'ResetPassword',
            ),
          },
          {
            path: '/auth/invite/:inviteCode',
            lazy: lazyComponent(() => import('@/pages/authentication/invite'), 'Invite'),
          },
          {
            path: '/auth/registration/:registrationCode',
            lazy: lazyComponent(
              () => import('@/pages/authentication/registration'),
              'Registration',
            ),
          },
          {
            path: '/auth/password-reset/:code',
            lazy: lazyComponent(
              () => import('@/pages/authentication/password-reset'),
              'PasswordReset',
            ),
          },
        ],
      },
    ],
  },

  // Logged-in surface. AdminProvidersOutlet holds Environment/Attribute/Subscription
  // providers across all child shells so they don't remount on nav.
  {
    element: <AuthGuard mode="user" />,
    children: [
      {
        element: <AdminProvidersOutlet />,
        children: [
          { index: true, element: <LandingRedirect /> },

          {
            element: <AdminShell />,
            children: [
              {
                path: '/env/:envId/users',
                lazy: lazyComponent(() => import('@/pages/users'), 'UserList'),
              },
              {
                path: '/env/:envId/companies',
                lazy: lazyComponent(() => import('@/pages/companies'), 'CompanyList'),
              },
              {
                path: '/env/:envId/:contentType',
                lazy: lazyComponent(() => import('@/pages/contents'), 'ContentList'),
              },
            ],
          },

          {
            element: <AdminShellMuted />,
            children: [
              {
                path: '/env/:envId/:contentType/:contentId/:type',
                lazy: lazyComponent(() => import('@/pages/contents'), 'ContentDetail'),
              },
              {
                path: '/env/:envId/:contentType/:contentId/localization/:locateCode',
                lazy: lazyComponent(() => import('@/pages/contents'), 'ContentLocalization'),
              },
              {
                path: '/env/:envId/user/:userId',
                lazy: lazyComponent(() => import('@/pages/users'), 'UserDetail'),
              },
              {
                path: '/env/:envId/session/:sessionId',
                lazy: lazyComponent(() => import('@/pages/users/session-detail'), 'SessionDetail'),
              },
              {
                path: '/env/:envId/company/:companyId',
                lazy: lazyComponent(() => import('@/pages/companies'), 'CompanyDetail'),
              },
              {
                path: '/project/:projectId/settings/theme/:themeId',
                lazy: lazyComponent(() => import('@/pages/settings'), 'SettingsThemeDetail'),
              },
            ],
          },

          {
            element: <AdminBuilderLayout />,
            children: [
              {
                path: '/env/:envId/:contentType/:contentId/builder/:versionId',
                lazy: lazyComponent(() => import('@/pages/contents'), 'ContentBuilder'),
              },
            ],
          },

          {
            element: <AdminSettingsLayout />,
            children: [
              {
                path: '/project/:projectId/settings/:settingType',
                lazy: lazyComponent(() => import('@/pages/settings'), 'AdminSettings'),
              },
              {
                path: '/project/:projectId/settings/:settingType/:settingSubType',
                lazy: lazyComponent(
                  () => import('@/pages/settings/admin-setting-detail'),
                  'AdminSettingsDetail',
                ),
              },
            ],
          },

          {
            element: <SystemAdminLayout />,
            children: [
              {
                path: '/admin/general',
                lazy: lazyComponent(() => import('@/pages/admin/general'), 'AdminGeneralPage'),
              },
              {
                path: '/admin/authentication',
                lazy: lazyComponent(
                  () => import('@/pages/admin/authentication'),
                  'AdminAuthenticationPage',
                ),
              },
              {
                path: '/admin/subscription',
                lazy: lazyComponent(() => import('@/pages/admin/settings'), 'AdminSettingsPage'),
              },
              {
                path: '/admin/users',
                lazy: lazyComponent(() => import('@/pages/admin/users'), 'AdminUsersPage'),
              },
              {
                path: '/admin/projects',
                lazy: lazyComponent(() => import('@/pages/admin/projects'), 'AdminProjectsPage'),
              },
            ],
          },
        ],
      },
    ],
  },

  { path: '*', element: <NotFound /> },
];

export default config;
