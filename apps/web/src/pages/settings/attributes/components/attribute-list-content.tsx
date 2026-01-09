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
    <>
      <div className="rounded-md border-none">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead>Display name</TableHead>
              <TableHead>Code name</TableHead>
              <TableHead className="w-32">Data type</TableHead>
              <TableHead className="w-60">CreatedAt</TableHead>
              <TableHead className="w-24" />
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
                  <TableCell>
                    {attribute.dataType === 1 && 'Number'}
                    {attribute.dataType === 2 && 'String'}
                    {attribute.dataType === 3 && 'Boolean'}
                    {attribute.dataType === 4 && 'List'}
                    {attribute.dataType === 5 && 'DateTime'}
                    {attribute.dataType === 6 && 'RandomAB'}
                    {attribute.dataType === 7 && 'RandomNumber'}
                  </TableCell>
                  <TableCell>{format(new Date(attribute.createdAt), 'PPpp')}</TableCell>
                  <TableCell>
                    <AttributeListAction attribute={attribute} />
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

AttributeListContent.displayName = 'AttributeListContent';
