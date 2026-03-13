import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useTranslation } from 'react-i18next';
import { AttributeBizTypes, AttributeDataType, BizUser, BizUserOnCompany } from '@usertour/types';
import { useState, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDownIcon, ChevronUpIcon, CopyIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { CompanyIcon } from '@usertour-packages/icons';
import { formatAttributeValue } from '@/utils/common';
import { TruncatedText } from '@/components/molecules/truncated-text';
import { useCopyWithToast } from '@/hooks/use-copy-with-toast';

interface UserCompaniesTabProps {
  bizUser: BizUser;
  environmentId: string;
}

export const UserCompaniesTab = ({ bizUser, environmentId }: UserCompaniesTabProps) => {
  const { t } = useTranslation();
  const { attributeList } = useAttributeListContext();
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(10);
  const copyWithToast = useCopyWithToast();

  const companies = bizUser.bizUsersOnCompany || [];
  const visibleCompanies = companies.slice(0, displayCount);
  const hasMore = displayCount < companies.length;

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

  const getMembershipAttributes = (membership: BizUserOnCompany) => {
    if (!membership.data || !attributeList) return [];

    const membershipAttrs = attributeList.filter(
      (attr) => attr.bizType === AttributeBizTypes.Membership,
    );

    return Object.entries(membership.data as Record<string, any>)
      .filter(([key]) => membershipAttrs.some((attr) => attr.codeName === key))
      .map(([key, value]) => {
        const attr = membershipAttrs.find((a) => a.codeName === key);
        return {
          name: attr?.displayName || key,
          value,
          dataType: attr?.dataType || AttributeDataType.String,
          codeName: key,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  return (
    <div className="flex flex-col w-full">
      {visibleCompanies.map((membership) => {
        const company = membership.bizCompany;
        if (!company) return null;

        const attrs = getMembershipAttributes(membership);
        const hasMembershipData = attrs.length > 0;
        const isExpanded = expandedCompanyId === company.id;

        return (
          <Fragment key={company.id}>
            <div
              className="flex items-start p-4 border-b cursor-pointer hover:bg-muted/30 gap-4"
              onClick={() =>
                hasMembershipData && setExpandedCompanyId(isExpanded ? null : company.id)
              }
            >
              {/* Company identity */}
              <div className="flex items-center gap-2 w-2/5 min-w-0">
                <CompanyIcon className="w-5 h-5 flex-none text-muted-foreground" />
                <Link
                  to={`/env/${environmentId}/company/${company.id}`}
                  className="truncate hover:text-primary underline-offset-4 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {company.data?.name || company.externalId}
                </Link>
              </div>

              {/* Membership attributes summary */}
              <div className="w-3/5 min-w-0">
                {hasMembershipData ? (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      {t('users.detail.companies.membershipAttributes')}
                    </div>
                    {attrs.slice(0, 2).map((attr, index) => {
                      const formattedValue = formatAttributeValue(attr.value, attr.dataType);
                      return (
                        <div key={index} className="text-sm flex items-center gap-1.5 min-w-0">
                          <div className="font-medium text-muted-foreground flex-none w-28 truncate">
                            {attr.name}:
                          </div>
                          <div className="flex-1 min-w-0 truncate">{formattedValue}</div>
                        </div>
                      );
                    })}
                    {attrs.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{attrs.length - 2} more attributes
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">
                    {t('users.detail.companies.noMembershipAttributes')}
                  </span>
                )}
              </div>

              {/* Expand indicator */}
              <div className="w-6 flex items-center justify-center flex-none">
                {hasMembershipData &&
                  (isExpanded ? (
                    <ChevronUpIcon className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                  ))}
              </div>
            </div>

            {/* Expanded membership attributes */}
            {isExpanded && (
              <div className="bg-muted/50 text-sm">
                {attrs.map((attr) => {
                  const formattedValue = formatAttributeValue(attr.value, attr.dataType);
                  const isDateTime = attr.dataType === AttributeDataType.DateTime;
                  const textToCopy = String(isDateTime ? attr.value : formattedValue);

                  return (
                    <div
                      key={attr.codeName}
                      className="group flex flex-row border-b last:border-0 min-w-0"
                    >
                      <div className="font-medium w-2/5 min-w-0 p-2 leading-6">
                        <div className="break-words">{attr.name}</div>
                      </div>
                      <div className="w-3/5 min-w-0 p-2 break-words leading-6">
                        {isDateTime ? (
                          <TruncatedText
                            text={formattedValue}
                            className="max-w-full"
                            rawValue={attr.value}
                          />
                        ) : (
                          formattedValue
                        )}
                      </div>
                      <Button
                        variant={'ghost'}
                        size={'icon'}
                        className="w-6 h-6 m-2 rounded invisible group-hover:visible flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyWithToast(textToCopy);
                        }}
                      >
                        <CopyIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </Fragment>
        );
      })}

      {hasMore && (
        <div className="flex justify-center mt-4">
          <Button
            onClick={() => setDisplayCount((prev) => prev + 10)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {t('activityFeed.loadMore')}
          </Button>
        </div>
      )}
    </div>
  );
};

UserCompaniesTab.displayName = 'UserCompaniesTab';
