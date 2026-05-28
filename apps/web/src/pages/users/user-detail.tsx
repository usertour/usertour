import { EntityDetailPage } from '@/components/biz/entity-detail-page';
import { USER_CONFIG } from '@/components/biz/entity-config';

export const UserDetail = () => <EntityDetailPage config={USER_CONFIG} />;

UserDetail.displayName = 'UserDetail';
