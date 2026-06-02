export const SidebarHeader = (props: { title: string }) => {
  const { title } = props;

  return <div className="grow leading-6 text-base truncate ...">{title}</div>;
};
SidebarHeader.displayName = 'SidebarHeader';
