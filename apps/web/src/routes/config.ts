import {
  SignIn,
  SignUp,
  ResetPassword,
  Registration,
  PasswordReset,
} from "@/pages/authentication";
import { Dashboard } from "@/pages/dashboard";
import {
  ContentDetail,
  ContentList,
  ContentBuilder,
  ContentLocalization,
} from "@/pages/contents";
import { UserDetail, UserList } from "@/pages/users";
import { CompanyList, CompanyDetail } from "@/pages/companies";
import {
  AuthLayout,
  AdminListLayout,
  AdminDetailLayout,
  AdminSettingsLayout,
} from "@/pages/layouts";
import { AdminSettings, SettingsThemeDetail } from "@/pages/settings";

export interface CustomRouteConfig {
  path: string;
  title?: string;
  loginRequired?: boolean;
  redirectIfLogged?: boolean;
  layout?: any;
  component: any;
  id?: string;
}

const config: CustomRouteConfig[] = [
  /* Signin */
  {
    path: "/auth/signin",
    component: SignIn,
    layout: AuthLayout,
    loginRequired: false,
    redirectIfLogged: true,
    title: "SignIn",
  },
  /* Signin */
  {
    path: "/",
    component: SignIn,
    layout: AuthLayout,
    loginRequired: false,
    redirectIfLogged: true,
    title: "SignIn",
  },
  /* SignUp */
  {
    path: "/auth/signup",
    component: SignUp,
    layout: AuthLayout,
    loginRequired: false,
    redirectIfLogged: true,
    title: "SignUp",
  },
  /* ResetPassword */
  {
    path: "/auth/reset-password",
    component: ResetPassword,
    layout: AuthLayout,
    loginRequired: false,
    redirectIfLogged: true,
    title: "ResetPassword",
  },
  /* Registration */
  {
    path: "/auth/registration/:registId",
    component: Registration,
    layout: AuthLayout,
    loginRequired: false,
    redirectIfLogged: true,
    title: "Registration",
  },
  /* PasswordReset */
  {
    path: "/auth/password-reset/:code",
    component: PasswordReset,
    layout: AuthLayout,
    loginRequired: false,
    redirectIfLogged: true,
    title: "PasswordReset",
  },
  /* Dashboard */
  {
    path: "/env/:envId/overview",
    component: Dashboard,
    layout: AdminListLayout,
    id: "overview",
    loginRequired: true,
    redirectIfLogged: false,
    title: "Dashboard",
  },
  /* Dashboard */
  {
    path: "/overview",
    component: Dashboard,
    layout: AdminListLayout,
    loginRequired: true,
    redirectIfLogged: false,
    title: "Dashboard",
  },
  /* ContentList */
  {
    id: "content",
    path: "/env/:envId/:contentType",
    component: ContentList,
    layout: AdminListLayout,
    loginRequired: true,
    redirectIfLogged: false,
    title: "ContentList",
  },
  /* ContentDetail */
  {
    path: "/env/:envId/:contentType/:contentId/:type",
    component: ContentDetail,
    layout: AdminDetailLayout,
    loginRequired: true,
    redirectIfLogged: false,
    title: "ContentDetail",
  },
  /* ContentLocalization */
  {
    path: "/env/:envId/:contentType/:contentId/localization/:locateCode",
    component: ContentLocalization,
    layout: AdminDetailLayout,
    loginRequired: true,
    redirectIfLogged: false,
    title: "ContentLocalization",
  },
  /* ContentBuilder */
  {
    path: "/env/:envId/:contentType/:contentId/:type/:versionId",
    component: ContentBuilder,
    layout: AdminDetailLayout,
    loginRequired: true,
    redirectIfLogged: false,
    title: "ContentBuilder",
  },
  /* UserList */
  {
    id: "users",
    path: "/env/:envId/users",
    component: UserList,
    layout: AdminListLayout,
    loginRequired: true,
    redirectIfLogged: false,
    title: "UserList",
  },
  /* CompanyList */
  {
    id: "companies",
    path: "/env/:envId/companies",
    component: CompanyList,
    layout: AdminListLayout,
    loginRequired: true,
    redirectIfLogged: false,
    title: "CompanyList",
  },
  /* SettingsThemeDetail */
  {
    path: "/project/:projectId/settings/theme/:themeId",
    component: SettingsThemeDetail,
    layout: AdminDetailLayout,
    loginRequired: true,
    redirectIfLogged: false,
    title: "SettingsThemeDetail",
  },
  /* UserDetail */
  {
    path: "/env/:envId/user/:userId",
    component: UserDetail,
    layout: AdminDetailLayout,
    loginRequired: true,
    redirectIfLogged: false,
    title: "UserDetail",
  },
  /* CompanyDetail */
  {
    path: "/env/:envId/company/:companyId",
    component: CompanyDetail,
    layout: AdminDetailLayout,
    loginRequired: true,
    redirectIfLogged: false,
    title: "CompanyDetail",
  },
  /* Settings */
  {
    id: "settings",
    path: "/project/:projectId/settings/:settingType",
    layout: AdminSettingsLayout,
    component: AdminSettings,
    loginRequired: true,
    redirectIfLogged: false,
    title: "Settings",
  },
  {
    path: "*",
    component: SignIn,
    layout: AuthLayout,
    loginRequired: false,
    redirectIfLogged: true,
    title: "SignIn",
  },
];

export default config;
