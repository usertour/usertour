import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useCompanyListContext } from '@/contexts/company-list-context';
import { ArrowLeftIcon, DotsHorizontalIcon } from '@radix-ui/react-icons';
import { CompanyIcon, UserProfile, Delete2Icon } from '@usertour-ui/icons';
import { AttributeBizTypes, BizCompany } from '@usertour-ui/types';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { IdCardIcon, CalendarIcon } from '@radix-ui/react-icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@usertour-ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@usertour-ui/card';
import { Button } from '@usertour-ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour-ui/dropdown-menu';
import { ContentLoading } from '@/components/molecules/content-loading';
import { BizCompanyDeleteForm } from './company-delete-form';

interface CompanyDetailContentProps {
  environmentId: string;
  companyId: string;
}

// TooltipIcon component to reduce repetitive code
const TooltipIcon = ({
  icon: Icon,
  tooltip,
  className = 'w-4 h-4 text-foreground/60 cursor-help',
}: {
  icon: React.ComponentType<{ className?: string }>;
  tooltip: string;
  className?: string;
}) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Icon className={className} />
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

// Loading wrapper component to handle all loading states
const CompanyDetailContentWithLoading = ({
  environmentId,
  companyId,
}: CompanyDetailContentProps) => {
  const { loading: companyListLoading } = useCompanyListContext();
  const { loading: attributeListLoading } = useAttributeListContext();

  // Check if any provider is still loading
  const isLoading = companyListLoading || attributeListLoading;

  if (isLoading) {
    return <ContentLoading />;
  }

  return <CompanyDetailContentInner environmentId={environmentId} companyId={companyId} />;
};

// Inner component that handles the actual content rendering
const CompanyDetailContentInner = ({ environmentId, companyId }: CompanyDetailContentProps) => {
  const navigator = useNavigate();
  const { bizCompanyList } = useCompanyListContext();
  const [bizCompany, setBizCompany] = useState<BizCompany>();
  const [bizCompanyAttributes, setBizCompanyAttributes] = useState<any[]>([]);
  const { attributeList } = useAttributeListContext();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (!bizCompanyList) {
      return;
    }
    const { edges, pageInfo } = bizCompanyList;
    if (!edges || !pageInfo) {
      return;
    }
    const company = edges.find((c: any) => c.node.id === companyId);
    if (company?.node) {
      setBizCompany(company.node);
    }
  }, [bizCompanyList, companyId]);

  useEffect(() => {
    if (attributeList && bizCompany) {
      const attrs = [];
      for (const key in bizCompany.data) {
        const value = (bizCompany.data as any)[key];
        const companyAttr = attributeList?.find(
          (attr) => attr.bizType === AttributeBizTypes.Company && attr.codeName === key,
        );
        if (companyAttr) {
          attrs.push({
            name: companyAttr.displayName || companyAttr.codeName,
            value,
          });
        }
      }
      setBizCompanyAttributes(attrs);
    }
  }, [bizCompany, attributeList]);

  const handleDeleteSuccess = () => {
    navigator(`/env/${environmentId}/companies`);
  };

  if (!bizCompany) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <img
          src="/images/rocket.png"
          alt="Company not found"
          className="w-16 h-16 mb-4 opacity-50"
        />
        <p className="text-muted-foreground text-center">Company not found.</p>
      </div>
    );
  }

  return (
    <>
      <div className="border-b bg-white flex-row md:flex w-full fixed justify-between items-center">
        <div className="flex h-16 items-center px-4 w-full">
          <ArrowLeftIcon
            className="ml-4 h-6 w-8 cursor-pointer"
            onClick={() => {
              navigator(`/env/${environmentId}/companies`);
            }}
          />
          <span>Company Detail</span>
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary">
                  <span className="sr-only">Actions</span>
                  <DotsHorizontalIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Delete2Icon className="mr-2 h-4 w-4" />
                  Delete Company
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      <div className="flex flex-row p-14 mt-12 space-x-8 justify-center">
        {/* Left column - fixed height */}
        <div className="flex flex-col w-[550px] flex-none space-y-4 h-fit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CompanyIcon width={18} height={18} className="mr-2" />
                Company details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 gap-x-12">
                <div className="flex items-center space-x-2">
                  <TooltipIcon icon={IdCardIcon} tooltip="Company ID" />
                  <span>{bizCompany?.externalId}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <TooltipIcon icon={CompanyIcon} tooltip="Name" />
                  <span>{bizCompany?.data?.name || 'Unnamed company'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <TooltipIcon icon={CalendarIcon} tooltip="Created" />
                  <span>
                    {bizCompany?.createdAt && formatDistanceToNow(new Date(bizCompany?.createdAt))}{' '}
                    ago
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserProfile width={18} height={18} className="mr-2" />
                Company attributes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-row border-b py-2 text-sm opacity-80">
                <div className="w-1/2 ">Name</div>
                <div className="w-1/2 ">Value</div>
              </div>
              {bizCompanyAttributes.map(({ name, value }, key) => (
                <div className="flex flex-row py-2 text-sm" key={key}>
                  <div className="w-1/2">{name}</div>
                  <div className="w-1/2">{`${value}`}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right column - scrollable */}
        <div className="flex flex-col w-[800px]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CompanyIcon width={18} height={18} className="mr-2" />
                Company sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center w-full h-full justify-center py-8">
                <img
                  src="/images/rocket.png"
                  alt="Coming soon"
                  className="w-16 h-16 mb-4 opacity-50"
                />
                <div className="text-muted-foreground text-base">Coming soon!</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <BizCompanyDeleteForm
        bizCompanyIds={bizCompany ? [bizCompany.id] : []}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onSubmit={handleDeleteSuccess}
      />
    </>
  );
};

// Main export component
export function CompanyDetailContent(props: CompanyDetailContentProps) {
  return <CompanyDetailContentWithLoading {...props} />;
}

CompanyDetailContent.displayName = 'CompanyDetailContent';
