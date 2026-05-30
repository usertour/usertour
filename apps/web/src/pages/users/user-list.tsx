import { EntityListPage } from '@/components/segments/entity/entity-list-page';
import { USER_CONFIG } from '@/components/segments/entity/entity-config';

export const UserList = () => <EntityListPage config={USER_CONFIG} />;

UserList.displayName = 'UserList';
