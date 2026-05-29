import { EntityDetailPage } from '@/components/segments/entity/entity-detail-page';
import { COMPANY_CONFIG } from '@/components/segments/entity/entity-config';

export const CompanyDetail = () => <EntityDetailPage config={COMPANY_CONFIG} />;

CompanyDetail.displayName = 'CompanyDetail';
