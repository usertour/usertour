import {
  RiBarChartLine,
  RiCalendarLine,
  RiCheckLine,
  RiHeadphoneLine,
  RiInboxLine,
  RiLockLine,
  RiMailLine,
  RiMessageLine,
  RiNewspaperLine,
  RiPaintBrushLine,
  RiRouteLine,
  RiSendPlaneLine,
  RiStackLine,
  RiTeamLine,
} from '@usertour/icons';
import { Button } from '@usertour/button';
import { Switch } from '@usertour/switch';
import { Fragment, useState, useEffect } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { cn } from '@usertour/tailwind';
import { useCreateCheckoutSessionMutation, useCreatePortalSessionMutation } from '@usertour/hooks';
import { Separator } from '@usertour/separator';
import { Progress } from '@usertour/progress';
import { Skeleton } from '@usertour/skeleton';
import { QuestionTooltip } from '@usertour/tooltip';
import { PLAN_FEATURES } from '@usertour/constants';
import { resolvePlanFeatures } from '@usertour/helpers';
import { PlanType, type PlanFeatures } from '@usertour/types';
import { useSubscriptionContext } from '@/contexts/subscription-context';

// Define plan type
interface Plan {
  /** Stable English identifier ('Hobby' | 'Starter' | 'Growth' | 'Business')
      used for tier comparison + checkout planType arg. Display name is
      `displayName`. */
  name: string;
  displayName: string;
  price: string;
  description: string;
  isCurrentPlan?: boolean;
  yearlyPrice: string;
  features: {
    icon: React.ElementType;
    text: string;
  }[];
  buttonText: string;
  buttonLink?: string;
  buttonClassName?: string;
  showSpacing: boolean;
  buttonVariant?: 'default' | 'secondary';
  disabled: boolean;
}

// Define comparison section type
interface ComparisonSection {
  icon: React.ElementType;
  title: string;
  features: {
    name: string;
    values: (string | boolean | { count: string; price: string | null })[];
  }[];
}

interface SessionValue {
  count: string;
  price: string | null;
}

// const primaryButtonClassName =
//   'border border-transparent bg-zinc-950/90 text-white/90 hover:bg-zinc-950/80 dark:bg-white dark:text-zinc-950 dark:hover:bg-white/90';
const secondaryButtonClassName =
  'border border-zinc-950/10 bg-white text-zinc-950/70 hover:bg-zinc-950/5 dark:border-white/10 dark:bg-transparent dark:text-white/70 dark:hover:bg-white/5';

// Static metadata for each plan card — pricing copy, button styling, and
// support tier label. The numeric features (sessions, team, retention,
// envs, API rate) and the No-branding row are derived from the
// PLAN_FEATURES matrix at render time so the card reflects the user's
// effective benefits (base + any per-subscription override).
interface PlanMeta {
  /** Identifier for this plan — matches keys in settings.billing.plans.* */
  name: string;
  planType: PlanType;
  price: string;
  yearlyPrice: string;
  /** i18n key for description copy; resolved at render time. */
  descriptionKey: string;
  /** i18n key for the primary button label. */
  buttonTextKey: string;
  buttonVariant: 'default' | 'secondary';
  buttonClassName: string;
  showSpacing: boolean;
  disabled: boolean;
  /** Identifier of the previous tier (used in "Everything in X, plus"). */
  prevPlanName?: string;
  /** i18n key for the support tier label. */
  supportTextKey: string;
  supportIcon: React.ElementType;
}

const PLAN_META: PlanMeta[] = [
  {
    name: 'Hobby',
    planType: PlanType.HOBBY,
    price: '$0',
    yearlyPrice: '$0',
    descriptionKey: 'settings.billing.planDescriptions.hobby',
    buttonTextKey: 'settings.billing.buttons.getStarted',
    buttonVariant: 'secondary',
    buttonClassName: secondaryButtonClassName,
    showSpacing: false,
    disabled: false,
    supportTextKey: 'settings.billing.support.community',
    supportIcon: RiMessageLine,
  },
  {
    name: 'Starter',
    planType: PlanType.STARTER,
    price: '$59',
    yearlyPrice: '$49',
    descriptionKey: 'settings.billing.planDescriptions.starter',
    buttonTextKey: 'settings.billing.buttons.upgrade',
    buttonVariant: 'secondary',
    buttonClassName: secondaryButtonClassName,
    showSpacing: false,
    disabled: false,
    prevPlanName: 'Hobby',
    supportTextKey: 'settings.billing.support.email',
    supportIcon: RiMailLine,
  },
  {
    name: 'Growth',
    planType: PlanType.GROWTH,
    price: '$119',
    yearlyPrice: '$99',
    descriptionKey: 'settings.billing.planDescriptions.growth',
    buttonTextKey: 'settings.billing.buttons.upgrade',
    buttonVariant: 'default',
    buttonClassName: '',
    showSpacing: false,
    disabled: false,
    prevPlanName: 'Starter',
    supportTextKey: 'settings.billing.support.email',
    supportIcon: RiMailLine,
  },
  {
    name: 'Business',
    planType: PlanType.BUSINESS,
    price: '$249',
    yearlyPrice: '$207',
    descriptionKey: 'settings.billing.planDescriptions.business',
    buttonTextKey: 'settings.billing.buttons.upgrade',
    buttonVariant: 'secondary',
    buttonClassName: secondaryButtonClassName,
    showSpacing: false,
    disabled: false,
    prevPlanName: 'Growth',
    supportTextKey: 'settings.billing.support.priority',
    supportIcon: RiHeadphoneLine,
  },
];

// Features used to render a plan card. The user's overridePlan only
// makes sense for the *current* plan — a CS-granted session bump
// belongs to that specific subscription, not to a "what would Starter
// give me if I switched" comparison. Other plans render their base
// offering so the card reads like the standard marketing tier.
function cardFeaturesFor(
  planType: PlanType,
  currentPlanType: PlanType,
  overridePlan: unknown,
): PlanFeatures {
  if (planType === currentPlanType && planType !== PlanType.HOBBY) {
    return resolvePlanFeatures(planType, overridePlan);
  }
  return PLAN_FEATURES[planType];
}

function buildCardFeatures(meta: PlanMeta, features: PlanFeatures, t: TFunction): Plan['features'] {
  const items: Plan['features'] = [];
  if (meta.prevPlanName) {
    items.push({
      icon: RiCheckLine,
      text: t('settings.billing.cardFeatures.everythingIn', {
        plan: t(`settings.billing.plans.${meta.prevPlanName.toLowerCase()}`),
      }),
    });
  } else {
    items.push({
      icon: RiNewspaperLine,
      text: t('settings.billing.cardFeatures.unlimitedContent'),
    });
  }
  items.push({
    icon: RiBarChartLine,
    text: t('settings.billing.cardFeatures.sessions', {
      value: formatLimit(features.sessionsLimit),
    }),
  });
  items.push({
    icon: RiTeamLine,
    text:
      features.teamMemberLimit === 'unlimited'
        ? t('settings.billing.cardFeatures.teamMembersUnlimited')
        : t('settings.billing.cardFeatures.teamMembers', { value: features.teamMemberLimit }),
  });
  items.push({
    icon: RiCalendarLine,
    text:
      features.dataRetentionYears === 'unlimited'
        ? t('settings.billing.cardFeatures.dataRetentionUnlimited')
        : t('settings.billing.cardFeatures.dataRetentionYears', {
            value: features.dataRetentionYears,
          }),
  });
  items.push({
    icon: RiStackLine,
    text:
      features.environmentLimit === 'unlimited'
        ? t('settings.billing.cardFeatures.environmentsUnlimited')
        : t('settings.billing.cardFeatures.environments', { value: features.environmentLimit }),
  });
  items.push({
    icon: RiRouteLine,
    text: t('settings.billing.cardFeatures.apiRate', { rate: features.apiRateLimit }),
  });
  items.push({ icon: meta.supportIcon, text: t(meta.supportTextKey) });
  // No Usertour-branding (and future per-tier gates like SSO / audit
  // logs) lives only in the comparison table below — keeping each card
  // to a fixed row count avoids the bottom-left blank gutter that
  // appears when some cards have one extra feature.
  return items;
}

interface PlanCardProps {
  plan: Plan;
  isYearly: boolean;
  projectId: string;
  currentPlanType?: string;
}

// Plan Card Component
const PlanCard = (props: PlanCardProps) => {
  const { plan, isYearly, projectId, currentPlanType } = props;
  const { invoke: createCheckout, loading: checkoutLoading } = useCreateCheckoutSessionMutation();
  const { invoke: createPortalSession } = useCreatePortalSessionMutation();
  const { t } = useTranslation();

  const isCurrentPlan = currentPlanType?.toLowerCase() === plan.name.toLowerCase();

  // Add logic to determine if this plan is higher or lower than current plan
  const getPlanLevel = (planName: string) => {
    const planLevels = ['hobby', 'starter', 'growth', 'business'];
    return planLevels.indexOf(planName.toLowerCase());
  };

  const currentPlanLevel = currentPlanType ? getPlanLevel(currentPlanType) : -1;
  const thisPlanLevel = getPlanLevel(plan.name);
  const isHigherPlan = thisPlanLevel > currentPlanLevel;
  const isLowerPlan = thisPlanLevel < currentPlanLevel;

  const getButtonText = () => {
    if (isCurrentPlan) return t('settings.billing.buttons.currentPlan');
    if (isHigherPlan) return t('settings.billing.buttons.upgrade');
    if (isLowerPlan) return t('settings.billing.buttons.downgrade');
    return plan.buttonText;
  };

  const handleButtonClick = async () => {
    if (plan.buttonLink) {
      window.location.href = plan.buttonLink;
      return;
    }
    if (!projectId) {
      console.error('Project ID is not available');
      return;
    }

    // If current plan is not hobby, redirect to portal
    if (currentPlanType && currentPlanType.toLowerCase() !== 'hobby') {
      try {
        const url = await createPortalSession(projectId);
        window.location.href = url;
      } catch (error) {
        console.error('Failed to create portal session:', error);
        // TODO: Add error notification
      }
      return;
    }

    // For hobby plan, create checkout session
    try {
      const url = await createCheckout({
        projectId,
        planType: plan.name.toLowerCase(),
        interval: isYearly ? 'yearly' : 'monthly',
      });
      window.location.href = url;
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      // TODO: Add error notification
    }
  };

  return (
    <section
      className={`relative flex h-fit flex-col gap-5 rounded-2xl h-full ${
        isCurrentPlan
          ? 'bg-zinc-950/5 dark:bg-white/10'
          : 'border border-zinc-950/5 dark:border-white/10'
      } p-5`}
    >
      {isCurrentPlan && (
        <div className="absolute right-4 top-4 h-[21px] rounded-md bg-green-600 px-1.5 text-xs font-semibold text-white dark:bg-green-500">
          <p className="translate-y-[3px] uppercase">{t('settings.billing.currentPlanBadge')}</p>
        </div>
      )}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col">
          <h3 className="flex items-center font-semibold text-zinc-950 dark:text-white">
            {plan.displayName}
          </h3>
          <p className="mt-1.5">
            <span className="align-baseline text-2xl font-semibold text-zinc-950 dark:text-white">
              {isYearly ? plan.yearlyPrice : plan.price}
            </span>
            {plan.price !== 'Custom Pricing' && (
              <span className="align-baseline text-sm text-zinc-950/50 dark:text-white/50">
                {t('settings.billing.perMonth')}
              </span>
            )}
          </p>
          <p className="mt-4 line-clamp-3 min-h-[40px] max-w-full text-sm text-zinc-950/70 dark:text-white/50">
            {plan.description}
          </p>
        </div>
      </div>
      <div className="grid auto-rows-fr gap-2">
        <div className={cn('h-5 ', plan.showSpacing ? 'hidden lg:block' : 'hidden')} />
      </div>
      {plan.buttonLink ? (
        <a target="_self" className="flex" href={plan.buttonLink}>
          <Button
            disabled={isCurrentPlan}
            className="inline-flex h-10 w-full min-w-[40px] select-none items-center justify-center gap-0.5 rounded-[10px] border border-zinc-950/10 bg-white px-2.5 text-sm text-zinc-950/70 ring-zinc-950/10 ring-offset-transparent hover:bg-zinc-950/5 focus:bg-white focus:ring disabled:pointer-events-none dark:border-white/10 dark:bg-transparent dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white/90"
          >
            {plan.buttonText}
          </Button>
        </a>
      ) : (
        <Button
          variant={plan.buttonVariant}
          className={cn(
            'inline-flex h-10 w-full min-w-[40px] select-none items-center justify-center gap-0.5 rounded-[10px] px-2.5 text-sm',
            plan.buttonClassName,
          )}
          onClick={handleButtonClick}
          disabled={checkoutLoading || isCurrentPlan || plan.disabled}
        >
          {checkoutLoading
            ? t('settings.billing.buttons.loading')
            : plan.disabled
              ? t('settings.billing.buttons.comingSoon')
              : getButtonText()}
        </Button>
      )}
      <div className="grid auto-rows-fr gap-3.5 text-sm text-zinc-600 dark:text-zinc-400">
        {plan.features.map((feature) => (
          <div key={feature.text} className="flex items-center gap-2">
            <feature.icon className="size-4" />
            <span className="line-clamp-1">{feature.text}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

// Plan column order in the comparison table (matches the 4 visible plans
// — enterprise lives in the matrix but isn't a cloud pricing tier).
const COMPARISON_PLANS: PlanType[] = [
  PlanType.HOBBY,
  PlanType.STARTER,
  PlanType.GROWTH,
  PlanType.BUSINESS,
];

const formatLimit = (
  value: PlanFeatures['sessionsLimit'] | PlanFeatures['teamMemberLimit'],
): string => (value === 'unlimited' ? 'Unlimited' : String(value));

const localizedLimit = (
  value: PlanFeatures['sessionsLimit'] | PlanFeatures['teamMemberLimit'],
  t: TFunction,
): string => (value === 'unlimited' ? t('settings.billing.unlimited') : String(value));

const formatYears = (value: PlanFeatures['dataRetentionYears'], t: TFunction): string => {
  if (value === 'unlimited') return t('settings.billing.unlimited');
  return value === 1 ? t('settings.billing.yearOne') : t('settings.billing.yearsN', { value });
};

// Pull a feature value across the 4 visible plans, in column order.
// Mirrors cardFeaturesFor: the current plan's column gets effective
// (base + override) so the user sees their actual benefits, every other
// column stays base for honest side-by-side comparison.
const matrixRow = <K extends keyof PlanFeatures>(
  key: K,
  currentPlanType: PlanType,
  overridePlan: unknown,
): PlanFeatures[K][] =>
  COMPARISON_PLANS.map((plan) => cardFeaturesFor(plan, currentPlanType, overridePlan)[key]);

// Comparison Table Component
const ComparisonTable = ({
  isYearly,
  plans,
  currentPlanType,
  overridePlan,
}: {
  isYearly: boolean;
  plans: Plan[];
  currentPlanType: PlanType;
  overridePlan: unknown;
}) => {
  const { t } = useTranslation();
  const unlimitedRow = Array.from({ length: 4 }, () => t('settings.billing.unlimited'));
  // Define comparison data
  const sections: ComparisonSection[] = [
    {
      icon: RiPaintBrushLine,
      title: t('settings.billing.comparison.sections.usage'),
      features: [
        {
          name: t('settings.billing.comparison.rows.price'),
          values: plans.map(
            (plan) =>
              `${isYearly ? plan.yearlyPrice : plan.price}${t('settings.billing.perMonth')}`,
          ),
        },
        {
          name: t('settings.billing.comparison.rows.endUsers'),
          values: unlimitedRow,
        },
        {
          name: t('settings.billing.comparison.rows.sessions'),
          values: matrixRow('sessionsLimit', currentPlanType, overridePlan).map((value) => ({
            count: localizedLimit(value, t),
            price: null,
          })),
        },
        {
          name: t('settings.billing.comparison.rows.dataRetention'),
          values: matrixRow('dataRetentionYears', currentPlanType, overridePlan).map((v) =>
            formatYears(v, t),
          ),
        },
        {
          name: t('settings.billing.comparison.rows.environments'),
          values: matrixRow('environmentLimit', currentPlanType, overridePlan).map((v) =>
            localizedLimit(v, t),
          ),
        },
        {
          name: t('settings.billing.comparison.rows.apiRate'),
          values: matrixRow('apiRateLimit', currentPlanType, overridePlan).map(String),
        },
        {
          name: t('settings.billing.comparison.rows.upgradeable'),
          values: [true, true, true, true],
        },
      ],
    },
    {
      icon: RiInboxLine,
      title: t('settings.billing.comparison.sections.content'),
      features: [
        { name: t('settings.billing.comparison.rows.flows'), values: unlimitedRow },
        { name: t('settings.billing.comparison.rows.checklists'), values: unlimitedRow },
        { name: t('settings.billing.comparison.rows.launchers'), values: unlimitedRow },
        { name: t('settings.billing.comparison.rows.surveys'), values: unlimitedRow },
        { name: t('settings.billing.comparison.rows.banners'), values: unlimitedRow },
        { name: t('settings.billing.comparison.rows.eventTrackers'), values: unlimitedRow },
        { name: t('settings.billing.comparison.rows.resourceCenter'), values: unlimitedRow },
        {
          name: t('settings.billing.comparison.rows.noBranding'),
          values: matrixRow('removeBranding', currentPlanType, overridePlan),
        },
      ],
    },
    {
      icon: RiTeamLine,
      title: t('settings.billing.comparison.sections.team'),
      features: [
        {
          name: t('settings.billing.comparison.rows.teamMembers'),
          values: matrixRow('teamMemberLimit', currentPlanType, overridePlan).map((v) =>
            localizedLimit(v, t),
          ),
        },
      ],
    },
    {
      icon: RiSendPlaneLine,
      title: t('settings.billing.comparison.sections.features'),
      features: [
        {
          name: t('settings.billing.comparison.rows.customTheming'),
          values: [true, true, true, true],
        },
        {
          name: t('settings.billing.comparison.rows.customAttributes'),
          values: [true, true, true, true],
        },
        {
          name: t('settings.billing.comparison.rows.flowTriggering'),
          values: [true, true, true, true],
        },
        {
          name: t('settings.billing.comparison.rows.versionHistory'),
          values: [true, true, true, true],
        },
        {
          name: t('settings.billing.comparison.rows.companyProfiles'),
          values: [true, true, true, true],
        },
        {
          name: t('settings.billing.comparison.rows.localization'),
          values: [true, true, true, true],
        },
        {
          name: t('settings.billing.comparison.rows.integrations'),
          values: [true, true, true, true],
        },
        { name: t('settings.billing.comparison.rows.alerting'), values: [true, true, true, true] },
      ],
    },
    {
      icon: RiLockLine,
      title: t('settings.billing.comparison.sections.support'),
      features: [
        { name: t('settings.billing.support.community'), values: [true, true, true, true] },
        { name: t('settings.billing.support.email'), values: [false, true, true, true] },
        { name: t('settings.billing.support.priority'), values: [false, false, false, true] },
      ],
    },
  ];

  return (
    <div className="my-8 grid gap-y-3">
      {/* Table header */}
      <div className="grid grid-cols-5 text-zinc-950/90 dark:text-white/90">
        <div />
        {(['hobby', 'starter', 'growth', 'business'] as const).map((plan) => (
          <div key={plan} className="flex flex-col gap-2 p-4">
            <p className="text-sm font-semibold">{t(`settings.billing.plans.${plan}`)}</p>
          </div>
        ))}
      </div>

      {/* Table sections */}
      {sections.map((section) => (
        <div key={section.title} className="grid grid-cols-5 gap-y-3 text-sm">
          {/* Section header */}
          <div className="col-span-5 flex items-center gap-2 py-4 text-base text-zinc-950/90 dark:text-white/90">
            <section.icon className="size-4" />
            {section.title}
          </div>

          {/* Section features */}
          {section.features.map((feature) => (
            <Fragment key={feature.name}>
              <p className="border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/50">
                {feature.name}
              </p>
              {feature.values.map((value, index) => (
                <div
                  key={`${feature.name}-${index}`}
                  className="mx-4 border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/70"
                >
                  {typeof value === 'boolean' ? (
                    value ? (
                      <div className="pt-1">
                        <RiCheckLine className="size-4" />
                      </div>
                    ) : null
                  ) : (
                    <div className="flex flex-col">
                      <p className="text-zinc-950/60 dark:text-white/60">
                        {typeof value === 'object' && 'count' in value
                          ? (value as SessionValue).count
                          : (value as string)}
                      </p>
                      {typeof value === 'object' &&
                        'price' in value &&
                        (value as SessionValue).price && (
                          <p className="text-xs text-zinc-950/40 dark:text-white/40 mt-1">
                            {(value as SessionValue).price}
                          </p>
                        )}
                    </div>
                  )}
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      ))}
    </div>
  );
};

const Pricing = ({ projectId }: { projectId: string }) => {
  const [isYearly, setIsYearly] = useState(false);
  const {
    subscription,
    currentUsage,
    totalLimit,
    planType,
    loading: subscriptionLoading,
  } = useSubscriptionContext();
  const { invoke: createPortalSession } = useCreatePortalSessionMutation();
  const { invoke: createCheckout } = useCreateCheckoutSessionMutation();
  const { t } = useTranslation();

  const isUnlimitedSessions = totalLimit === 'unlimited';
  const percent = isUnlimitedSessions ? 0 : (currentUsage / totalLimit) * 100;

  // Derive each plan's display features at render time. Only the
  // current plan card shows effective features (base + override); other
  // cards stay base so they read as standard offerings — a CS-granted
  // session boost on Growth shouldn't make the Starter / Business
  // cards claim the same number.
  const plans: Plan[] = PLAN_META.map((meta) => ({
    name: meta.name,
    displayName: t(`settings.billing.plans.${meta.name.toLowerCase()}`),
    price: meta.price,
    yearlyPrice: meta.yearlyPrice,
    description: t(meta.descriptionKey),
    buttonText: t(meta.buttonTextKey),
    buttonVariant: meta.buttonVariant,
    buttonClassName: meta.buttonClassName,
    showSpacing: meta.showSpacing,
    disabled: meta.disabled,
    features: buildCardFeatures(
      meta,
      cardFeaturesFor(meta.planType, planType, subscription?.overridePlan),
      t,
    ),
  }));

  // Update isYearly when subscription data is loaded
  useEffect(() => {
    if (subscription?.interval) {
      setIsYearly(subscription.interval === 'yearly');
    }
  }, [subscription?.interval]);

  const handleManageSubscription = async () => {
    try {
      // If current plan is hobby or no plan, create checkout session for upgrade
      if (!subscription?.planType || subscription?.planType === PlanType.HOBBY) {
        const url = await createCheckout({
          projectId,
          planType: PlanType.STARTER,
          interval: isYearly ? 'yearly' : 'monthly',
        });
        window.location.href = url;
      } else {
        // For other plans, create portal session for management
        const url = await createPortalSession(projectId);
        window.location.href = url;
      }
    } catch (error) {
      console.error('Failed to create session:', error);
      // TODO: Add error notification
    }
  };

  return (
    <>
      <div className="flex flex-col divide-zinc-950/5 dark:divide-white/5">
        <div className="py-8 grid grid-cols-1 sm:grid-cols-8 gap-x-12 gap-y-4">
          <div className="col-span-3 flex flex-col gap-1">
            <div className="flex flex-wrap gap-2">
              <h1 className="text-zinc-950/90 dark:text-white/90">
                {t('settings.billing.sections.billingPlan')}
              </h1>
            </div>
            <h2 className="text-zinc-950/50 dark:text-white/50 text-sm">
              {t('settings.billing.sections.billingPlanDescription')}
            </h2>
          </div>
          <div className="flex flex-col col-span-5 space-y-2 p-4 pt-1 xl:p-4 rounded-xl bg-zinc-950/5 dark:bg-white/5">
            <div className="flex max-xl:flex-col max-xl:gap-y-3 justify-center xl:items-center xl:justify-between">
              <div className="flex items-center gap-2 grow">
                <div className="flex flex-col w-full">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-950 dark:text-white">
                    {subscriptionLoading ? (
                      <div className="flex items-center gap-1.5">
                        <Skeleton className="h-4 w-20 bg-background" />
                        <Skeleton className="h-4 w-16 bg-background" />
                      </div>
                    ) : (
                      <>
                        <span>{t('settings.billing.usage.currentPlanLabel')}</span>
                        <span className="font-normal text-zinc-950/60 dark:text-white/50 capitalize">
                          {planType}
                        </span>
                        {subscription?.cancelAt && (
                          <span className="text-red-500">
                            {t('settings.billing.usage.expiresOn', {
                              date: new Date(
                                Number.parseInt(subscription.cancelAt),
                              ).toLocaleDateString(),
                            })}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  {subscriptionLoading ? (
                    <div className="flex flex-col gap-1 text-xs mt-2">
                      <div className="flex items-center gap-4 w-full">
                        <Skeleton className="h-1 grow max-w-60 bg-background" />
                        <Skeleton className="h-4 w-16 bg-background" />
                      </div>
                      <div className="flex items-center gap-1 text-zinc-950/40 dark:text-white/40">
                        <Skeleton className="h-3 w-20 bg-background" />
                        <Skeleton className="h-3 w-4 bg-background" />
                        <Skeleton className="h-3 w-16 bg-background" />
                        <Skeleton className="h-3 w-4 bg-background" />
                        <Skeleton className="h-3 w-24 bg-background" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 text-xs mt-2">
                      <div className="flex items-center gap-4 w-full">
                        <Progress
                          value={isUnlimitedSessions ? 0 : Math.min(percent, 100)}
                          className="h-1 grow max-w-60"
                        />
                        <span className="text-zinc-950/60 dark:text-white/50 flex-none">
                          {currentUsage} /{' '}
                          {isUnlimitedSessions ? t('settings.billing.unlimited') : totalLimit}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-zinc-950/40 dark:text-white/40">
                        <span>{t('settings.billing.usage.monthlySessions')}</span>
                        {!isUnlimitedSessions && (
                          <>
                            <span>•</span>
                            <span>
                              {t('settings.billing.usage.percentUsed', {
                                percent: percent.toFixed(2),
                              })}
                            </span>
                            <span>•</span>
                            <span>
                              {currentUsage < totalLimit * 0.8
                                ? t('settings.billing.usage.efficientUsage')
                                : t('settings.billing.usage.considerUpgrading')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <Button
                className="text-sm gap-0.5 inline-flex items-center justify-center rounded-[10px] disabled:pointer-events-none select-none border border-transparent bg-zinc-950/90 hover:bg-zinc-950/80 ring-zinc-950/10 dark:bg-white dark:hover:bg-white/90 text-white/90 px-2 min-w-[36px] h-9 dark:text-zinc-950 flex-none"
                onClick={handleManageSubscription}
                disabled={subscriptionLoading}
              >
                <div className="px-1">
                  {subscription?.cancelAt !== undefined && subscription?.cancelAt !== null
                    ? t('settings.billing.buttons.renewSubscription')
                    : !subscription?.planType || subscription?.planType === PlanType.HOBBY
                      ? t('settings.billing.buttons.upgrade')
                      : t('settings.billing.buttons.manageSubscription')}
                </div>
                <div className="w-4 h-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-arrow-up-right"
                  >
                    <title>Upgrade</title>
                    <path d="M7 7h10v10" />
                    <path d="M7 17 17 7" />
                  </svg>
                </div>
              </Button>
            </div>
            {percent >= 100 && (
              <div className="flex items-center gap-1 text-red-500 text-sm font-medium">
                <span>{t('settings.billing.usage.exceededWarning')}</span>
                <QuestionTooltip>{t('settings.billing.usage.hiddenAfterExceed')}</QuestionTooltip>
              </div>
            )}
          </div>
        </div>
        <Separator />
        <div className="py-8 grid grid-cols-1 sm:grid-cols-8 gap-x-12 gap-y-4">
          <div className="col-span-3 flex flex-col gap-1">
            <div className="flex flex-wrap gap-2">
              <h1 className="text-zinc-950/90 dark:text-white/90">
                {t('settings.billing.sections.plans')}
              </h1>
            </div>
            <h2 className="text-zinc-950/50 dark:text-white/50 text-sm">
              {t('settings.billing.sections.plansDescription')}
            </h2>
          </div>
          <div className="col-span-5">
            <div className="flex justify-end items-center h-full">
              <div className="flex gap-x-2.5">
                <div className="text-xs items-center text-zinc-950/60 dark:text-white/50">
                  {t('settings.billing.sections.saveWithYearly')}
                </div>
                <div>
                  <Switch
                    checked={isYearly}
                    onCheckedChange={setIsYearly}
                    className="data-[state=unchecked]:bg-input"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-12">
          <div className="grid grid-cols-1 gap-3 lg:max-w-none lg:grid-cols-4">
            {plans.map((plan) => (
              <PlanCard
                key={plan.name}
                plan={plan}
                isYearly={isYearly}
                projectId={projectId}
                currentPlanType={planType}
              />
            ))}
          </div>
          <ComparisonTable
            isYearly={isYearly}
            plans={plans}
            currentPlanType={planType}
            overridePlan={subscription?.overridePlan}
          />
        </div>
      </div>
    </>
  );
};

export default Pricing;
