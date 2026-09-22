import { Field, InputType, registerEnumType } from '@nestjs/graphql';

import { Order } from '@/common/order/order';

import { AuditLogOrderField } from '../constants/audit-log-order-field.constant';
import type { AuditLogOrdering } from '../types/audit-log-ordering.type';

registerEnumType(AuditLogOrderField, { name: 'AuditLogOrderField' });

@InputType()
export class AuditLogOrder extends Order implements AuditLogOrdering {
  @Field(() => AuditLogOrderField)
  field: AuditLogOrderField;
}
