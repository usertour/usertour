import { useUserTableColumns } from '@/hooks/use-user-table-columns';
import { useCompanyTableColumns } from '@/hooks/use-company-table-columns';
import { useAddUsersToSegment } from '@/hooks/use-add-users-to-segment';
import { useAddCompaniesToManualSegment } from '@/hooks/use-add-companies-to-manual-segment';
import { useSaveSegmentFilter } from '@/hooks/use-save-segment-filter';
import { useSaveCompanySegmentFilter } from '@/hooks/use-save-company-segment-filter';
import { UserDetailContent } from '@/pages/users/components/user-detail-content';
import { CompanyDetailContent } from '@/pages/companies/components/company-detail-content';
import type { CursorListQueryFn } from '@/hooks/use-cursor-pagination';
import {
  type Attribute,
  AttributeBizTypes,
  type BizCompany,
  type BizUser,
  type Segment,
  type Segment as SegmentType,
} from '@usertour/types';
import { useUserListQuery, useCompanyListQuery } from '@usertour/hooks';
import { userListState, companyListState } from './entity-list-state';
import { Group2LineIcon } from '@usertour/icons';
import type { ComponentType, ReactElement } from 'react';
import type { ColumnDef } from '@tanstack/react-table';

// Single per-entity dispatch table. Shared <Entity*> components in
// components/biz/ consume this; hook fields are called as hooks inside
// those components (config is a module-level constant so its function
// references are stable — rules-of-hooks safe).
//
// Per-entity adapters (e.g. `DetailContent`) keep the components we
// deliberately don't dedup (D4) wired through a single prop name.

export type EntityKind = 'user' | 'company';

export type EntityListQueryFn<TRow> = CursorListQueryFn<TRow>;

export interface EntityAddToManualSegmentHookResult {
  add: (ids: string[], segment: SegmentType) => Promise<boolean>;
  isAdding: boolean;
}

export interface EntitySaveFilterHookArgs {
  currentSegment: Segment | undefined;
  currentConditions: import('@usertour/types').CurrentConditions | undefined;
  refetchSegments: () => Promise<unknown>;
}

export interface EntitySaveFilterHookResult {
  open: boolean;
  isShowButton: boolean;
  loading: boolean;
  handleOpenDialog: () => void;
  handleCloseDialog: () => void;
  saveFilter: () => Promise<boolean>;
}

export interface EntityDetailContentProps {
  environmentId: string;
  id: string;
}

export interface EntityI18nKeys {
  // Sidebar
  sidebarTitle: string; // literal, e.g. 'Users'
  createSegmentTooltip: string; // 'users.segments.tooltips.createSegment'
  // List header
  editSegmentNameTooltip: string; // user: 'users.segments.tooltips.editName' / company differs
  // Empty state
  emptyMessage: string;
  emptyDescription: string;
  // Table footer — total-count line on the pagination row. Takes
  // `{ count }` interpolation.
  totalCount: string;
  // Toolbar / row actions
  addToManualSegment: string;
  deleteAction: string; // 'users.actions.deleteUser' / 'companies.actions.deleteCompany'
  removeFromSegment: string;
  deleteSegment: string; // edit dropdown's destructive item
  // Filter save dialog
  saveFilter: string;
  confirmSave: string; // takes { segmentName } interpolation
  yesSave: string;
  cancel: string;
}

export interface EntityConfig<TRow> {
  kind: EntityKind;
  // Reactive var pair for this entity's list page (query + currentConditions).
  listState: import('./entity-list-state').BizListState;
  // Data — Apollo list-query wrapper (per ADR 0002)
  useListQuery: EntityListQueryFn<TRow>;
  useTableColumns: (args: { isViewOnly: boolean }) => ColumnDef<TRow>[];
  useAddToManualSegment: () => EntityAddToManualSegmentHookResult;
  useSaveFilter: (args: EntitySaveFilterHookArgs) => EntitySaveFilterHookResult;
  // Attribute meta
  attributeBizType: AttributeBizTypes; // for `useDynamicTableColumns` + table column derivation
  conditionAttributeFilter: (attr: Attribute) => boolean; // toolbar's Conditions input filter
  // Segment meta
  segmentBizType: string[]; // ['USER'] | ['COMPANY']
  groupIcon?: ReactElement;
  // Routing
  routeParamKey: 'userId' | 'companyId';
  navToDetail: (environmentId: string, id: string) => string;
  navToList: (environmentId: string) => string;
  // Per-entity content components (D4 deliberately kept parallel)
  DetailContent: ComponentType<EntityDetailContentProps>;
  // Labels
  i18n: EntityI18nKeys;
}

// ---- Adapters: normalize hook return shapes for the shared layer ----

const useAddUsersAdapter = (): EntityAddToManualSegmentHookResult => {
  const { addUsers, isAdding } = useAddUsersToSegment();
  return { add: addUsers, isAdding };
};

const useAddCompaniesAdapter = (): EntityAddToManualSegmentHookResult => {
  const { addCompanies, isAdding } = useAddCompaniesToManualSegment();
  return { add: addCompanies, isAdding };
};

// DetailContent prop-name adapters: callers use `id` uniformly; the per-
// entity implementations keep their original `userId` / `companyId` prop
// names so we don't churn user-detail-content / company-detail-content.
const UserDetailContentAdapter = ({ environmentId, id }: EntityDetailContentProps) => (
  <UserDetailContent environmentId={environmentId} userId={id} />
);

const CompanyDetailContentAdapter = ({ environmentId, id }: EntityDetailContentProps) => (
  <CompanyDetailContent environmentId={environmentId} companyId={id} />
);

// ---- Configs ----

export const USER_CONFIG: EntityConfig<BizUser> = {
  kind: 'user',
  listState: userListState,
  useListQuery: useUserListQuery,
  useTableColumns: useUserTableColumns,
  useAddToManualSegment: useAddUsersAdapter,
  useSaveFilter: useSaveSegmentFilter,
  attributeBizType: AttributeBizTypes.User,
  conditionAttributeFilter: (attr) => attr.bizType === AttributeBizTypes.User,
  segmentBizType: ['USER'],
  routeParamKey: 'userId',
  navToDetail: (envId, id) => `/env/${envId}/user/${id}`,
  navToList: (envId) => `/env/${envId}/users`,
  DetailContent: UserDetailContentAdapter,
  i18n: {
    sidebarTitle: 'users.detail.breadcrumb',
    createSegmentTooltip: 'users.segments.tooltips.createSegment',
    editSegmentNameTooltip: 'users.segments.tooltips.editName',
    emptyMessage: 'users.empty.noUsersFound',
    emptyDescription: 'users.empty.noUsersFoundDescription',
    totalCount: 'users.list.totalCount',
    addToManualSegment: 'users.actions.addToManualSegment',
    deleteAction: 'users.actions.deleteUser',
    removeFromSegment: 'users.actions.removeFromSegment',
    deleteSegment: 'users.actions.deleteSegment',
    saveFilter: 'users.filters.saveFilter',
    confirmSave: 'users.filters.confirmSave',
    yesSave: 'users.filters.yesSave',
    cancel: 'users.actions.cancel',
  },
};

export const COMPANY_CONFIG: EntityConfig<BizCompany> = {
  kind: 'company',
  listState: companyListState,
  useListQuery: useCompanyListQuery,
  useTableColumns: useCompanyTableColumns,
  useAddToManualSegment: useAddCompaniesAdapter,
  useSaveFilter: useSaveCompanySegmentFilter,
  attributeBizType: AttributeBizTypes.Company,
  // Toolbar conditions accept Company AND Membership attributes — the
  // table itself only renders Company columns (see attributeBizType).
  conditionAttributeFilter: (attr) =>
    attr.bizType === AttributeBizTypes.Company || attr.bizType === AttributeBizTypes.Membership,
  segmentBizType: ['COMPANY'],
  groupIcon: <Group2LineIcon width={16} height={16} className="mr-1" />,
  routeParamKey: 'companyId',
  navToDetail: (envId, id) => `/env/${envId}/company/${id}`,
  navToList: (envId) => `/env/${envId}/companies`,
  DetailContent: CompanyDetailContentAdapter,
  i18n: {
    sidebarTitle: 'companies.detail.breadcrumb',
    createSegmentTooltip: 'companies.segments.tooltips.createSegment',
    // Inconsistency in legacy keys: companies uses `detail.tooltips.editName`,
    // not `segments.tooltips.editName`. Preserve verbatim.
    editSegmentNameTooltip: 'companies.detail.tooltips.editName',
    emptyMessage: 'companies.empty.noCompaniesFound',
    emptyDescription: 'companies.empty.noCompaniesFoundDescription',
    totalCount: 'companies.list.totalCount',
    addToManualSegment: 'companies.actions.addToManualSegment',
    deleteAction: 'companies.actions.deleteCompany',
    removeFromSegment: 'companies.actions.removeFromSegment',
    deleteSegment: 'companies.actions.deleteSegment',
    saveFilter: 'companies.filters.saveFilter',
    confirmSave: 'companies.filters.confirmSave',
    yesSave: 'companies.filters.yesSave',
    cancel: 'companies.actions.cancel',
  },
};
