import { useAppContext } from '@/contexts/app-context';
import { useContentDetailUI } from '@/contexts/content-detail-ui-context';
import { useContentDetail } from '@/hooks/use-content-detail';
import { useEnvironmentList } from '@/hooks/use-environment-list';
import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import { PlaneIcon, UnPublishIcon } from '@usertour/icons';
import {
  Button,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  ListSkeleton,
  QuestionTooltip,
  Separator,
} from '@usertour/ui';
import { cn } from '@usertour/tailwind';
import { format } from 'date-fns';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ContentPublishForm } from '../../../shared/content-publish-form';
import { ContentUnpublishForm } from '../../../shared/content-unpublish-form';

/**
 * The "now" layer of the versions tab: one row per project environment with
 * this content's live state there. Bounded by the environment count (plan
 * capped at 1–3, unlimited only on Business), so the card has a small,
 * predictable height — the publish-history stream stacks below it.
 */
export const EnvironmentsCard = () => {
  const { t } = useTranslation();
  const { contentId } = useContentDetailUI();
  const { content } = useContentDetail(contentId);
  const { environmentList } = useEnvironmentList();
  const { isViewOnly } = useAppContext();
  const [openPublish, setOpenPublish] = useState(false);
  const [openUnpublish, setOpenUnpublish] = useState(false);

  if (!content || !environmentList) {
    return (
      <Card className="flex flex-col p-4 space-y-4 w-full">
        <h3 className="text-lg font-medium flex items-center gap-1">
          {t('contents.environments.title')}
          <QuestionTooltip>{t('contents.environments.tooltip')}</QuestionTooltip>
        </h3>
        <Separator />
        <ListSkeleton length={2} />
      </Card>
    );
  }

  const draftSequence = content.editedVersion?.sequence;
  const rows = environmentList.map((env) => {
    const coe = (content.contentOnEnvironments ?? []).find(
      (item) => item.environmentId === env.id && item.published && item.publishedVersion,
    );
    return { env, coe };
  });

  return (
    <Card className="flex flex-col p-4 space-y-4 w-full">
      <h3 className="text-lg font-medium flex items-center gap-1">
        {t('contents.environments.title')}
        <QuestionTooltip>{t('contents.environments.tooltip')}</QuestionTooltip>
      </h3>
      <Separator />

      <div className="flex flex-col">
        {rows.map(({ env, coe }) => {
          const liveSequence = coe?.publishedVersion?.sequence;
          const behindDraft =
            liveSequence !== undefined &&
            draftSequence !== undefined &&
            draftSequence > liveSequence;
          return (
            <div key={env.id} className="group flex items-center gap-3 px-3 py-2">
              <span
                aria-hidden
                className={cn(
                  'h-2 w-2 shrink-0 rounded-full ring-2',
                  coe ? 'bg-success ring-success/30' : 'bg-background dark:bg-muted ring-border/80',
                )}
              />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{env.name}</span>
              {coe ? (
                <span className="flex min-w-0 items-baseline gap-2">
                  {behindDraft && (
                    <span className="inline-flex items-center rounded-md bg-warning/15 px-1.5 py-0.5 text-[11px] font-medium text-warning">
                      {t('contents.environments.draftAhead', {
                        version: (draftSequence ?? 0) + 1,
                      })}
                    </span>
                  )}
                  <span className="text-sm font-medium tabular-nums">
                    v{(liveSequence ?? 0) + 1}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {t('contents.environments.since', {
                      date: format(new Date(coe.publishedAt), 'PP'),
                    })}
                  </span>
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {t('contents.environments.notPublished')}
                </span>
              )}
              <div className="text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex h-8 w-8 p-0 data-[state=open]:bg-muted">
                      <DotsHorizontalIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="cursor-pointer"
                      disabled={isViewOnly}
                      onClick={() => setOpenPublish(true)}
                    >
                      <PlaneIcon className="mr-2 h-4 w-4" />
                      {t('contents.versions.action.publish')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      disabled={isViewOnly || !coe}
                      onClick={() => setOpenUnpublish(true)}
                    >
                      <UnPublishIcon className="mr-2 h-4 w-4" />
                      {t('contents.shared.menu.unpublish')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </div>

      {/* Both dialogs are content-level (they carry their own environment
          checkboxes), so one instance serves every row. */}
      <ContentPublishForm
        versionId={content.editedVersionId ?? ''}
        open={openPublish}
        onOpenChange={setOpenPublish}
        onSubmit={() => setOpenPublish(false)}
      />
      <ContentUnpublishForm
        content={content}
        open={openUnpublish}
        onOpenChange={setOpenUnpublish}
        onSuccess={() => setOpenUnpublish(false)}
      />
    </Card>
  );
};

EnvironmentsCard.displayName = 'EnvironmentsCard';
