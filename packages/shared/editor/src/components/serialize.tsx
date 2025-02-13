import { uuidV4 } from '@usertour-ui/ui-utils';
import { useEffect, useState } from 'react';
import type { ButtonData, CustomElementStrings } from '../types/slate';
import { ALIGN_MAPPING, isText, serializeLeaf } from './editor';
import { ELEMENTS } from './elements';

type ALIGN_TYPE = 'left' | 'right' | 'center' | 'justify';

export const serialize = (node: any, callback?: (type: string, params: ButtonData) => void) => {
  const key = uuidV4();
  if (isText(node)) {
    return serializeLeaf(node, key);
  }
  const children = node.children.map((n: any) => serialize(n));
  const cls = 'align' in node ? ALIGN_MAPPING[node.align as ALIGN_TYPE] : '';
  const type = node.type as CustomElementStrings;
  const Comp = ELEMENTS[type]?.serialize;
  if (!Comp) {
    return children;
  }
  if (callback) {
    return (
      <Comp className={cls} element={node} key={key} onClick={callback}>
        {children}
      </Comp>
    );
  }
  return (
    <Comp className={cls} element={node} key={key}>
      {children}
    </Comp>
  );
};

export const serializeData = (data: any): React.ReactNode[] => {
  const s: React.ReactNode[] = [];
  for (const d of data) {
    s.push(serialize(d));
  }
  return s;
};

export const useSerialize = (callback?: (type: string, params: ButtonData) => void) => {
  const [data, setData] = useState<any | null>(null);
  const [serializeData, setSerializeData] = useState<React.ReactNode[]>();

  useEffect(() => {
    if (!data) {
      return;
    }
    const s: React.ReactNode[] = [];
    for (const d of data) {
      s.push(serialize(d, callback));
    }
    setSerializeData(s);
  }, [data]);

  return { setData, serializeData };
};
