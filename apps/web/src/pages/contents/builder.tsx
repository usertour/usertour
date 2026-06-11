import { useAppContext } from '@/contexts/app-context';
import { Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ContentDetailBuilder } from './components/detail/content-detail-builder';
import { ContentLoading } from '@usertour/ui';

// First path segments of every builder descendant view (flow's step/trigger,
// resource center's tab, checklist's item, launcher's target/tooltip). Used
// to recognize legacy URLs below — version ids are cuids and can never
// collide with these words.
const BUILDER_VIEW_SEGMENTS = new Set(['step', 'trigger', 'tab', 'item', 'target', 'tooltip']);

export const ContentBuilder = () => {
  const params = useParams();
  const { envId = '', contentId = '', contentType } = params;
  const splat = params['*'] ?? '';
  const { project, environment } = useAppContext();
  const { t } = useTranslation();

  // Legacy builder URLs carried the edited version id after /builder/. The
  // id was never used (the builder always edits content.editedVersion), so
  // strip it and land on the same view.
  const segments = splat.split('/').filter(Boolean);
  if (segments.length > 0 && !BUILDER_VIEW_SEGMENTS.has(segments[0])) {
    const rest = segments.slice(1).join('/');
    return (
      <Navigate
        to={`/env/${envId}/${contentType}/${contentId}/builder${rest ? `/${rest}` : ''}`}
        replace
      />
    );
  }

  if (!project || !project.id || !contentId || !environment || !contentType) {
    return <ContentLoading message={t('common.loading')} className="min-h-screen" />;
  }

  return (
    <ContentDetailBuilder
      contentId={contentId}
      projectId={project.id}
      environmentId={environment.id}
      envToken={environment.token}
      contentType={contentType}
    />
  );
};

ContentBuilder.displayName = 'ContentBuilder';
