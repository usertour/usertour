import { useTranslation } from 'react-i18next';
import { SegmentSidebar } from '@/components/segments/layout';
import { SegmentCreateDialog } from '@/components/segments';
import { useAppContext } from '@/contexts/app-context';
import type { Segment } from '@usertour/types';
import { useState } from 'react';
import type { EntityConfig } from './entity-config';

interface EntityListSidebarProps {
  config: EntityConfig<any>;
  environmentId: string;
  segmentList: Segment[];
  currentSegment: Segment | undefined;
  loading: boolean;
  refetchSegments: () => Promise<unknown>;
}

export const EntityListSidebar = (props: EntityListSidebarProps) => {
  const { config, environmentId, segmentList, currentSegment, loading, refetchSegments } = props;
  const { t } = useTranslation();
  const { isViewOnly } = useAppContext();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <SegmentSidebar
        title={config.i18n.sidebarTitle}
        segmentList={segmentList}
        currentSegment={currentSegment}
        loading={loading}
        groupIcon={config.groupIcon}
        onCreate={() => setDialogOpen(true)}
        createTooltip={t(config.i18n.createSegmentTooltip)}
        disabled={isViewOnly}
      />
      <SegmentCreateDialog
        entity={config.kind}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={() => refetchSegments()}
        environmentId={environmentId}
      />
    </>
  );
};

EntityListSidebar.displayName = 'EntityListSidebar';
