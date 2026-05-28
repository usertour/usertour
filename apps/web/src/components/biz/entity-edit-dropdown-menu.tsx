import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour/ui';
import { Delete2Icon } from '@usertour/icons';
import type { Segment } from '@usertour/types';
import { ReactNode, useState } from 'react';
import { SegmentDeleteDialog } from '@/components/segments';
import { useTranslation } from 'react-i18next';
import type { EntityConfig } from './entity-config';

interface EntityEditDropdownMenuProps {
  config: EntityConfig<any>;
  segment: Segment;
  children: ReactNode;
  onSubmit: () => void;
  disabled?: boolean;
}

export const EntityEditDropdownMenu = (props: EntityEditDropdownMenuProps) => {
  const { config, segment, children, onSubmit, disabled = false } = props;
  const [openDelete, setOpenDelete] = useState(false);
  const { t } = useTranslation();

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild disabled={disabled}>
          {children}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-[101]">
          <DropdownMenuItem
            className="text-red-600 cursor-pointer"
            onClick={() => setOpenDelete(true)}
          >
            <Delete2Icon className="mr-1" />
            {t(config.i18n.deleteSegment)}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SegmentDeleteDialog
        entity={config.kind}
        segment={segment}
        open={openDelete}
        onOpenChange={setOpenDelete}
        onSubmit={(success) => {
          if (success) {
            onSubmit();
          }
        }}
      />
    </>
  );
};

EntityEditDropdownMenu.displayName = 'EntityEditDropdownMenu';
