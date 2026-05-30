import { EntityListPage } from '@/components/segments/entity/entity-list-page';
import { COMPANY_CONFIG } from '@/components/segments/entity/entity-config';

export const CompanyList = () => <EntityListPage config={COMPANY_CONFIG} />;

CompanyList.displayName = 'CompanyList';
