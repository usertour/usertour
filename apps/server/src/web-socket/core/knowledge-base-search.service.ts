import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  KnowledgeBaseSearchProvider,
  type KnowledgeBaseArticleItem,
  type SearchKnowledgeBaseResult,
} from '@usertour/types';

@Injectable()
export class KnowledgeBaseSearchService {
  private readonly logger = new Logger(KnowledgeBaseSearchService.name);

  constructor(private readonly configService: ConfigService) {}

  async search(
    provider: KnowledgeBaseSearchProvider,
    baseUrl: string,
    query: string,
    offset: number,
  ): Promise<SearchKnowledgeBaseResult> {
    return this.fetchFromProvider(provider, baseUrl, query, offset);
  }

  private async fetchFromProvider(
    provider: KnowledgeBaseSearchProvider,
    baseUrl: string,
    query: string,
    offset: number,
  ): Promise<SearchKnowledgeBaseResult> {
    const normalizedUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
    const encodedQuery = encodeURIComponent(query);
    const pageSize = 10;

    let apiUrl: string;
    const headers: Record<string, string> = {};

    switch (provider) {
      case KnowledgeBaseSearchProvider.FRESHDESK: {
        const apiKey = this.configService.get<string>('knowledgeBase.freshdesk.apiKey');
        apiUrl = `${normalizedUrl}/api/v2/search/solutions?term=${encodedQuery}&page=${Math.floor(offset / pageSize) + 1}`;
        if (apiKey) {
          headers.Authorization = `Basic ${Buffer.from(`${apiKey}:X`).toString('base64')}`;
        }
        break;
      }
      case KnowledgeBaseSearchProvider.ZENDESK: {
        const apiKey = this.configService.get<string>('knowledgeBase.zendesk.apiKey');
        const baseForApi = normalizedUrl.replace(/\/$/, '');
        apiUrl = `${baseForApi}/api/v2/help_center/articles/search.json?query=${encodedQuery}&page=${Math.floor(offset / pageSize) + 1}&per_page=${pageSize}`;
        if (apiKey) {
          headers.Authorization = `Bearer ${apiKey}`;
        }
        break;
      }
      case KnowledgeBaseSearchProvider.HUBSPOT: {
        const apiKey = this.configService.get<string>('knowledgeBase.hubspot.apiKey');
        apiUrl = `${normalizedUrl}/api/v2/kb/search?query=${encodedQuery}&offset=${offset}&limit=${pageSize}`;
        if (apiKey) {
          headers.Authorization = `Bearer ${apiKey}`;
        }
        break;
      }
      default:
        return { articles: [], total: 0 };
    }

    const response = await fetch(apiUrl, { headers });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.warn(`Provider ${provider} returned ${response.status}: ${body}`);
      return { articles: [], total: 0 };
    }

    const data = await response.json();
    return this.parseProviderResponse(provider, normalizedUrl, data, pageSize, offset);
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private parseProviderResponse(
    provider: KnowledgeBaseSearchProvider,
    baseUrl: string,
    data: any,
    pageSize: number,
    offset: number,
  ): SearchKnowledgeBaseResult {
    try {
      let articles: KnowledgeBaseArticleItem[];
      let total = 0;

      switch (provider) {
        case KnowledgeBaseSearchProvider.FRESHDESK: {
          const items = Array.isArray(data) ? data : (data?.results ?? []);
          const domain = baseUrl.replace(/\/$/, '');
          articles = items.map((item: any) => ({
            title: item.title ?? '',
            snippet: this.stripHtml(item.description ?? '').substring(0, 200),
            url: item.id ? `${domain}/support/solutions/articles/${item.id}` : '#',
          }));
          total = articles.length;
          break;
        }
        case KnowledgeBaseSearchProvider.ZENDESK: {
          const results = data?.results ?? [];
          total = data?.count ?? results.length;
          articles = results.slice(0, pageSize).map((item: any) => ({
            title: item.title ?? '',
            snippet: item.snippet ?? item.body?.substring(0, 200) ?? '',
            url: item.html_url ?? '#',
          }));
          break;
        }
        case KnowledgeBaseSearchProvider.HUBSPOT: {
          const results = data?.results ?? data?.objects ?? [];
          articles = results.slice(0, pageSize).map((item: any) => ({
            title: item.title ?? item.name ?? '',
            snippet: this.stripHtml(item.description ?? item.metaDescription ?? '').substring(
              0,
              200,
            ),
            url: item.url ?? '#',
          }));
          total =
            data?.total ??
            (results.length >= pageSize ? offset + results.length + 1 : offset + results.length);
          break;
        }
        default:
          return { articles: [], total: 0 };
      }

      return { articles, total };
    } catch {
      return { articles: [], total: 0 };
    }
  }
}
