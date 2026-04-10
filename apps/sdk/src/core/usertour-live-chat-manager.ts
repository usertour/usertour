import {
  LiveChatProvider,
  ResourceCenterBlockType,
  ResourceCenterData,
  ResourceCenterLiveChatBlock,
} from '@usertour/types';
import { logger, timerManager } from '@/utils';

// ============================================================================
// Callbacks — the manager notifies the owner when provider state changes
// ============================================================================

export interface LiveChatManagerCallbacks {
  /** Called when the provider's chat widget is closed autonomously (by the user, not by force-close) */
  onProviderClose: () => void;
}

// ============================================================================
// UsertourLiveChatManager
// ============================================================================

export class UsertourLiveChatManager {
  private activeBlock: ResourceCenterLiveChatBlock | null = null;
  private sessionCleanup: (() => void) | null = null;

  constructor(private readonly callbacks: LiveChatManagerCallbacks) {}

  /** Whether a live chat provider session is currently active */
  get isActive(): boolean {
    return this.activeBlock !== null;
  }

  /**
   * Hide native launchers for all live chat providers in the resource center data.
   * Prevents duplicate floating buttons when the resource center takes over the launcher role.
   */
  configure(data: ResourceCenterData | undefined): void {
    if (!data?.tabs) return;

    const configured = new Set<LiveChatProvider>();
    for (const tab of data.tabs) {
      for (const block of tab.blocks) {
        if (block.type === ResourceCenterBlockType.LIVE_CHAT) {
          const provider = (block as ResourceCenterLiveChatBlock).liveChatProvider;
          if (!configured.has(provider)) {
            configured.add(provider);
            this.hideLauncher(provider);
          }
        }
      }
    }
  }

  /**
   * Open a live chat provider widget and listen for close events.
   * Automatically tears down any previously active session.
   */
  open(block: ResourceCenterLiveChatBlock): void {
    this.teardownSession();
    this.activeBlock = block;

    if (block.liveChatProvider === LiveChatProvider.HUBSPOT) {
      this.sessionCleanup = this.openHubSpot(() => this.handleProviderClose());
    } else {
      this.openWidget(block);
      this.sessionCleanup = this.listenClose(block, () => this.handleProviderClose());
    }
  }

  /**
   * Force-close the active live chat provider widget.
   * Does NOT trigger onProviderClose callback — the caller manages its own state update.
   */
  close(): void {
    if (!this.activeBlock) return;

    this.closeWidget(this.activeBlock);
    this.teardownSession();
    this.activeBlock = null;
  }

  /** Release all resources (timers, observers, listeners) */
  dispose(): void {
    if (this.activeBlock) {
      this.closeWidget(this.activeBlock);
    }
    this.teardownSession();
    this.activeBlock = null;
  }

  // ── Provider close handling ────────────────────────────────────────

  private handleProviderClose(): void {
    this.teardownSession();
    this.activeBlock = null;
    this.callbacks.onProviderClose();
  }

  private teardownSession(): void {
    this.sessionCleanup?.();
    this.sessionCleanup = null;
  }

  // ── Hide native launcher per provider ──────────────────────────────

  private hideLauncher(provider: LiveChatProvider): void {
    const w = window as any;
    switch (provider) {
      case LiveChatProvider.CRISP:
        w.$crisp?.push(['do', 'chat:hide']);
        break;
      case LiveChatProvider.INTERCOM:
        w.Intercom?.('update', { hide_default_launcher: true });
        break;
      case LiveChatProvider.ZENDESK_CLASSIC:
        w.zE?.('webWidget', 'hide');
        break;
      case LiveChatProvider.ZENDESK_MESSENGER:
        w.zE?.('messenger', 'hide');
        break;
      case LiveChatProvider.FRESHCHAT:
        if (w.FreshworksWidget) {
          w.FreshworksWidget('hide', 'launcher');
        } else {
          (w.fcWidget ?? w.fdWidget)?.hide?.();
        }
        break;
      case LiveChatProvider.HELP_SCOUT:
        w.Beacon?.('config', { display: { style: 'manual' } });
        break;
      case LiveChatProvider.HUBSPOT:
        this.setHubSpotVisibility('hidden');
        break;
    }
  }

  // ── Open provider widget ───────────────────────────────────────────

  private openWidget(block: ResourceCenterLiveChatBlock): void {
    const w = window as any;
    switch (block.liveChatProvider) {
      case LiveChatProvider.CRISP:
        w.$crisp?.push(['do', 'chat:open']);
        break;
      case LiveChatProvider.INTERCOM:
        w.Intercom?.('show');
        break;
      case LiveChatProvider.ZENDESK_CLASSIC:
        w.zE?.('webWidget', 'open');
        break;
      case LiveChatProvider.ZENDESK_MESSENGER:
        w.zE?.('messenger', 'open');
        break;
      case LiveChatProvider.FRESHCHAT:
        if (w.FreshworksWidget) {
          w.FreshworksWidget('open');
        } else {
          (w.fcWidget ?? w.fdWidget)?.open?.();
        }
        break;
      case LiveChatProvider.HELP_SCOUT:
        w.Beacon?.('open');
        break;
      case LiveChatProvider.CUSTOM:
        if (block.customLiveChatCode) {
          try {
            new Function(block.customLiveChatCode)();
          } catch (e) {
            logger.error('Custom live chat code error:', e);
          }
        }
        break;
    }
  }

  // ── Close provider widget ──────────────────────────────────────────

  private closeWidget(block: ResourceCenterLiveChatBlock): void {
    const w = window as any;
    switch (block.liveChatProvider) {
      case LiveChatProvider.CRISP:
        w.$crisp?.push(['do', 'chat:close']);
        w.$crisp?.push(['do', 'chat:hide']);
        break;
      case LiveChatProvider.INTERCOM:
        w.Intercom?.('hide');
        break;
      case LiveChatProvider.ZENDESK_CLASSIC:
        w.zE?.('webWidget', 'close');
        w.zE?.('webWidget', 'hide');
        break;
      case LiveChatProvider.ZENDESK_MESSENGER:
        w.zE?.('messenger', 'close');
        break;
      case LiveChatProvider.FRESHCHAT:
        if (w.FreshworksWidget) {
          w.FreshworksWidget('close');
        } else {
          (w.fcWidget ?? w.fdWidget)?.close?.();
        }
        break;
      case LiveChatProvider.HELP_SCOUT:
        w.Beacon?.('close');
        break;
      case LiveChatProvider.HUBSPOT:
        w.HubSpotConversations?.widget?.close?.();
        this.setHubSpotVisibility('hidden');
        break;
      case LiveChatProvider.CUSTOM:
        break;
    }
  }

  // ── Listen for provider close events ───────────────────────────────

  private listenClose(
    block: ResourceCenterLiveChatBlock,
    onClose: () => void,
  ): (() => void) | null {
    const w = window as any;
    switch (block.liveChatProvider) {
      case LiveChatProvider.CRISP:
        w.$crisp?.push(['on', 'chat:closed', onClose]);
        return () => w.$crisp?.push(['off', 'chat:closed']);
      case LiveChatProvider.INTERCOM:
        w.Intercom?.('onHide', onClose);
        return null;
      case LiveChatProvider.ZENDESK_CLASSIC:
        w.zE?.('webWidget:on', 'close', onClose);
        return () => w.zE?.('webWidget:on', 'close', () => {});
      case LiveChatProvider.ZENDESK_MESSENGER:
        w.zE?.('messenger:on', 'close', onClose);
        return () => w.zE?.('messenger:on', 'close', () => {});
      case LiveChatProvider.FRESHCHAT:
        if (w.FreshworksWidget) {
          w.FreshworksWidget('onClose', onClose);
        } else {
          (w.fcWidget ?? w.fdWidget)?.on?.('widget:closed', onClose);
        }
        return null;
      case LiveChatProvider.HELP_SCOUT:
        w.Beacon?.('on', 'close', onClose);
        return () => w.Beacon?.('off', 'close');
      default:
        return null;
    }
  }

  // ── HubSpot: MutationObserver + CSS visibility + ready polling ─────

  private static readonly HUBSPOT_CONTAINER_ID = 'hubspot-messages-iframe-container';
  private static readonly HUBSPOT_POLL_TIMER_ID = 'live-chat-hubspot-poll';

  private setHubSpotVisibility(value: 'visible' | 'hidden'): void {
    document
      .getElementById(UsertourLiveChatManager.HUBSPOT_CONTAINER_ID)
      ?.style.setProperty('visibility', value, 'important');
  }

  private openHubSpot(onClose: () => void): () => void {
    const timerId = UsertourLiveChatManager.HUBSPOT_POLL_TIMER_ID;
    let observer: MutationObserver | null = null;
    let disposed = false;

    const setup = () => {
      const w = window as any;
      const container = document.getElementById(UsertourLiveChatManager.HUBSPOT_CONTAINER_ID);
      if (!w.HubSpotConversations || !container) return;

      // API and DOM both ready — stop polling
      timerManager.clearInterval(timerId);
      if (disposed) return;

      // Open the chat
      this.setHubSpotVisibility('visible');
      w.HubSpotConversations.widget.open();

      // Detect close via MutationObserver on .hs-shadow-container.active
      let isOpen = true;
      const checkState = () => {
        const active = !!container.querySelector('.hs-shadow-container.active');
        if (isOpen && !active) {
          isOpen = false;
          this.setHubSpotVisibility('hidden');
          onClose();
        } else if (!isOpen && active) {
          isOpen = true;
        }
      };

      observer = new MutationObserver(checkState);
      observer.observe(container, {
        attributes: true,
        subtree: true,
        attributeFilter: ['class'],
      });
    };

    // Poll every 100ms until HubSpotConversations + DOM are ready
    timerManager.setInterval(timerId, setup, 100);
    setup();

    return () => {
      disposed = true;
      timerManager.clearInterval(timerId);
      observer?.disconnect();
      observer = null;
    };
  }
}
