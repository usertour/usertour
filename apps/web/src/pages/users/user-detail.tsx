import { EntityDetailPage } from '@/components/segments/entity/entity-detail-page';
import { USER_CONFIG } from '@/components/segments/entity/entity-config';

export const UserDetail = () => <EntityDetailPage config={USER_CONFIG} />;

UserDetail.displayName = 'UserDetail';
