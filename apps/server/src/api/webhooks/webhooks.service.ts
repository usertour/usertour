import { Injectable } from '@nestjs/common';

import { ParamsError } from '@/common/errors';
import { Environment } from '@/environments/models/environment.model';
import { WebhooksService } from '@/webhooks/webhooks.service';

import { paginate } from '../shared/pagination';
import { mapWebhook } from './webhooks.mapper';
import {
  CreateWebhookBody,
  ListWebhooksQuery,
  UpdateWebhookBody,
  Webhook,
} from './webhooks.schema';

/**
 * v2 webhooks handler (environment-scoped). Thin over the domain
 * {@link WebhooksService} — the same validation (egress guard, topic grammar)
 * and secret lifecycle back both the dashboard and this surface.
 */
@Injectable()
export class ApiWebhooksService {
  constructor(private readonly webhooks: WebhooksService) {}

  async list(
    requestUrl: string,
    environment: Environment,
    query: ListWebhooksQuery,
  ): Promise<{ results: Webhook[]; next: string | null; previous: string | null }> {
    const { limit, cursor } = query;
    return paginate({
      requestUrl,
      cursor,
      limit,
      fetch: (params) => this.webhooks.listWithPagination(environment.id, params),
      map: (node) => mapWebhook(node),
    });
  }

  async get(id: string, environment: Environment): Promise<Webhook> {
    const row = await this.getOwnedRow(id, environment);
    return mapWebhook(row, { includeSecret: true });
  }

  async create(environment: Environment, body: CreateWebhookBody): Promise<Webhook> {
    const row = await this.webhooks.create({
      environmentId: environment.id,
      url: body.url,
      topics: body.topics,
      enabled: body.enabled,
      description: body.description,
    });
    return mapWebhook(row, { includeSecret: true });
  }

  async update(id: string, environment: Environment, body: UpdateWebhookBody): Promise<Webhook> {
    await this.getOwnedRow(id, environment);
    const row = await this.webhooks.update({ id, ...body });
    return mapWebhook(row, { includeSecret: true });
  }

  async delete(id: string, environment: Environment): Promise<void> {
    await this.getOwnedRow(id, environment);
    await this.webhooks.delete(id);
  }

  async rotateSecret(id: string, environment: Environment): Promise<Webhook> {
    await this.getOwnedRow(id, environment);
    const row = await this.webhooks.rotateSecret(id);
    return mapWebhook(row, { includeSecret: true });
  }

  /**
   * The route's environment owns the id, or 404 — the ApiTokenGuard has already
   * authorized the environment, so this closes the cross-environment IDOR gap.
   */
  private async getOwnedRow(id: string, environment: Environment) {
    const row = await this.webhooks.get(id);
    if (row.environmentId !== environment.id) {
      throw new ParamsError('Webhook not found');
    }
    return row;
  }
}
