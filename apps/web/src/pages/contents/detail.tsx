import { ContentTypeName } from '@usertour-ui/types';
import { useParams } from 'react-router-dom';
import { BannerDetail } from './banner/detail';
import { ChecklistDetail } from './checklist/detail';
import { FlowDetail } from './components/detail/flow-detail';
import { LauncherDetail } from './launcher/launcher-detail';

export const ContentDetail = () => {
  const { contentId = '', contentType, type } = useParams();

  if (!type) {
    return <></>;
  }

  if (contentType === ContentTypeName.FLOWS) {
    return <FlowDetail contentId={contentId} type={type} />;
  }

  if (contentType === ContentTypeName.LAUNCHERS) {
    return <LauncherDetail contentId={contentId} type={type} />;
  }

  if (contentType === ContentTypeName.CHECKLISTS) {
    return <ChecklistDetail contentId={contentId} type={type} />;
  }

  if (contentType === ContentTypeName.BANNERS) {
    return <BannerDetail contentId={contentId} type={type} />;
  }
};

ContentDetail.displayName = 'ContentDetail';
