import { useAttributeListContext } from "@/contexts/attribute-list-context";
import { useCompanyListContext } from "@/contexts/company-list-context";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { CompanyIcon, UserProfile } from "@usertour-ui/icons";
import { AttributeBizTypes, BizCompany } from "@usertour-ui/types";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

interface CompanyDetailContentProps {
  environmentId: string;
  companyId: string;
}

export function CompanyDetailContent(props: CompanyDetailContentProps) {
  const { environmentId, companyId } = props;
  const navigator = useNavigate();
  const { bizCompanyList } = useCompanyListContext();
  const [bizCompany, setBizCompany] = useState<BizCompany>();
  const [bizCompanyAttributes, setBizCompanyAttributes] = useState<any[]>([]);
  const { attributeList } = useAttributeListContext();

  useEffect(() => {
    if (!bizCompanyList) {
      return;
    }
    const { edges, pageInfo } = bizCompanyList;
    if (!edges || !pageInfo) {
      return;
    }
    const company = edges.find((c: any) => c.node.id == companyId);
    if (company && company.node) {
      setBizCompany(company.node);
    }
  }, [bizCompanyList, companyId]);

  useEffect(() => {
    if (attributeList && bizCompany) {
      let attrs = [];
      for (const key in bizCompany.data) {
        const value = (bizCompany.data as any)[key];
        const userAttr = attributeList?.find(
          (attr) =>
            attr.bizType == AttributeBizTypes.Company && attr.codeName == key
        );
        if (userAttr) {
          attrs.push({
            name: userAttr.displayName || userAttr.codeName,
            value,
          });
        }
      }
      setBizCompanyAttributes(attrs);
    }
  }, [bizCompany, attributeList]);

  return (
    <>
      <div className="border-b bg-white flex-col md:flex w-full fixed">
        <div className="flex h-16 items-center px-4">
          <ArrowLeftIcon
            className="ml-4 h-6 w-8 cursor-pointer"
            onClick={() => {
              navigator(`/env/${environmentId}/companies`);
            }}
          />
          <span>{bizCompany?.externalId}</span>
        </div>
      </div>
      <div className="flex flex-row p-14 mt-12 space-x-8 justify-center ">
        <div className="flex flex-col w-[550px] flex-none space-y-4">
          <div className="flex-1 px-4 py-6 grow shadow bg-white rounded-lg">
            <div className="mb-2 flex flex-row items-center font-bold	">
              <CompanyIcon width={18} height={18} className="mr-2" />
              Company details
            </div>
            <div className="flex flex-col space-y-2 text-sm py-2">
              <div>ID: {bizCompany?.externalId}</div>
              <div>createdAt: {bizCompany?.createdAt}</div>
              <div>Email: {bizCompany?.externalId}</div>
            </div>
          </div>
          <div className="flex-1 px-4 py-6 grow shadow bg-white rounded-lg">
            <div className="mb-2 flex flex-row items-center font-bold	">
              <UserProfile width={18} height={18} className="mr-2" />
              Company attributes
            </div>
            <div className="flex flex-row border-b py-2 text-sm opacity-80">
              <div className="w-1/2 ">Name</div>
              <div className="w-1/2 ">Value</div>
            </div>
            {bizCompanyAttributes.map(({ name, value }, key) => (
              <div className="flex flex-row py-2 text-sm" key={key}>
                <div className="w-1/2">{name}</div>
                <div className="w-1/2">{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col w-[800px]">
          <div className="flex-1 px-4 py-6 grow shadow bg-white rounded-lg">
            <div className="mb-2 flex flex-row items-center font-bold	">
              <CompanyIcon width={18} height={18} className="mr-2" />
              Company sessions
            </div>
            <div className="flex flex-col items-center w-full h-full justify-center">
              <img src="/images/rocket.png" />
              <div className="text-muted-foreground text-base	">
                Coming soon!
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

CompanyDetailContent.displayName = "CompanyDetailContent";
