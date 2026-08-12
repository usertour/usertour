import type { ReactNode } from 'react';
import { SettingsPage, type SettingsPageProps } from './settings-page';
import { ResourceListBody, type ResourceListBodyProps } from './resource-list-body';

export interface ResourceListPageProps<T>
  extends Omit<SettingsPageProps, 'children'>,
    ResourceListBodyProps<T> {
  /**
   * Optional content inserted between the page header and the table —
   * used by attributes for the bizType Tabs row.
   */
  toolbar?: ReactNode;
  /**
   * Optional content rendered after the table, inside the scroll container —
   * used by the audit log for its infinite-scroll sentinel + spinner.
   */
  footer?: ReactNode;
}

/**
 * Standard Settings list page: `SettingsPage` shell + `ResourceListBody`
 * (skeleton, table, empty state). For tab-internal sub-lists that don't
 * want the page chrome, use `ResourceListBody` directly.
 */
export function ResourceListPage<T>(props: ResourceListPageProps<T>) {
  const {
    columns,
    rows,
    getRowKey,
    loading,
    skeleton,
    empty,
    toolbar,
    footer,
    onRowClick,
    ...pageProps
  } = props;

  return (
    <SettingsPage {...pageProps}>
      {toolbar}
      <ResourceListBody<T>
        columns={columns}
        rows={rows}
        getRowKey={getRowKey}
        loading={loading}
        skeleton={skeleton}
        empty={empty}
        onRowClick={onRowClick}
      />
      {footer}
    </SettingsPage>
  );
}

ResourceListPage.displayName = 'ResourceListPage';
