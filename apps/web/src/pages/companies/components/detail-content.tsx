import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useCompanyListContext } from '@/contexts/company-list-context';
import { ArrowLeftIcon, DotsHorizontalIcon } from '@radix-ui/react-icons';
import { CompanyIcon, UserProfile, Delete2Icon, SpinnerIcon } from '@usertour-ui/icons';
import { AttributeBizTypes, BizCompany, BizUser, BizUserOnCompany } from '@usertour-ui/types';
import { useEffect, useState, createContext, useContext, ReactNode, Fragment } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { IdCardIcon, CalendarIcon, ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons';
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
import { TruncatedText } from '@/components/molecules/truncated-text';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@usertour-ui/table';
import { ReloadIcon } from '@radix-ui/react-icons';
import { cn } from '@usertour-ui/ui-utils';
import { UserAvatar } from '@/components/molecules/user-avatar';
import { useQuery } from '@apollo/client';
import { queryBizUser } from '@usertour-ui/gql';
import { PaginationState } from '@tanstack/react-table';
import { ListSkeleton } from '@/components/molecules/skeleton';

// Company User List Context
interface CompanyUserListContextValue {
  contents: BizUser[];
  loading: boolean;
  totalCount: number;
  loadMore: () => void;
  refetch: () => void;
  hasNextPage: boolean;
  setPagination: (pagination: PaginationState) => void;
  companyId: string;
}

const CompanyUserListContext = createContext<CompanyUserListContextValue | undefined>(undefined);

const useCompanyUserListContext = () => {
  const context = useContext(CompanyUserListContext);
  if (!context) {
    throw new Error('useCompanyUserListContext must be used within a CompanyUserListProvider');
  }
  return context;
};

interface CompanyUserListProviderProps {
  children: ReactNode;
  environmentId: string;
  companyId: string;
}

const CompanyUserListProvider = ({
  children,
  environmentId,
  companyId,
}: CompanyUserListProviderProps) => {
  const [contents, setContents] = useState<BizUser[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [pageInfo, setPageInfo] = useState<any>();

  const { data, refetch, loading } = useQuery(queryBizUser, {
    variables: {
      first:
        pagination.pageIndex === 0
          ? pagination.pageSize
          : pagination.pageSize * (pagination.pageIndex + 1),
      query: { environmentId, companyId },
      orderBy: { field: 'createdAt', direction: 'desc' },
    },
  });

  const bizUserList = data?.queryBizUser;

  useEffect(() => {
    if (!bizUserList) {
      return;
    }
    const { edges, pageInfo: newPageInfo, totalCount } = bizUserList;
    if (!edges || !newPageInfo) {
      return;
    }

    setPageInfo(newPageInfo);
    const newContents = edges.map((e: any) => {
      return { ...e.node, ...e.node.data };
    });

    // Replace data when it's the first page (refresh), accumulate when loading more
    if (pagination.pageIndex === 0) {
      setContents(newContents);
    } else {
      // Always accumulate data - never replace for load more
      setContents((prev) => {
        // Create a Set of existing content IDs to avoid duplicates
        const existingIds = new Set(prev.map((content: any) => content.id));
        const uniqueNewContents = newContents.filter(
          (content: any) => !existingIds.has(content.id),
        );
        return [...prev, ...uniqueNewContents];
      });
    }

    setTotalCount(totalCount);
    setIsLoadingMore(false);
  }, [bizUserList, pagination.pageIndex]);

  const loadMore = () => {
    if (!isLoadingMore && pageInfo?.hasNextPage) {
      setIsLoadingMore(true);
      setPagination((prev) => ({
        ...prev,
        pageIndex: prev.pageIndex + 1,
      }));
    }
  };

  const value: CompanyUserListContextValue = {
    contents,
    loading: loading || isLoadingMore,
    totalCount,
    loadMore,
    refetch,
    companyId,
    hasNextPage: pageInfo?.hasNextPage || false,
    setPagination,
  };

  return (
    <CompanyUserListContext.Provider value={value}>{children}</CompanyUserListContext.Provider>
  );
};

// Helper function to get membership attributes for a user
const getMembershipAttributes = (
  user: BizUser,
  companyId: string,
  attributeList: any[] | undefined,
) => {
  if (!user.bizUsersOnCompany || !attributeList) {
    return [];
  }

  // Find the membership for this specific company
  const membership = user.bizUsersOnCompany.find(
    (m: BizUserOnCompany) => m.bizCompany?.id === companyId,
  );
  if (!membership || !membership.data) {
    return [];
  }

  const membershipData = membership.data;
  const membershipAttributes = attributeList.filter(
    (attr) => attr.bizType === AttributeBizTypes.Membership,
  );

  return Object.entries(membershipData)
    .filter(([key]) => membershipAttributes.some((attr) => attr.codeName === key))
    .map(([key, value]) => {
      const attr = membershipAttributes.find((attr) => attr.codeName === key);
      return {
        name: attr?.displayName || key,
        value: typeof value === 'string' ? value : JSON.stringify(value),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
};

// Helper function to sort membership data entries
const sortMembershipDataEntries = (data: Record<string, any>, attributes: any[]) => {
  return Object.entries(data || {}).sort(([keyA], [keyB]) => {
    // Find attributes in attributeList to determine order
    const attrA = attributes?.find((attr) => attr.codeName === keyA);
    const attrB = attributes?.find((attr) => attr.codeName === keyB);

    // If both are in attributeList, sort by their order in the list
    if (attrA && attrB && attributes) {
      const indexA = attributes.indexOf(attrA);
      const indexB = attributes.indexOf(attrB);
      return indexA - indexB;
    }

    // If only one is in attributeList, prioritize the one in the list
    if (attrA && !attrB) return -1;
    if (!attrA && attrB) return 1;

    // If neither is in attributeList, sort alphabetically
    return keyA.localeCompare(keyB);
  });
};

// Helper function to get membership data for a user
const getMembershipData = (user: BizUser, companyId: string) => {
  if (!user.bizUsersOnCompany) {
    return null;
  }

  const membership = user.bizUsersOnCompany.find(
    (m: BizUserOnCompany) => m.bizCompany?.id === companyId,
  );
  return membership?.data || null;
};

// --- CompanyUserList components ---
const LoadMoreButton = () => {
  const { loading, hasNextPage, loadMore } = useCompanyUserListContext();

  if (!hasNextPage) {
    return null;
  }

  return (
    <div className="flex justify-center mt-4">
      <Button
        onClick={loadMore}
        disabled={loading}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <div className="flex items-center space-x-2">
            <SpinnerIcon className="w-4 h-4 animate-spin" />
            <span>Loading...</span>
          </div>
        ) : (
          'Load More Users'
        )}
      </Button>
    </div>
  );
};

const CompanyUserList = () => {
  const { contents, loading, refetch, totalCount, setPagination, companyId } =
    useCompanyUserListContext();
  const { attributeList } = useAttributeListContext();
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const handleRowClick = (id: string) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  const handleRefresh = () => {
    // Reset pagination to first page when refreshing
    setPagination({ pageIndex: 0, pageSize: 10 });
    refetch();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Company Users ({totalCount})</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleRefresh}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <ReloadIcon className={cn('w-4 h-4', loading && 'animate-spin')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reload</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        {loading && contents.length === 0 ? (
          <ListSkeleton length={5} />
        ) : contents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <img src="/images/rocket.png" alt="No users" className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-muted-foreground text-center">No users found for this company.</p>
          </div>
        ) : (
          <div className="flex flex-col w-full grow">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/2">User</TableHead>
                  <TableHead className="w-1/2">Membership Attributes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contents.map((user: BizUser) => {
                  const membershipAttributes = getMembershipAttributes(
                    user,
                    companyId,
                    attributeList,
                  );
                  const membershipData = getMembershipData(user, companyId);
                  const hasMembershipData =
                    membershipData && Object.keys(membershipData).length > 0;

                  return (
                    <Fragment key={user.id}>
                      <TableRow
                        className={cn(
                          'cursor-pointer h-12 group transition-colors hover:bg-muted data-[state=selected]:bg-muted',
                          hasMembershipData && 'hover:bg-muted',
                        )}
                        onClick={() => hasMembershipData && handleRowClick(user.id)}
                      >
                        <TableCell className="w-1/2">
                          <Link to={`/env/${user.environmentId}/user/${user.id}`}>
                            <div className="flex items-center gap-2 hover:text-primary underline-offset-4 hover:underline">
                              <UserAvatar
                                email={user.data?.email || ''}
                                name={user.data?.name || ''}
                                size="sm"
                              />
                              <span>{user.data?.email || user.externalId}</span>
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell className="w-1/2">
                          {hasMembershipData ? (
                            <div className="flex justify-between items-center">
                              <div className="space-y-1">
                                {membershipAttributes.slice(0, 2).map((attr, index) => (
                                  <div key={index} className="text-sm">
                                    <span className="font-medium text-muted-foreground">
                                      {attr.name}:
                                    </span>{' '}
                                    <span>{attr.value}</span>
                                  </div>
                                ))}
                                {membershipAttributes.length > 2 && (
                                  <div className="text-xs text-muted-foreground">
                                    +{membershipAttributes.length - 2} more attributes
                                  </div>
                                )}
                              </div>
                              {expandedRowId === user.id ? (
                                <ChevronUpIcon className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                              ) : (
                                <ChevronDownIcon className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              No membership attributes
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                      {expandedRowId === user.id && membershipData && (
                        <TableRow>
                          <TableCell colSpan={2} className="bg-gray-50 p-4">
                            <div className="text-sm">
                              {sortMembershipDataEntries(membershipData, attributeList || []).map(
                                ([key, value]) => (
                                  <div key={key} className="py-2 border-b flex flex-row">
                                    <span className="font-medium w-[200px] flex-none">
                                      {attributeList?.find((attr) => attr.codeName === key)
                                        ?.displayName || key}
                                    </span>
                                    <span className="grow">
                                      {typeof value === 'string' ? value : JSON.stringify(value)}
                                    </span>
                                  </div>
                                ),
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <LoadMoreButton />
      </CardContent>
    </Card>
  );
};

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
  const { contents } = useCompanyListContext();
  const [bizCompany, setBizCompany] = useState<BizCompany>();
  const [bizCompanyAttributes, setBizCompanyAttributes] = useState<any[]>([]);
  const { attributeList } = useAttributeListContext();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (!contents) {
      return;
    }
    const company = contents.find((c: any) => c.id === companyId);
    if (company) {
      setBizCompany(company);
    }
  }, [contents, companyId]);

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
                  <TruncatedText text={bizCompany?.externalId || ''} maxLength={15} />
                </div>
                <div className="flex items-center space-x-2">
                  <TooltipIcon icon={CompanyIcon} tooltip="Name" />
                  <TruncatedText
                    text={bizCompany?.data?.name || 'Unnamed company'}
                    maxLength={20}
                  />
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
                  <div className="w-1/2">
                    <TruncatedText text={name} maxLength={15} />
                  </div>
                  <div className="w-1/2">
                    <TruncatedText text={`${value}`} maxLength={15} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right column - user list */}
        <div className="flex flex-col w-[800px]">
          <CompanyUserListProvider environmentId={environmentId} companyId={companyId}>
            <CompanyUserList />
          </CompanyUserListProvider>
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
