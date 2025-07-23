import { ListSkeleton } from '@/components/molecules/skeleton';
import { useLocalizationListContext } from '@/contexts/localization-list-context';
import { Badge } from '@usertour-packages/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@usertour-packages/table';
import { Localization } from '@usertour/types';
import { format } from 'date-fns';
import { LocalizationListAction } from './localization-list-action';

export const LocalizationListContent = () => {
  const { localizationList, loading } = useLocalizationListContext();

  if (loading) {
    return <ListSkeleton />;
  }

  return (
    <>
      <div className="rounded-md border-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>CreatedAt</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {localizationList ? (
              localizationList?.map((localization: Localization) => (
                <TableRow className="cursor-pointer" key={localization.id} onClick={() => {}}>
                  <TableCell>{localization.code}</TableCell>
                  <TableCell>
                    {localization.name}{' '}
                    {localization.isDefault && <Badge variant={'success'}>Default</Badge>}
                  </TableCell>
                  <TableCell>{format(new Date(localization.createdAt), 'PPpp')}</TableCell>
                  <TableCell>
                    <LocalizationListAction localization={localization} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell className="h-24 text-center">No results.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

LocalizationListContent.displayName = 'LocalizationListContent';
