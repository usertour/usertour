import { ValidationError, type ValidationIssue } from '@/modules/common/errors/errors';

/**
 * The shape rules for a locale's own fields, applied by the service so every
 * surface (dashboard GraphQL, REST v2, MCP) writes the same thing.
 *
 * `code` is the identifier that matters: delivery matches it against the end
 * user's `locale_code` (trimmed, case-insensitively, falling back to the
 * primary subtag), and REST addresses a version's translation by putting it
 * in the URL path. So it is trimmed, restricted to characters a path segment
 * carries verbatim, and — because delivery ignores case — treated as
 * case-insensitively unique within the project (checked by the service).
 *
 * It stays FREE-FORM otherwise: a project may run `fr-enterprise` next to
 * `fr` to give one language two variants. The catalog behind the dashboard's
 * picker (GET /v2/locales) is a suggestion, not a vocabulary.
 */
const CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
/** Well-formed BCP-47-ish: subtags of letters/digits joined by hyphens (`fr`, `fr-FR`, `zh-Hans-CN`). */
const LOCALE_PATTERN = /^[A-Za-z]{2,8}(-[A-Za-z0-9]{2,8})*$/;

const CODE_MIN = 2;
const CODE_MAX = 35;
const NAME_MIN = 2;
const NAME_MAX = 64;
const LOCALE_MAX = 35;

export interface LocalizationFields {
  code?: string;
  name?: string;
  locale?: string;
}

/**
 * Trim the fields present and reject what cannot be stored, listing every
 * problem at once. Returns only the keys it was given, so an update keeps
 * meaning "change exactly these".
 */
export const normalizeLocalizationFields = <T extends LocalizationFields>(fields: T): T => {
  const issues: ValidationIssue[] = [];
  const normalized = { ...fields };

  if (fields.code !== undefined) {
    const code = fields.code.trim();
    if (code.length < CODE_MIN || code.length > CODE_MAX) {
      issues.push({
        rule: 'schema',
        path: 'code',
        message: `must be ${CODE_MIN}–${CODE_MAX} characters.`,
      });
    } else if (!CODE_PATTERN.test(code)) {
      issues.push({
        rule: 'schema',
        path: 'code',
        message:
          'must start with a letter or digit and hold only letters, digits, `-` and `_` — it is ' +
          'matched against an end user attribute and addressed in a URL path, so a space or a ' +
          'slash would make the locale unreachable.',
      });
    }
    normalized.code = code;
  }

  if (fields.name !== undefined) {
    const name = fields.name.trim();
    if (name.length < NAME_MIN || name.length > NAME_MAX) {
      issues.push({
        rule: 'schema',
        path: 'name',
        message: `must be ${NAME_MIN}–${NAME_MAX} characters.`,
      });
    }
    normalized.name = name;
  }

  if (fields.locale !== undefined) {
    const locale = fields.locale.trim();
    if (locale.length > LOCALE_MAX) {
      issues.push({
        rule: 'schema',
        path: 'locale',
        message: `must be at most ${LOCALE_MAX} characters.`,
      });
    } else if (!LOCALE_PATTERN.test(locale)) {
      issues.push({
        rule: 'schema',
        path: 'locale',
        message:
          'must be a well-formed language tag, e.g. `fr`, `fr-FR` or `zh-Hans-CN` (GET /v2/locales lists the common ones).',
      });
    }
    normalized.locale = locale;
  }

  if (issues.length > 0) {
    throw ValidationError.fromIssues(issues);
  }
  return normalized;
};
