import { ApiObjectType } from '../shared/object-type';
import { Theme } from './themes.schema';

type ThemeNode = {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
};

/** Pure domain-theme -> API theme mapping (no DI, unit-testable). */
export function mapTheme(node: ThemeNode): Theme {
  return {
    id: node.id,
    object: ApiObjectType.THEME,
    name: node.name,
    isDefault: node.isDefault,
    createdAt: new Date(node.createdAt).toISOString(),
    updatedAt: new Date(node.updatedAt).toISOString(),
  };
}
