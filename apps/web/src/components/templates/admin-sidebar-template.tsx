import { Button, buttonVariants, type ButtonProps } from "@usertour-ui/button";
import { cn } from "@usertour-ui/ui-utils";
import { Link } from "react-router-dom";

export const AdminSidebarContainerTemplate = (props: {
  children: React.ReactNode;
}) => {
  const { children } = props;
  return (
    <div className="group peer text-foreground">
      <div className="duration-200 bg-white border-gray-200/60 dark:bg-card dark:border-border/40 dark:shadow-inner dark:shadow-black/20 inset-y-0 z-10 hidden h-full w-[15rem] transition-[left,right,width] ease-linear md:flex left-0 border-r ">
        <div className="flex h-full w-full flex-col bg-background/10 dark:bg-background/80 ">
          {children}
        </div>
      </div>
    </div>
  );
};

AdminSidebarContainerTemplate.displayName = "AdminSidebarContainerTemplate";

export const AdminSidebarHeaderTemplate = (props: {
  children: React.ReactNode;
}) => {
  const { children } = props;
  return (
    <div className="pt-4 pb-[18px] min-h-[66.86px] sidebar-header gap-2 flex items-center justify-between w-full border-b border-b-gray-200/30 dark:border-b-accent/5 !pl-5 !pr-3 bg-gradient-to-br dark:from-primary-modified/[6%] dark:to-transparent !text-[17px] text-foreground dark:text-gray-200">
      {children}
    </div>
  );
};

AdminSidebarHeaderTemplate.displayName = "AdminSidebarHeaderTemplate";

export const AdminSidebarFooterTemplate = (props: {
  children: React.ReactNode;
}) => {
  const { children } = props;
  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex w-full min-w-0 flex-col p-2 px-3">
        {children}
      </div>
    </div>
  );
};

AdminSidebarFooterTemplate.displayName = "AdminSidebarFooterTemplate";

export const AdminSidebarFooterTextItemTemplate = (props: {
  children: React.ReactNode;
}) => {
  const { children } = props;
  return (
    <div className="duration-200 flex pointer-events-none h-7 shrink-0 items-center rounded-md px-2 text-xs font-medium dark:text-foreground/70 text-foreground/80 outline-none ring-sidebar-ring transition-[margin,opa] ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0 ">
      {children}
    </div>
  );
};

AdminSidebarFooterTextItemTemplate.displayName =
  "AdminSidebarFooterTextItemTemplate";

export const AdminSidebarFooterLinkItemTemplate = (props: {
  children: React.ReactNode;
  href: string;
  target?: string;
}) => {
  const { children, href, target } = props;
  return (
    <Link
      to={href}
      className="inline-flex main-transition whitespace-nowrap font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-transparent shadow-none select-none focus:!ring-0 dark:foucs:!ring-0 focus:outline-none dark:shadow-none items-center !text-[13px] w-full hover:bg-gray-200/40 dark:hover:bg-secondary/60 !text-foreground hover:!text-gray-600 dark:!text-foreground dark:hover:!text-dark-accent-foreground h-8 rounded-md px-2 text-xs justify-start"
      target={target}
    >
      {children}
    </Link>
  );
};

AdminSidebarFooterLinkItemTemplate.displayName =
  "AdminSidebarFooterLinkItemTemplate";

export const AdminSidebarBodyTemplate = (props: {
  children: React.ReactNode;
}) => {
  const { children } = props;
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto custom-scrollbar">
      <div className="relative flex w-full min-w-0 flex-col p-2 px-3">
        {children}
      </div>
    </div>
  );
};

AdminSidebarBodyTemplate.displayName = "AdminSidebarBodyTemplate";

export const AdminSidebarBodyTitleTemplate = (props: {
  children: React.ReactNode;
}) => {
  const { children } = props;
  return (
    <div className="duration-200 flex pointer-events-none h-7 shrink-0 items-center rounded-md px-2 text-xs font-medium dark:text-foreground/70 text-foreground/60 outline-none ring-sidebar-ring transition-[margin,opa] ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0 ">
      {children}
    </div>
  );
};

AdminSidebarBodyTitleTemplate.displayName = "AdminSidebarBodyTitleTemplate";

export const AdminSidebarBodyItemTemplate = (props: ButtonProps) => {
  const { children, className, ...buttonProps } = props;
  return (
    <Button
      {...buttonProps}
      className={cn(
        "inline-flex main-transition whitespace-nowrap font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-transparent shadow-none select-none focus:!ring-0 dark:foucs:!ring-0 focus:outline-none dark:shadow-none items-center !text-[13px] w-full hover:bg-gray-200/40 dark:hover:bg-secondary/60 !text-foreground hover:!text-gray-600 dark:!text-foreground dark:hover:!text-dark-accent-foreground h-8 rounded-md px-2 text-xs justify-start",
        className
      )}
    >
      {children}
    </Button>
  );
};

AdminSidebarBodyItemTemplate.displayName = "AdminSidebarBodyItemTemplate";
