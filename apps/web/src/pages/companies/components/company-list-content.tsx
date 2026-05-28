import { CompanyListProvider } from '@/contexts/company-list-context';
import { useSegmentListContext } from '@/contexts/segment-list-context';
import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import {
  Button,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour/ui';
import { EditIcon } from '@usertour/icons';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CompanyDataTable } from './company-data-table';
import { CompanyEditDropdownMenu } from './company-edit-dropdown-menu';
import { CompanySegmentFilterSave } from './company-segment-filter-save';
import { SegmentEditDialog } from '@/components/segments';
import { useAppContext } from '@/contexts/app-context';
import { useTranslation } from 'react-i18next';

// Inner component that uses the context
const CompanyListContentInner = ({ environmentId }: { environmentId: string | undefined }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { currentSegment, refetch } = useSegmentListContext();
  const navigate = useNavigate();
  const { isViewOnly } = useAppContext();

  const handleOnClose = useCallback(() => {
    setOpen(false);
  }, []);

  const handleOnSubmit = useCallback(
    (success: boolean) => {
      if (success) {
        refetch();
      }
    },
    [refetch],
  );

  return (
    <>
      <div className="flex flex-col flex-shrink min-w-0 px-4 py-6 lg:px-8 grow">
        <div className="flex items-center justify-between">
          <div className="space-y-1 flex flex-row items-center relative">
            <h2 className="text-xl font-semibold tracking-tight">{currentSegment?.name}</h2>
            {currentSegment && currentSegment.dataType !== 'ALL' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={'ghost'}
                      size={'icon'}
                      className="w-8 h-8 ml-2 cursor-pointer"
                      disabled={isViewOnly}
                      onClick={() => {
                        setOpen(true);
                      }}
                    >
                      <EditIcon className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs bg-slate-700">
                    <p>{t('companies.detail.tooltips.editName')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {<CompanySegmentFilterSave currentSegment={currentSegment} />}
          </div>
          {currentSegment && currentSegment.dataType !== 'ALL' && (
            <CompanyEditDropdownMenu
              segment={currentSegment}
              disabled={isViewOnly}
              onSubmit={async () => {
                await refetch();
                navigate(`/env/${environmentId}/companies`);
              }}
            >
              <Button variant="ghost" className="h-8 w-8 p-0">
                <DotsHorizontalIcon className="h-4 w-4 " />
              </Button>
            </CompanyEditDropdownMenu>
          )}
        </div>
        <Separator className="my-4" />
        {currentSegment && <CompanyDataTable segment={currentSegment} key={currentSegment.id} />}
      </div>
      <SegmentEditDialog
        entity="company"
        isOpen={open}
        onClose={handleOnClose}
        onSubmit={handleOnSubmit}
        segment={currentSegment}
      />
    </>
  );
};

CompanyListContentInner.displayName = 'CompanyListContentInner';

export const CompanyListContent = (props: {
  environmentId: string | undefined;
}) => {
  const { environmentId } = props;

  if (!environmentId) {
    return null;
  }

  return (
    <CompanyListProvider environmentId={environmentId}>
      <CompanyListContentInner environmentId={environmentId} />
    </CompanyListProvider>
  );
};

CompanyListContent.displayName = 'CompanyListContent';
