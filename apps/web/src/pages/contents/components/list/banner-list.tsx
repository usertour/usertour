import { BannerCreateForm } from '../shared/banner-create-form';
import { ContentListLayout } from './content-list-layout';

export const BannerListContent = () => {
  return (
    <ContentListLayout
      title="Banners"
      description="Banners are great for announcements, promotions, and important messages that need to be displayed prominently to users."
      emptyTitle="No banners added"
      emptyDescription="You have not added any banners. Add one below."
      createButtonText="Create Banner"
      createForm={({ isOpen, onClose }) => <BannerCreateForm isOpen={isOpen} onClose={onClose} />}
    />
  );
};

BannerListContent.displayName = 'BannerListContent';
