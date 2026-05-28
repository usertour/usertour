import { EntityListPage } from '@/components/biz/entity-list-page';
import { COMPANY_CONFIG } from '@/components/biz/entity-config';

export const CompanyList = () => <EntityListPage config={COMPANY_CONFIG} />;

CompanyList.displayName = 'CompanyList';
