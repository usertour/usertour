import { EntityDetailPage } from '@/components/biz/entity-detail-page';
import { COMPANY_CONFIG } from '@/components/biz/entity-config';

export const CompanyDetail = () => <EntityDetailPage config={COMPANY_CONFIG} />;

CompanyDetail.displayName = 'CompanyDetail';
