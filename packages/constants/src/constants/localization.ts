/**
 * Units per machine-translation batch — one batch is exactly one LLM
 * request. The editor slices its untranslated units by this and the server
 * uses it as its chunk size, deliberately locking the two together: progress
 * granularity, failure granularity and progressive application all align to
 * a single LLM call, so a failed batch never discards finished work.
 */
export const MACHINE_TRANSLATION_UNITS_PER_BATCH = 40;
