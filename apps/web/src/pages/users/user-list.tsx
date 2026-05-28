import { EntityListPage } from '@/components/biz/entity-list-page';
import { USER_CONFIG } from '@/components/biz/entity-config';

export const UserList = () => <EntityListPage config={USER_CONFIG} />;

UserList.displayName = 'UserList';
