import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useTranslation } from 'react-i18next';
import { BizUser } from '@usertour/types';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@usertour-packages/table';
import { DefaultAvatar } from '@/components/molecules/default-avatar';
import { MembershipRow } from '@/components/molecules/membership-row';

interface UserCompaniesTabProps {
  bizUser: BizUser;
  environmentId: string;
}

export const UserCompaniesTab = ({ bizUser, environmentId }: UserCompaniesTabProps) => {
  const { t } = useTranslation();
  const { attributeList } = useAttributeListContext();
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);

  const companies = bizUser.bizUsersOnCompany || [];

  if (companies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <img src="/images/rocket.png" alt="No companies" className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-muted-foreground text-center">
          {t('users.detail.companies.noCompanies')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full grow">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-2/5">{t('users.detail.companies.company')}</TableHead>
            <TableHead className="w-3/5">{t('common.membership.attributes')}</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((membership) => {
            const company = membership.bizCompany;
            if (!company) return null;

            const isExpanded = expandedCompanyId === company.id;

            const identity = (
              <div className="flex items-center gap-2 min-w-0">
                <DefaultAvatar
                  seed={company.externalId || company.data?.name || ''}
                  name={company.data?.name}
                  size="sm"
                />
                <Link
                  to={`/env/${environmentId}/company/${company.id}`}
                  className="truncate hover:text-primary underline-offset-4 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {company.data?.name || company.externalId}
                </Link>
              </div>
            );

            return (
              <MembershipRow
                key={company.id}
                identity={identity}
                membershipData={membership.data as Record<string, unknown> | null | undefined}
                attributeList={attributeList}
                isExpanded={isExpanded}
                onToggle={() => setExpandedCompanyId(isExpanded ? null : company.id)}
                colSpan={3}
              />
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

UserCompaniesTab.displayName = 'UserCompaniesTab';
