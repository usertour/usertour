import { Field, InputType, registerEnumType } from '@nestjs/graphql';
import { Order } from '@/common/order/order';

export enum AuditLogOrderField {
  createdAt = 'createdAt',
}

registerEnumType(AuditLogOrderField, { name: 'AuditLogOrderField' });

@InputType()
export class AuditLogOrder extends Order {
  @Field(() => AuditLogOrderField)
  field: AuditLogOrderField;
}
