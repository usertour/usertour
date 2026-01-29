import { ListSkeleton } from '@/components/molecules/skeleton';
import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { Attribute } from '@usertour/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@usertour-packages/table';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { AttributeListAction } from './attribute-list-action';

interface AttributeListContentProps {
  bizType: number;
}

export const AttributeListContent = (props: AttributeListContentProps) => {
  const { bizType } = props;
  const { attributeList, loading } = useAttributeListContext();
  const [attributes, setAttributes] = useState<Attribute[]>([]);

  useEffect(() => {
    if (attributeList) {
      setAttributes(attributeList?.filter((attr) => attr.bizType === bizType));
    }
  }, [attributeList, bizType]);

  if (loading) {
    return <ListSkeleton />;
  }

  return (
    <div className="overflow-x-auto">
      <Table className="table-fixed min-w-2xl">
        <TableHeader>
          <TableRow>
            <TableHead>Display name</TableHead>
            <TableHead>Code name</TableHead>
            <TableHead className="w-28 hidden sm:table-cell">Data type</TableHead>
            <TableHead className="w-48 hidden lg:table-cell">CreatedAt</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {attributes ? (
            attributes?.map((attribute: Attribute) => (
              <TableRow className="cursor-pointer" key={attribute.id} onClick={() => {}}>
                <TableCell className="truncate">
                  {attribute.description ? (
                    <div className="flex flex-col">
                      <span className="truncate">{attribute.displayName}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {attribute.description}
                      </span>
                    </div>
                  ) : (
                    attribute.displayName
                  )}
                </TableCell>
                <TableCell className="truncate">{attribute.codeName}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  {attribute.dataType === 1 && 'Number'}
                  {attribute.dataType === 2 && 'String'}
                  {attribute.dataType === 3 && 'Boolean'}
                  {attribute.dataType === 4 && 'List'}
                  {attribute.dataType === 5 && 'DateTime'}
                  {attribute.dataType === 6 && 'RandomAB'}
                  {attribute.dataType === 7 && 'RandomNumber'}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {format(new Date(attribute.createdAt), 'PPpp')}
                </TableCell>
                <TableCell>
                  <AttributeListAction attribute={attribute} />
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

AttributeListContent.displayName = 'AttributeListContent';
