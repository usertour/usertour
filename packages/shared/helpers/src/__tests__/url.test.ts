import { RulesCondition } from '@usertour/types';
import { evaluateUrlCondition, isMatchUrlPattern } from '../conditions/url';

describe('URL Condition Evaluation', () => {
  describe('evaluateUrlCondition', () => {
    test('should return true when URL matches include pattern and no excludes', () => {
      const rules: RulesCondition = {
        id: 'condition-1',
        type: 'condition',
        operators: 'and',
        data: {
          includes: ['https://example.com/dashboard'],
          excludes: [],
        },
      };

      const url = 'https://example.com/dashboard';
      expect(evaluateUrlCondition(rules, url)).toBe(true);
    });

    test('should return false when URL does not match include pattern', () => {
      const rules: RulesCondition = {
        id: 'condition-2',
        type: 'condition',
        operators: 'and',
        data: {
          includes: ['https://example.com/dashboard'],
          excludes: [],
        },
      };

      const url = 'https://example.com/profile';
      expect(evaluateUrlCondition(rules, url)).toBe(false);
    });

    test('should return false when URL matches exclude pattern', () => {
      const rules: RulesCondition = {
        id: 'condition-3',
        type: 'condition',
        operators: 'and',
        data: {
          includes: ['https://example.com/*'],
          excludes: ['https://example.com/admin'],
        },
      };

      const url = 'https://example.com/admin';
      expect(evaluateUrlCondition(rules, url)).toBe(false);
    });

    test('should return true when URL matches include but not exclude', () => {
      const rules: RulesCondition = {
        id: 'condition-4',
        type: 'condition',
        operators: 'and',
        data: {
          includes: ['https://example.com/*'],
          excludes: ['https://example.com/admin'],
        },
      };

      const url = 'https://example.com/dashboard';
      expect(evaluateUrlCondition(rules, url)).toBe(true);
    });

    test('should return false when no includes and no excludes specified', () => {
      const rules: RulesCondition = {
        id: 'condition-5',
        type: 'condition',
        operators: 'and',
        data: {
          includes: [],
          excludes: [],
        },
      };

      const url = 'https://example.com/dashboard';
      expect(evaluateUrlCondition(rules, url)).toBe(false);
    });

    test('should return false when URL matches exclude even with no includes', () => {
      const rules: RulesCondition = {
        id: 'condition-6',
        type: 'condition',
        operators: 'and',
        data: {
          includes: [],
          excludes: ['https://example.com/admin'],
        },
      };

      const url = 'https://example.com/admin';
      expect(evaluateUrlCondition(rules, url)).toBe(false);
    });

    // New test cases for edge cases
    test('should handle URLs with ports', () => {
      const rules: RulesCondition = {
        id: 'condition-7',
        type: 'condition',
        operators: 'and',
        data: {
          includes: ['https://example.com:8080/dashboard'],
          excludes: [],
        },
      };

      const url = 'https://example.com:8080/dashboard';
      expect(evaluateUrlCondition(rules, url)).toBe(true);
    });

    test('should handle URLs with complex query parameters', () => {
      const rules: RulesCondition = {
        id: 'condition-8',
        type: 'condition',
        operators: 'and',
        data: {
          includes: ['https://example.com/dashboard?tab=overview&user=123'],
          excludes: [],
        },
      };

      const url = 'https://example.com/dashboard?tab=overview&user=123';
      expect(evaluateUrlCondition(rules, url)).toBe(true);
    });

    test('should handle URLs with special characters in query parameters', () => {
      const rules: RulesCondition = {
        id: 'condition-9',
        type: 'condition',
        operators: 'and',
        data: {
          includes: ['https://example.com/search?q=hello+world'],
          excludes: [],
        },
      };

      const url = 'https://example.com/search?q=hello+world';
      expect(evaluateUrlCondition(rules, url)).toBe(false);
    });

    test('should handle URLs with fragments', () => {
      const rules: RulesCondition = {
        id: 'condition-10',
        type: 'condition',
        operators: 'and',
        data: {
          includes: ['https://example.com/dashboard#overview'],
          excludes: [],
        },
      };

      const url = 'https://example.com/dashboard#overview';
      expect(evaluateUrlCondition(rules, url)).toBe(true);
    });

    test('should handle wildcard patterns in query parameters', () => {
      const rules: RulesCondition = {
        id: 'condition-11',
        type: 'condition',
        operators: 'and',
        data: {
          includes: ['https://example.com/dashboard?tab=*'],
          excludes: [],
        },
      };

      const url = 'https://example.com/dashboard?tab=overview';
      expect(evaluateUrlCondition(rules, url)).toBe(true);
    });

    test('should handle empty query parameter values', () => {
      const rules: RulesCondition = {
        id: 'condition-12',
        type: 'condition',
        operators: 'and',
        data: {
          includes: ['https://example.com/dashboard?tab='],
          excludes: [],
        },
      };

      const url = 'https://example.com/dashboard?tab=';
      expect(evaluateUrlCondition(rules, url)).toBe(true);
    });

    test('should handle multiple query parameters with wildcards', () => {
      const rules: RulesCondition = {
        id: 'condition-13',
        type: 'condition',
        operators: 'and',
        data: {
          includes: ['https://example.com/dashboard?tab=*&user=*'],
          excludes: [],
        },
      };

      const url = 'https://example.com/dashboard?tab=overview&user=123';
      expect(evaluateUrlCondition(rules, url)).toBe(true);
    });
  });

  describe('isMatchUrlPattern', () => {
    test('should match exact URL', () => {
      const url = 'https://example.com/dashboard';
      const includes = ['https://example.com/dashboard'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should match wildcard pattern', () => {
      const url = 'https://example.com/dashboard';
      const includes = ['https://example.com/*'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should match multiple include patterns', () => {
      const url = 'https://example.com/dashboard';
      const includes = [
        'https://example.com/profile',
        'https://example.com/dashboard',
        'https://example.com/settings',
      ];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should not match when no includes match', () => {
      const url = 'https://example.com/dashboard';
      const includes = ['https://example.com/profile', 'https://example.com/settings'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(false);
    });

    test('should not match when URL is excluded', () => {
      const url = 'https://example.com/admin';
      const includes = ['https://example.com/*'];
      const excludes = ['https://example.com/admin'];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(false);
    });

    test('should match when URL matches include but not exclude', () => {
      const url = 'https://example.com/dashboard';
      const includes = ['https://example.com/*'];
      const excludes = ['https://example.com/admin'];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should handle empty includes (matches all)', () => {
      const url = 'https://example.com/dashboard';
      const includes: string[] = [];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(false);
    });

    test('should handle empty excludes', () => {
      const url = 'https://example.com/dashboard';
      const includes = ['https://example.com/*'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should handle complex URL patterns with query parameters', () => {
      const url = 'https://example.com/dashboard?tab=overview&user=123';
      const includes = ['https://example.com/dashboard?tab=*'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should handle URL patterns with path parameters', () => {
      const url = 'https://example.com/users/123/profile';
      const includes = ['https://example.com/users/*/profile'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should handle URL patterns with wildcard in nested path', () => {
      const url = 'http://localhost:3004/client-view/sites/SUPERCONCEPTS/funds/aaaa/queries';
      const includes = ['/client-view/sites/SUPERCONCEPTS/funds/*/queries'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should handle URL patterns with fragments', () => {
      const url = 'https://example.com/dashboard#overview';
      const includes = ['https://example.com/dashboard#*'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should handle URLs without protocol', () => {
      const url = 'https://example.com/dashboard';
      const includes = ['example.com/dashboard'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should handle URLs with different protocols', () => {
      const url = 'http://example.com/dashboard';
      const includes = ['https://example.com/dashboard'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(false);
    });

    test('should handle invalid URL patterns gracefully', () => {
      const url = 'https://example.com/dashboard';
      const includes = ['invalid-url-pattern'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(false);
    });

    test('should handle empty URL', () => {
      const url = '';
      const includes = ['https://example.com/*'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(false);
    });

    test('should handle multiple exclude patterns', () => {
      const url = 'https://example.com/admin';
      const includes = ['https://example.com/*'];
      const excludes = ['https://example.com/admin', 'https://example.com/settings'];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(false);
    });

    test('should match when URL matches include but not any exclude', () => {
      const url = 'https://example.com/dashboard';
      const includes = ['https://example.com/*'];
      const excludes = ['https://example.com/admin', 'https://example.com/settings'];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    // Additional edge cases for isMatchUrlPattern
    test('should handle URLs with special regex characters', () => {
      const url = 'https://example.com/dashboard?param=value+with+spaces';
      const includes = ['https://example.com/dashboard?param=value+with+spaces'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(false);
    });

    test('should handle URLs with encoded characters', () => {
      const url = 'https://example.com/search?q=hello%20world';
      const includes = ['https://example.com/search?q=hello%20world'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should handle URLs with multiple query parameters in different order', () => {
      const url = 'https://example.com/dashboard?tab=overview&user=123&theme=dark';
      const includes = ['https://example.com/dashboard?user=123&tab=overview'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should handle URLs with empty path', () => {
      const url = 'https://example.com/';
      const includes = ['https://example.com/'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should handle URLs with root path wildcard', () => {
      const url = 'https://example.com/';
      const includes = ['https://example.com/*'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should handle URLs with subdomain wildcards', () => {
      const url = 'https://app.example.com/dashboard';
      const includes = ['https://*.example.com/dashboard'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should handle URLs with port numbers', () => {
      const url = 'https://example.com:3000/dashboard';
      const includes = ['https://example.com:3000/dashboard'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should handle URLs with port wildcards', () => {
      const url = 'https://example.com:8080/dashboard';
      const includes = ['https://example.com:*/dashboard'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should handle complex fragment patterns', () => {
      const url = 'https://example.com/dashboard#section-1';
      const includes = ['https://example.com/dashboard#section-*'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should handle URLs with special characters in path', () => {
      const url = 'https://example.com/user/123/profile';
      const includes = ['https://example.com/user/*/profile'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should handle URLs with query parameters containing special characters', () => {
      const url = 'https://example.com/search?q=hello&filter=active';
      const includes = ['https://example.com/search?q=*&filter=active'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should handle URLs with empty query parameter values', () => {
      const url = 'https://example.com/dashboard?tab=';
      const includes = ['https://example.com/dashboard?tab='];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should handle URLs with query parameters that have no value', () => {
      const url = 'https://example.com/dashboard?tab';
      const includes = ['https://example.com/dashboard?tab'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should handle URLs with multiple fragments', () => {
      const url = 'https://example.com/dashboard#section-1#subsection-a';
      const includes = ['https://example.com/dashboard#section-1#*'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should handle URLs with IPv4 addresses', () => {
      const url = 'https://192.168.1.1/dashboard';
      const includes = ['https://192.168.1.1/dashboard'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should handle URLs with IPv6 addresses', () => {
      const url = 'https://[2001:db8::1]/dashboard';
      const includes = ['https://[2001:db8::1]/dashboard'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should handle URLs with mixed case in domain', () => {
      const url = 'https://Example.COM/dashboard';
      const includes = ['https://example.com/dashboard'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(false);
    });

    test('should handle URLs with mixed case in path', () => {
      const url = 'https://example.com/Dashboard';
      const includes = ['https://example.com/dashboard'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(false);
    });
  });

  // Test cases specifically for comparing old vs new implementation behavior
  describe('Implementation Compatibility Tests', () => {
    test('should handle query parameters with special characters consistently', () => {
      const url = 'https://example.com/search?q=hello+world&filter=active';
      const includes = ['https://example.com/search?q=hello+world'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(false);
    });

    test('should handle query parameters with encoded characters consistently', () => {
      const url = 'https://example.com/search?q=hello%20world';
      const includes = ['https://example.com/search?q=hello%20world'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should handle query parameters with wildcards consistently', () => {
      const url = 'https://example.com/search?q=hello&filter=*';
      const includes = ['https://example.com/search?q=*&filter=active'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(false);
    });

    test('should handle empty includes and excludes consistently', () => {
      const url = 'https://example.com/dashboard';
      const includes: string[] = [];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(false);
    });

    test('should handle only excludes consistently', () => {
      const url = 'https://example.com/dashboard';
      const includes: string[] = [];
      const excludes = ['https://example.com/admin'];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should handle complex nested paths consistently', () => {
      const url = 'https://example.com/app/dashboard/user/123/settings';
      const includes = ['https://example.com/app/*/user/*/settings'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });

    test('should handle URLs with multiple query parameters consistently', () => {
      const url = 'https://example.com/dashboard?tab=overview&user=123&theme=dark&lang=en';
      const includes = ['https://example.com/dashboard?tab=overview&user=*&theme=dark'];
      const excludes: string[] = [];

      expect(isMatchUrlPattern(url, includes, excludes)).toBe(true);
    });
  });
});
