// Operator-by-datatype mappings now live in @usertour/helpers (single source of
// truth, shared with the server's write-path validator). Re-exported here so
// existing builder imports keep resolving unchanged.
export {
  OPERATORS_BY_DATATYPE,
  operatorsFor,
  VALUELESS_OPERATORS,
  DATE_PICKER_OPERATORS,
  splitOperatorTemplate,
  type OperatorEntry,
} from '@usertour/helpers';
