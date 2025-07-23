import { ListSkeleton } from '@/components/molecules/skeleton';
import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { Attribute } from '@usertour-packages/types';
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Display name</TableHead>
              <TableHead>Code name</TableHead>
              <TableHead>Data type</TableHead>
              <TableHead>CreatedAt</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {attributes ? (
              attributes?.map((attribute: Attribute) => (
                <TableRow className="cursor-pointer" key={attribute.id} onClick={() => {}}>
                  <TableCell className={attribute.description ? 'flex flex-col' : ''}>
                    {attribute.displayName}
                    {attribute.description && (
                      <span className="text-xs text-gray-500">{attribute.description}</span>
                    )}
                  </TableCell>
                  <TableCell>{attribute.codeName}</TableCell>
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
