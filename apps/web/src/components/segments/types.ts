/**
 * Discriminator for the shared segment dialogs. Both entities (BizUser /
 * BizCompany) share the same dialog structure but read from distinct
 * i18n namespaces (`users.*` vs `companies.*`) and call distinct
 * domain hooks. The dialog implementations branch internally on this
 * value rather than receiving slot props.
 */
export type SegmentEntity = 'user' | 'company';
