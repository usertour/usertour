import { Attribute, AttributeBizType } from '@/attributes/models/attribute.model';
import { SegmentBizType, SegmentDataType } from '@/biz/models/segment.model';
import {
  capitalizeFirstLetter,
  filterNullAttributes,
  getAttributeType,
  isNull,
} from '@/common/attribute/attribute';
import { createConditionsFilter, createFilterItem } from '@/common/attribute/filter';
import { BizAttributeTypes, BizEvents, EventAttributes } from '@/common/consts/attribute';
import { ContentType } from '@/contents/models/content.model';
import {
  ChecklistData,
  ContentConfigObject,
  RulesCondition,
} from '@/contents/models/version.model';
import { Environment } from '@/environments/models/environment.model';
import { getEventProgress, getEventState, isValidEvent } from '@/utils/event';
import { Injectable } from '@nestjs/common';
import { BizEvent, BizUser, Step } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';

const EVENT_CODE_MAP = {
  seen: { eventCodeName: BizEvents.FLOW_STEP_SEEN, expectResult: true },
  unseen: { eventCodeName: BizEvents.FLOW_STEP_SEEN, expectResult: false },
  completed: { eventCodeName: BizEvents.FLOW_COMPLETED, expectResult: true },
  uncompleted: { eventCodeName: BizEvents.FLOW_COMPLETED, expectResult: false },
  actived: { eventCodeName: BizEvents.FLOW_STARTED, expectResult: true },
  unactived: { eventCodeName: BizEvents.FLOW_STARTED, expectResult: false },
} as const;

@Injectable()
export class WebSocketService {
  constructor(private prisma: PrismaService) {}

  async getConfig(body: any): Promise<any> {
    const { token } = body;
    const environment = await this.prisma.environment.findFirst({
      where: { token },
    });
    const config = {
      removeBranding: false,
      planType: 'hobby',
    };
    if (!environment) {
      return config;
    }
    const projectId = environment.projectId;
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project || !project.subscriptionId) {
      return config;
    }
    const subscription = await this.prisma.subscription.findFirst({
      where: { subscriptionId: project.subscriptionId },
    });
    if (subscription) {
      config.planType = subscription.planType;
      config.removeBranding = subscription.planType !== 'hobby';
    }
    return config;
  }

  async listContents(body: any): Promise<any> {
    const { token, versionId, userId: bizUserId, companyId } = body;
    const environment = await this.prisma.environment.findFirst({
      where: { token },
    });
    if (!environment) {
      return;
    }
    const environmentId = environment.id;
    if (versionId) {
      const resp = await this.prisma.version.findUnique({
        where: { id: versionId },
        include: { steps: { orderBy: { sequence: 'asc' } }, content: true },
      });
      return resp
        ? [
            {
              ...resp,
              config: {},
              events: [],
              totalSessions: [],
              type: resp.content.type,
            },
          ]
        : [];
    }
    const contents = await this.prisma.content.findMany({
      where: { environmentId, published: true },
      // include: { steps: true },
    });
    if (contents.length === 0) {
      return;
    }
    const bizUser = await this.prisma.bizUser.findFirst({
      where: { externalId: String(bizUserId), environmentId },
    });
    const response: any[] = [];
    const attributes = await this.prisma.attribute.findMany({
      where: {
        projectId: environment.projectId,
        bizType: {
          in: [AttributeBizType.USER, AttributeBizType.COMPANY, AttributeBizType.MEMBERSHIP],
        },
      },
    });
    for (let index = 0; index < contents.length; index++) {
      const content = contents[index];
      const version = await this.prisma.version.findUnique({
        where: { id: content.publishedVersionId },
        include: { steps: { orderBy: { sequence: 'asc' } } },
      });
      const events = await this.listEvents(content.id, bizUser.id);
      const totalSessions = await this.getTotalSessions(content.id, bizUser.id);

      const config = version.config
        ? (version.config as ContentConfigObject)
        : {
            enabledAutoStartRules: false,
            enabledHideRules: false,
            autoStartRules: [],
            hideRules: [],
          };
      const autoStartRules =
        config.enabledAutoStartRules && config.autoStartRules.length > 0
          ? await this.activedRulesConditions(
              config.autoStartRules,
              environment,
              attributes,
              bizUser,
              companyId,
            )
          : [];
      const hideRules =
        config.enabledHideRules && config.hideRules.length > 0
          ? await this.activedRulesConditions(
              config.hideRules,
              environment,
              attributes,
              bizUser,
              companyId,
            )
          : [];
      const data =
        content.type === ContentType.CHECKLIST
          ? await this.activedChecklistConditions(
              version.data as unknown as ChecklistData,
              environment,
              attributes,
              bizUser,
              companyId,
            )
          : version.data;
      const steps = await this.activedStepTriggers(
        version.steps,
        environment,
        attributes,
        bizUser,
        companyId,
      );
      const resp = {
        ...version,
        data,
        steps,
        config: { ...config, autoStartRules, hideRules },
        type: content.type,
        name: content.name,
        events,
        totalSessions,
      };
      response.push(resp);
    }
    return response;
  }

  async activedChecklistConditions(
    data: ChecklistData,
    environment: Environment,
    attributes: Attribute[],
    bizUser: BizUser,
    companyId?: string,
  ) {
    const items = await Promise.all(
      data.items.map(async (item) => {
        const completeConditions = item.completeConditions
          ? await this.activedRulesConditions(
              item.completeConditions,
              environment,
              attributes,
              bizUser,
              companyId,
            )
          : [];
        const onlyShowTaskConditions = item.onlyShowTaskConditions
          ? await this.activedRulesConditions(
              item.onlyShowTaskConditions,
              environment,
              attributes,
              bizUser,
              companyId,
            )
          : [];
        return {
          ...item,
          completeConditions,
          onlyShowTaskConditions,
        };
      }),
    );
    return { ...data, items };
  }

  async activedStepTriggers(
    steps: Step[],
    environment: Environment,
    attributes: Attribute[],
    bizUser: BizUser,
    companyId?: string,
  ): Promise<Step[]> {
    const stepsData = [...steps];
    for (let index = 0; index < stepsData.length; index++) {
      const step = stepsData[index];
      if (step.trigger && Array.isArray(step.trigger)) {
        for (let subIndex = 0; subIndex < step.trigger.length; subIndex++) {
          const trigger = step.trigger[subIndex] as any;
          if (trigger?.conditions) {
            const triggerData = await this.activedRulesConditions(
              trigger.conditions,
              environment,
              attributes,
              bizUser,
              companyId,
            );
            stepsData[index].trigger[subIndex].conditions = triggerData;
          }
        }
      }
    }
    return stepsData;
  }

  async activedRulesConditions(
    rulesConditions: RulesCondition[],
    environment: Environment,
    attributes: Attribute[],
    bizUser: BizUser,
    companyId?: string,
  ): Promise<RulesCondition[]> {
    const conditions = [...rulesConditions];
    for (let index = 0; index < conditions.length; index++) {
      const rules = conditions[index];
      if (rules.type === 'group') {
        for (let subIndex = 0; subIndex < rules.conditions.length; subIndex++) {
          const subRules = rules.conditions[subIndex];
          const isAcvited = await this.activedRulesCondition(
            subRules,
            environment,
            attributes,
            bizUser,
            companyId,
          );
          conditions[index].conditions[subIndex].actived = isAcvited;
        }
      } else {
        const isAcvited = await this.activedRulesCondition(
          rules,
          environment,
          attributes,
          bizUser,
          companyId,
        );
        conditions[index] = { ...rules, actived: isAcvited };
      }
    }
    return conditions;
  }

  async activedRulesCondition(
    rules: RulesCondition,
    environment: Environment,
    attributes: Attribute[],
    bizUser: BizUser,
    companyId?: string,
  ): Promise<boolean> {
    const userAttrs = attributes.filter((attr) => attr.bizType === AttributeBizType.USER);
    const companyAttrs = attributes.filter((attr) => attr.bizType === AttributeBizType.COMPANY);
    switch (rules.type) {
      case 'user-attr': {
        return await this.activedUserAttributeRulesCondition(
          rules,
          environment,
          attributes,
          bizUser,
          companyId,
        );
      }
      case 'segment': {
        const { segmentId } = rules.data;
        const segment = await this.prisma.segment.findFirst({
          where: { id: segmentId },
        });
        if (!segment) {
          return false;
        }
        if (segment.bizType === SegmentBizType.USER) {
          return await this.activedUserSegmentRulesCondition(
            rules,
            environment,
            userAttrs,
            bizUser,
          );
        }
        if (segment.bizType === SegmentBizType.COMPANY && companyId) {
          return await this.activedCompanySegmentRulesCondition(
            rules,
            environment,
            companyAttrs,
            bizUser,
            companyId,
          );
        }
        return false;
      }
      case 'content': {
        return await this.activedContentRulesCondition(rules, environment, bizUser);
      }
      default: {
        return false;
      }
    }
  }

  async activedUserAttributeRulesCondition(
    rules: RulesCondition,
    environment: Environment,
    attributes: Attribute[],
    bizUser: BizUser,
    companyId?: string,
  ): Promise<boolean> {
    const attr = attributes.find((attr) => attr.id === rules.data.attrId);
    if (!attr) {
      return false;
    }

    const filter = createFilterItem(rules, attributes) || {};
    const environmentId = environment.id;

    switch (attr.bizType) {
      case AttributeBizType.USER: {
        const segmentUser = await this.prisma.bizUser.findFirst({
          where: {
            environmentId,
            externalId: String(bizUser.externalId),
            ...filter,
          },
        });
        return !!segmentUser;
      }

      case AttributeBizType.COMPANY:
      case AttributeBizType.MEMBERSHIP: {
        if (!companyId) return false;

        const bizCompany = await this.prisma.bizCompany.findFirst({
          where: {
            externalId: String(companyId),
            environmentId,
          },
        });
        if (!bizCompany) return false;

        const segmentUser = await this.prisma.bizUserOnCompany.findFirst({
          where: {
            bizUserId: bizUser.id,
            bizCompanyId: bizCompany.id,
            ...(attr.bizType === AttributeBizType.COMPANY ? { bizCompany: filter } : filter),
          },
        });
        return !!segmentUser;
      }

      default:
        return false;
    }
  }

  async activedCompanySegmentRulesCondition(
    rules: RulesCondition,
    environment: Environment,
    attributes: Attribute[],
    bizUser: BizUser,
    companyId: string,
  ): Promise<boolean> {
    const { segmentId, logic = 'is' } = rules.data;
    const segment = await this.prisma.segment.findFirst({
      where: { id: segmentId },
    });
    const bizCompany = await this.prisma.bizCompany.findFirst({
      where: { externalId: String(companyId), environmentId: environment.id },
    });
    if (!segment || !bizCompany) {
      return false;
    }
    const relation = await this.prisma.bizUserOnCompany.findFirst({
      where: { bizUserId: bizUser.id, bizCompanyId: bizCompany.id },
    });
    if (!relation) {
      return false;
    }
    if (segment.dataType === SegmentDataType.ALL) {
      return logic === 'is';
    }
    if (segment.dataType === SegmentDataType.MANUAL) {
      const item = await this.prisma.bizCompanyOnSegment.findFirst({
        where: { segmentId, bizCompanyId: bizCompany.id },
      });
      if (logic === 'is') {
        return !!item;
      }
      return !item;
    }
    if (segment.dataType === SegmentDataType.CONDITION) {
      const filter = createConditionsFilter(segment.data, attributes);
      const segmentItem = await this.prisma.bizCompany.findFirst({
        where: {
          id: bizCompany.id,
          environmentId: environment.id,
          ...filter,
        },
      });
      return logic === 'is' ? !!segmentItem : !segmentItem;
    }
    return false;
  }

  async activedUserSegmentRulesCondition(
    rules: RulesCondition,
    environment: Environment,
    attributes: Attribute[],
    bizUser: BizUser,
  ): Promise<boolean> {
    const { segmentId, logic = 'is' } = rules.data;
    const segment = await this.prisma.segment.findFirst({
      where: { id: segmentId },
    });
    if (!segment) {
      return false;
    }
    if (segment.dataType === SegmentDataType.ALL) {
      return logic === 'is';
    }
    if (segment.dataType === SegmentDataType.MANUAL) {
      const user = await this.prisma.bizUserOnSegment.findFirst({
        where: { segmentId, bizUserId: bizUser.id },
      });
      return logic === 'is' ? !!user : !user;
    }
    if (segment.dataType === SegmentDataType.CONDITION) {
      const filter = createConditionsFilter(segment.data, attributes);
      const segmentUser = await this.prisma.bizUser.findFirst({
        where: {
          environmentId: environment.id,
          externalId: String(bizUser.externalId),
          ...filter,
        },
      });
      return logic === 'is' ? !!segmentUser : !segmentUser;
    }
    return false;
  }

  async activedContentRulesCondition(
    rules: RulesCondition,
    environment: Environment,
    bizUser: BizUser,
  ): Promise<boolean> {
    const { contentId, logic } = rules.data;

    // Check content existence
    const content = await this.prisma.content.findFirst({
      where: { id: contentId },
    });
    if (!content || !logic) {
      return false;
    }

    const { eventCodeName, expectResult } = EVENT_CODE_MAP[logic];

    if (!eventCodeName) {
      return false;
    }

    // Get specific event
    const event = await this.prisma.event.findFirst({
      where: {
        codeName: eventCodeName,
        projectId: environment.projectId,
      },
    });

    if (!event) {
      return false;
    }

    // Check session with specific event
    const session = await this.prisma.bizSession.findFirst({
      where: {
        bizUserId: bizUser.id,
        contentId,
        bizEvent: {
          some: {
            eventId: event.id,
          },
        },
      },
    });

    return session ? expectResult : !expectResult;
  }

  async listEvents(contentId: string, bizUserId: string): Promise<any> {
    const sessions = await this.prisma.bizSession.findMany({
      where: { contentId, bizUserId, deleted: false },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    const data: BizEvent[] = [];
    for (let index = 0; index < sessions.length; index++) {
      const session = sessions[index];
      const events = await this.prisma.bizEvent.findMany({
        where: { bizSessionId: session.id },
        include: { event: true },
      });
      if (events) {
        data.push(...events);
      }
    }
    return data;
  }

  async getTotalSessions(contentId: string, bizUserId: string): Promise<any> {
    return await this.prisma.bizSession.count({
      where: { contentId, bizUserId, deleted: false },
    });
  }

  async listThemes({ token }: any): Promise<any> {
    const environmenet = await this.prisma.environment.findFirst({
      where: { token },
    });
    if (!environmenet) {
      return;
    }
    return await this.prisma.theme.findMany({
      where: { projectId: environmenet.projectId },
    });
  }

  async upsertBizUsers(data: any): Promise<any> {
    const { userId, attributes, token } = data;
    const environmenet = await this.prisma.environment.findFirst({
      where: { token },
    });
    if (!environmenet) {
      return;
    }
    const environmentId = environmenet.id;
    const projectId = environmenet.projectId;
    const insertAttribute = await this.insertBizAttributes(
      projectId,
      AttributeBizType.USER,
      attributes,
    );

    const user = await this.prisma.bizUser.findFirst({
      where: { externalId: String(userId), environmentId },
    });
    if (!user) {
      return await this.prisma.bizUser.create({
        data: {
          externalId: String(userId),
          environmentId,
          data: insertAttribute,
        },
      });
    }
    const userData = JSON.parse(JSON.stringify(user.data));
    const insertData = filterNullAttributes({
      ...userData,
      ...insertAttribute,
    });

    return await this.prisma.bizUser.update({
      where: {
        id: user.id,
      },
      data: {
        data: insertData,
      },
    });
  }

  async insertBizAttributes(
    projectId: string,
    bizType: AttributeBizType,
    attributes: any,
  ): Promise<any> {
    const insertAttribute = {};
    for (const codeName in attributes) {
      const attrValue = attributes[codeName];
      const attrName = codeName;
      if (isNull(attrValue)) {
        insertAttribute[attrName] = null;
        continue;
      }
      const dataType = getAttributeType(attrValue);
      const attribute = await this.prisma.attribute.findFirst({
        where: {
          projectId,
          codeName: attrName,
          bizType,
        },
      });
      if (!attribute) {
        const newAttr = await this.prisma.attribute.create({
          data: {
            codeName: attrName,
            dataType: dataType,
            displayName: capitalizeFirstLetter(attrName),
            projectId,
            bizType,
          },
        });
        if (newAttr) {
          insertAttribute[attrName] = attrValue;
          continue;
        }
      }
      if (attribute && attribute.dataType === dataType) {
        if (dataType === BizAttributeTypes.DateTime) {
          insertAttribute[attrName] = new Date(attrValue).toISOString();
        } else {
          insertAttribute[attrName] = attrValue;
        }
      }
    }
    return insertAttribute;
  }

  async upsertBizCompanyAttributes(
    projectId: string,
    environmentId: string,
    companyId: string,
    attributes: any,
  ): Promise<any> {
    const company = await this.prisma.bizCompany.findFirst({
      where: { externalId: String(companyId), environmentId },
    });
    const insertAttribute = await this.insertBizAttributes(
      projectId,
      AttributeBizType.COMPANY,
      attributes,
    );
    if (company) {
      const userData = JSON.parse(JSON.stringify(company.data));
      const insertData = filterNullAttributes({
        ...userData,
        ...insertAttribute,
      });
      return await this.prisma.bizCompany.update({
        where: {
          id: company.id,
        },
        data: {
          data: insertData,
        },
      });
    }
    return await this.prisma.bizCompany.create({
      data: {
        externalId: String(companyId),
        environmentId,
        data: insertAttribute,
      },
    });
  }

  async upsertBizMembership(
    projectId: string,
    bizCompanyId: string,
    bizUserId: string,
    membership: any,
  ): Promise<any> {
    const insertAttribute = await this.insertBizAttributes(
      projectId,
      AttributeBizType.MEMBERSHIP,
      membership,
    );

    const relation = await this.prisma.bizUserOnCompany.findFirst({
      where: { bizCompanyId, bizUserId },
    });

    if (relation) {
      const userData = JSON.parse(JSON.stringify(relation.data));
      const insertData = filterNullAttributes({
        ...userData,
        ...insertAttribute,
      });
      return await this.prisma.bizUserOnCompany.update({
        where: {
          id: relation.id,
        },
        data: {
          data: insertData,
        },
      });
    }
    return await this.prisma.bizUserOnCompany.create({
      data: {
        bizUserId,
        bizCompanyId,
        data: insertAttribute,
      },
    });
  }

  async upsertBizCompanies(data: any): Promise<any> {
    const { companyId, userId, attributes, token, membership } = data;
    const environmenet = await this.prisma.environment.findFirst({
      where: { token },
    });
    if (!environmenet) {
      return;
    }
    const user = await this.prisma.bizUser.findFirst({
      where: { externalId: String(userId), environmentId: environmenet.id },
    });
    if (!user) {
      return;
    }

    const environmentId = environmenet.id;
    const projectId = environmenet.projectId;
    const company = await this.upsertBizCompanyAttributes(
      projectId,
      environmentId,
      companyId,
      attributes,
    );
    if (membership) {
      await this.upsertBizMembership(projectId, company.id, user.id, membership);
    }

    return company;
  }

  async listAttributes({ token }: any): Promise<any> {
    const environmenet = await this.prisma.environment.findFirst({
      where: { token },
    });
    if (!environmenet) {
      return;
    }
    const projectId = environmenet.projectId;
    return await this.prisma.attribute.findMany({
      where: {
        projectId,
        bizType: AttributeBizType.USER,
      },
    });
  }

  async listBizUserSegments(body: any): Promise<any> {
    const { token, bizUserId } = body;
    const ids = [];
    const environmenet = await this.prisma.environment.findFirst({
      where: { token },
    });
    if (!environmenet) {
      return false;
    }
    const environmentId = environmenet.id;
    const user = await this.prisma.bizUser.findFirst({
      where: { externalId: String(bizUserId), environmentId },
      include: { bizUsersOnSegment: true },
    });
    for (const onSegment of user.bizUsersOnSegment) {
      ids.push(onSegment.segmentId);
    }
    const attributes = await this.prisma.attribute.findMany({
      where: {
        projectId: environmenet.projectId,
        bizType: AttributeBizType.USER,
      },
    });
    const segments = await this.prisma.segment.findMany({
      where: { dataType: SegmentDataType.CONDITION, environmentId },
    });
    for (const segment of segments) {
      const filter = createConditionsFilter(segment.data, attributes);
      const segmentUsers = this.prisma.bizUser.findMany({
        where: {
          environmentId,
          externalId: String(bizUserId),
          ...filter,
        },
      });
      if (segmentUsers) {
        ids.push(segment.id);
      }
    }
    return ids;
  }

  async createSession(data: any): Promise<any> {
    const { userId, token, contentId } = data;
    const environment = await this.prisma.environment.findFirst({
      where: { token },
    });
    if (!environment) {
      return;
    }
    const environmentId = environment.id;
    const bizUser = await this.prisma.bizUser.findFirst({
      where: { externalId: String(userId), environmentId },
    });
    if (!bizUser) {
      return false;
    }
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
    });
    if (!content) {
      return false;
    }
    return await this.prisma.bizSession.create({
      data: {
        state: 0,
        progress: 0,
        projectId: environment.projectId,
        bizUserId: bizUser.id,
        contentId: content.id,
        versionId: content.publishedVersionId,
      },
    });
  }

  async getFilterdEventData(eventId: string, data: any): Promise<any> {
    const attributes = await this.prisma.attributeOnEvent.findMany({
      where: { eventId },
      include: { attribute: true },
    });
    if (!attributes || attributes.length === 0) {
      return false;
    }

    const attrs = {};
    for (const key in data) {
      const isFind = attributes.find((attr) => attr.attribute.codeName === key);
      if (isFind) {
        attrs[key] = data[key];
      }
    }
    return attrs;
  }

  async trackEvent(data: any): Promise<any> {
    const { userId, token, eventName, sessionId, eventData } = data;
    const environmenet = await this.prisma.environment.findFirst({
      where: { token },
    });
    if (!environmenet) {
      return;
    }
    const environmentId = environmenet.id;
    const projectId = environmenet.projectId;
    const user = await this.prisma.bizUser.findFirst({
      where: { externalId: String(userId), environmentId },
    });
    if (!user) {
      return false;
    }
    const bizSession = await this.prisma.bizSession.findUnique({
      where: { id: sessionId },
      include: { content: true },
    });
    if (!bizSession || bizSession.state === 1) {
      return false;
    }
    const event = await this.prisma.event.findFirst({
      where: { codeName: eventName, projectId },
    });
    if (!event) {
      return false;
    }
    const events = await this.getFilterdEventData(event.id, eventData);
    if (!events) {
      return false;
    }

    const currentVersion = await this.prisma.version.findUnique({
      where: { id: bizSession.content.publishedVersionId },
      include: { steps: true },
    });

    if (!currentVersion || !isValidEvent(eventName, bizSession, events)) {
      return false;
    }

    const progress = getEventProgress(eventName, events.flow_step_progress);
    const state = getEventState(eventName);

    return await this.prisma.$transaction(async (tx) => {
      const insert = {
        bizUserId: user.id,
        eventId: event.id,
        data: events,
        bizSessionId: bizSession.id,
      };
      const bizEvent = await tx.bizEvent.create({
        data: insert,
      });
      await tx.bizSession.update({
        where: { id: bizSession.id },
        data: {
          progress,
          state,
        },
      });
      if (eventName === BizEvents.QUESTION_ANSWERED) {
        const answer: any = {
          bizEventId: bizEvent.id,
          contentId: currentVersion.contentId,
          cvid: events[EventAttributes.QUESTION_CVID],
          versionId: currentVersion.id,
          bizUserId: user.id,
          bizSessionId: bizSession.id,
        };
        if (events[EventAttributes.NUMBER_ANSWER]) {
          answer.numberAnswer = events[EventAttributes.NUMBER_ANSWER];
        }
        if (events[EventAttributes.TEXT_ANSWER]) {
          answer.textAnswer = events[EventAttributes.TEXT_ANSWER];
        }
        if (events[EventAttributes.LIST_ANSWER]) {
          answer.listAnswer = events[EventAttributes.LIST_ANSWER];
        }
        await tx.bizAnswer.create({
          data: answer,
        });
      }

      return bizEvent;
    });
  }
}
