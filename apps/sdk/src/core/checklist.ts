import { canCompleteChecklistItem } from '@usertour-ui/sdk';
import { ContentEditorClickableElement } from '@usertour-ui/shared-editor';
import {
  BizEvents,
  ChecklistData,
  ChecklistItemType,
  ContentActionsItemType,
  EventAttributes,
  RulesCondition,
  SDKContent,
} from '@usertour-ui/types';
import { evalCode } from '@usertour-ui/ui-utils';
import { ReportEventOptions } from '../types/content';
import { ChecklistStore } from '../types/store';
import { activedRulesConditions, checklistIsDimissed, isActive } from '../utils/conditions';
import { AppEvents } from '../utils/event';
import { App } from './app';
import { BaseContent } from './base-content';
import { defaultChecklistStore } from './common';

// Add interface for item status
interface ChecklistItemStatus {
  clicked: boolean;
  completed: boolean;
  visible: boolean;
}

export class Checklist extends BaseContent<ChecklistStore> {
  // Replace boolean flags with status enum
  private itemStatus: Map<string, ChecklistItemStatus> = new Map();
  constructor(instance: App, content: SDKContent) {
    super(instance, content, defaultChecklistStore);
  }

  async monitor() {
    await this.activeContentConditions();
    await this.itemConditionsMonitor();
    this.handleVisibilityState();
  }

  getReusedSessionId() {
    const content = this.getContent();
    if (!content.data || !content.events.length) {
      return null;
    }
    const isDismissed = checklistIsDimissed(content);
    if (isDismissed) {
      return null;
    }
    return content.events[0].bizSessionId;
  }

  private handleVisibilityState() {
    if (!this.hasStarted() || this.hasDismissed()) {
      return;
    }
    const { openState } = this.getStore().getSnapshot();
    if (this.isTemporarilyHidden()) {
      //hide checklist
      if (openState) {
        this.hide();
      }
      return;
    }

    //show checklist
    if (!openState) {
      this.open();
      this.trigger(AppEvents.CHECKLIST_FIRST_SEEN);
    }
  }

  show() {
    const storeData = this.buildStoreData();
    this.setStore({ ...storeData, openState: false });
  }

  refresh() {
    const { openState, ...storeData } = this.buildStoreData();
    this.updateStore({ ...storeData });
  }

  private buildStoreData() {
    const baseInfo = this.getStoreBaseInfo();
    const content = this.getContent();
    const data = content.data as ChecklistData;
    const isDismissed = checklistIsDimissed(content);

    const items = data.items.map((item) => ({
      ...item,
      isCompleted: isDismissed ? false : this.itemIsCompleted(item),
      isVisible: true,
    }));

    return {
      ...defaultChecklistStore,
      content: { ...content, data: { ...data, items } },
      openState: false,
      ...baseInfo,
    };
  }

  itemIsCompleted(item: ChecklistItemType) {
    return !!this.getContent().events.find(
      (event) =>
        event.event?.codeName === BizEvents.CHECKLIST_TASK_COMPLETED &&
        event.data.checklist_task_id === item.id,
    );
  }

  handleOnClick = async ({ type, data }: ContentEditorClickableElement) => {
    if (type === 'button' && data.actions) {
      await this.handleActions(data.actions);
    }
  };

  async handleActions(actions: RulesCondition[]) {
    for (const action of actions) {
      if (action.type === ContentActionsItemType.FLOW_START) {
        await this.startNewTour(action.data.contentId);
      } else if (action.type === ContentActionsItemType.PAGE_NAVIGATE) {
        this.handleNavigate(action.data);
      } else if (action.type === ContentActionsItemType.JAVASCRIPT_EVALUATE) {
        evalCode(action.data.value);
      } else if (action.type === ContentActionsItemType.CHECKLIST_DISMIS) {
        this.dismiss();
      }
    }
  }

  handleItemClick = (item: ChecklistItemType) => {
    this.handleActions(item.clickedActions);
    // Update item status when clicked
    this.updateItemStatus(item.id, {
      clicked: true,
    });
    this.trigger(BizEvents.CHECKLIST_TASK_CLICKED, { item });
  };

  private async itemConditionsMonitor() {
    const content = this.getStore().getSnapshot().content;
    if (!content) return;
    const data = content?.data as ChecklistData;
    const items = data?.items;
    if (!items?.length) return;

    let hasChanges = false;
    const updateItems = [...items];

    await Promise.all(
      items.map(async (item) => {
        // Get current item status
        const currentStatus = this.getItemStatus(item.id);
        // Get completed status
        const activedConditions = await activedRulesConditions(item.completeConditions, {
          'task-is-clicked': currentStatus.clicked,
        });
        const completed = item.isCompleted
          ? true
          : canCompleteChecklistItem(data.completionOrder, items, item) &&
            isActive(activedConditions);

        // Only check visibility conditions if onlyShowTask is true
        let visible = true;
        if (item.onlyShowTask) {
          const visibleConditions = await activedRulesConditions(item.onlyShowTaskConditions);
          visible = isActive(visibleConditions);
        }

        // Check if status actually changed
        if (currentStatus.completed !== completed || currentStatus.visible !== visible) {
          this.updateItemStatus(item.id, { completed, visible });

          // Update content array
          const itemIndex = updateItems.findIndex((i) => i.id === item.id);
          if (itemIndex !== -1) {
            updateItems[itemIndex] = {
              ...updateItems[itemIndex],
              isCompleted: completed,
              isVisible: visible,
            };
            hasChanges = true;
          }
        }
      }),
    );

    // Only update store if there were actual changes
    if (hasChanges) {
      this.updateStore({
        content: {
          ...content,
          data: {
            ...data,
            items: updateItems.filter((item) => item.isVisible !== false),
          },
        },
      });
      for (const item of updateItems) {
        if (item.isCompleted) {
          this.trigger(BizEvents.CHECKLIST_TASK_COMPLETED, { item });
        }
      }

      if (updateItems.every((item) => item.isCompleted)) {
        this.trigger(BizEvents.CHECKLIST_COMPLETED);
      }
    }
  }

  private getItemStatus(itemId: string): ChecklistItemStatus {
    // Return default status if item not found
    return (
      this.itemStatus.get(itemId) || {
        clicked: false,
        completed: false,
        visible: true,
      }
    );
  }

  private updateItemStatus(itemId: string, status: Partial<ChecklistItemStatus>) {
    const currentStatus = this.getItemStatus(itemId);
    this.itemStatus.set(itemId, {
      ...currentStatus,
      ...status,
    });
  }

  dismiss() {
    this.setDismissed(true);
    this.hide();
    this.trigger(BizEvents.CHECKLIST_DISMISSED);
  }

  async handleDismiss() {
    this.dismiss();
  }

  handleOpenChange(open: boolean) {
    this.trigger(open ? BizEvents.CHECKLIST_SEEN : BizEvents.CHECKLIST_HIDDEN);
  }

  destroy() {
    this.setStore(defaultChecklistStore);
  }

  async cancel() {}

  reset() {}

  initializeEventListeners() {
    this.once(BizEvents.CHECKLIST_DISMISSED, () => {
      this.reportDismissEvent();
    });
    this.once(AppEvents.CHECKLIST_FIRST_SEEN, () => {
      this.reportSeenEvent();
    });
    this.on(BizEvents.CHECKLIST_SEEN, () => {
      this.reportSeenEvent();
    });
    this.on(BizEvents.CHECKLIST_HIDDEN, () => {
      this.reportHiddenEvent();
    });
    this.once(AppEvents.CONTENT_AUTO_START_ACTIVATED, () => {
      this.reportStartEvent();
    });

    this.on(BizEvents.CHECKLIST_TASK_CLICKED, ({ item }: any) => {
      this.reportTaskClickEvent(item);
    });

    this.on(BizEvents.CHECKLIST_TASK_COMPLETED, ({ item }: any) => {
      this.reportTaskCompleteEvent(item);
    });

    this.once(BizEvents.CHECKLIST_COMPLETED, () => {
      this.reportChecklistEvent(BizEvents.CHECKLIST_COMPLETED);
    });
  }

  // Add helper method for common event reporting
  private async reportChecklistEvent(
    eventName: BizEvents,
    additionalData: Partial<Record<EventAttributes, any>> = {},
    options: ReportEventOptions = {},
  ) {
    const content = this.getContent();
    const baseEventData = {
      [EventAttributes.CHECKLIST_ID]: content.contentId,
      [EventAttributes.CHECKLIST_VERSION_NUMBER]: content.sequence,
      [EventAttributes.CHECKLIST_VERSION_ID]: content.id,
      [EventAttributes.CHECKLIST_NAME]: content.name,
    };

    await this.reportEventWithSession(
      {
        eventName,
        eventData: {
          ...baseEventData,
          ...additionalData,
        },
      },
      options,
    );
  }

  private async reportDismissEvent() {
    await this.reportChecklistEvent(BizEvents.CHECKLIST_DISMISSED, {
      [EventAttributes.CHECKLIST_END_REASON]: 'dismissed',
    });
  }

  private async reportSeenEvent() {
    await this.reportChecklistEvent(BizEvents.CHECKLIST_SEEN);
  }

  private async reportHiddenEvent() {
    await this.reportChecklistEvent(BizEvents.CHECKLIST_HIDDEN);
  }

  private async reportStartEvent() {
    await this.reportChecklistEvent(BizEvents.CHECKLIST_STARTED, {}, { isCreateSession: true });
  }

  private async reportTaskClickEvent(item: ChecklistItemType) {
    await this.reportChecklistEvent(BizEvents.CHECKLIST_TASK_CLICKED, {
      [EventAttributes.CHECKLIST_TASK_ID]: item.id,
      [EventAttributes.CHECKLIST_TASK_NAME]: item.name,
    });
  }

  private async reportTaskCompleteEvent(item: ChecklistItemType) {
    await this.reportChecklistEvent(BizEvents.CHECKLIST_TASK_COMPLETED, {
      [EventAttributes.CHECKLIST_TASK_ID]: item.id,
      [EventAttributes.CHECKLIST_TASK_NAME]: item.name,
    });
  }
}
