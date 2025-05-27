import {
  MessageSquare,
  Paintbrush,
  Headphones,
  Package,
  Send,
  Lock,
  Check,
  Mails,
  Newspaper,
  Users2,
  Calendar,
  BarChart4,
  Waypoints,
} from 'lucide-react';
import { ChatIcon, BoxIcon } from '@usertour-ui/icons';
import { Button } from '@usertour-ui/button';
import { Switch } from '@usertour-ui/switch';
import { Fragment, useState, useEffect } from 'react';
import { cn } from '@usertour-ui/ui-utils';
import {
  useCreateCheckoutSessionMutation,
  useCreatePortalSessionMutation,
} from '@usertour-ui/shared-hooks';
import { Separator } from '@usertour-ui/separator';
import { PlanType } from '@usertour-ui/types';
import { Progress } from '@usertour-ui/progress';
import { Skeleton } from '@usertour-ui/skeleton';
import { QuestionTooltip } from '@usertour-ui/tooltip';
import {
  HobbySessionLimit,
  ProSessionLimit,
  GrowthSessionLimit,
  BusinessSessionLimit,
} from '@usertour-ui/constants';
import { useSubscriptionContext } from '@/contexts/subscription-context';

// Define plan type
interface Plan {
  name: string;
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

const plans: Plan[] = [
  {
    name: 'Hobby',
    price: '$0',
    yearlyPrice: '$0',
    description: 'For individual hobbyists',
    buttonText: 'Get started',
    buttonVariant: 'secondary',
    buttonClassName: secondaryButtonClassName,
    showSpacing: false,
    isCurrentPlan: true,
    disabled: false,
    features: [
      { icon: Newspaper, text: 'Unlimited content' },
      { icon: BarChart4, text: `${HobbySessionLimit} sessions/month` },
      { icon: Users2, text: '1 team members' },
      { icon: Calendar, text: '1 years data retention' },
      { icon: BoxIcon, text: '1 environments' },
      { icon: Waypoints, text: '100 API requests/min' },
      { icon: MessageSquare, text: 'Community support' },
    ],
  },
  {
    name: 'Starter',
    price: '$59',
    yearlyPrice: '$49',
    description: 'For small teams and startups',
    buttonText: 'Upgrade',
    buttonVariant: 'secondary',
    buttonClassName: secondaryButtonClassName,
    showSpacing: false,
    disabled: false,
    features: [
      { icon: Check, text: 'Everything in Hobby, plus' },
      { icon: BarChart4, text: `${ProSessionLimit} sessions/month` },
      { icon: Users2, text: '3 team members' },
      { icon: Calendar, text: '3 years data retention' },
      { icon: BoxIcon, text: '2 environments' },
      { icon: Waypoints, text: '500 API requests/min' },
      { icon: Mails, text: 'Email support' },
    ],
  },
  {
    name: 'Growth',
    price: '$119',
    yearlyPrice: '$99',
    description: 'For growing companies',
    buttonText: 'Upgrade',
    buttonVariant: 'default',
    buttonClassName: '',
    showSpacing: false,
    disabled: false,
    features: [
      { icon: Check, text: 'Everything in Starter, plus' },
      { icon: BarChart4, text: `${GrowthSessionLimit} sessions/month` },
      { icon: Users2, text: '10 team members' },
      { icon: Calendar, text: '5 years data retention' },
      { icon: BoxIcon, text: '3 environments' },
      { icon: Waypoints, text: '1000 API requests/min' },
      { icon: ChatIcon, text: 'Live chat support' },
    ],
  },
  {
    name: 'Business',
    price: '$249',
    yearlyPrice: '$207',
    description: 'For large companies',
    buttonText: 'Upgrade',
    buttonVariant: 'secondary',
    buttonClassName: secondaryButtonClassName,
    showSpacing: false,
    disabled: false,
    features: [
      { icon: Check, text: 'Everything in Growth, plus' },
      { icon: BarChart4, text: `${BusinessSessionLimit} sessions/month` },
      { icon: Users2, text: 'Unlimited team members' },
      { icon: Calendar, text: '7 years data retention' },
      { icon: BoxIcon, text: 'Unlimited environments' },
      { icon: Waypoints, text: '3000 API requests/min' },
      { icon: Headphones, text: 'Priority support' },
    ],
  },
];

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
    if (isCurrentPlan) return 'Current Plan';
    if (isHigherPlan) return 'Upgrade';
    if (isLowerPlan) return 'Downgrade';
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
          <p className="translate-y-[3px] uppercase">Current Plan</p>
        </div>
      )}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col">
          <h3 className="flex items-center font-semibold text-zinc-950 dark:text-white">
            {plan.name}
          </h3>
          <p className="mt-1.5">
            <span className="align-baseline text-2xl font-semibold text-zinc-950 dark:text-white">
              {isYearly ? plan.yearlyPrice : plan.price}
            </span>
            {plan.price !== 'Custom Pricing' && (
              <span className="align-baseline text-sm text-zinc-950/50 dark:text-white/50">
                /month
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
          {checkoutLoading ? 'Loading...' : plan.disabled ? 'Coming Soon' : getButtonText()}
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

// Comparison Table Component
const ComparisonTable = ({ isYearly, plans }: { isYearly: boolean; plans: Plan[] }) => {
  // Define comparison data
  const sections: ComparisonSection[] = [
    {
      icon: Paintbrush,
      title: 'Usage',
      features: [
        {
          name: 'Price (monthly billing)',
          values: plans.map((plan) => `${isYearly ? plan.yearlyPrice : plan.price}/month`),
        },
        {
          name: 'End users',
          values: ['Unlimited', 'Unlimited', 'Unlimited', 'Unlimited'],
        },
        {
          name: 'Sessions (Monthly)',
          values: [
            { count: `${HobbySessionLimit}`, price: null },
            { count: `${ProSessionLimit}`, price: null },
            { count: `${GrowthSessionLimit}`, price: null },
            { count: `${BusinessSessionLimit}`, price: null },
          ],
        },
        {
          name: 'Data Retention',
          values: ['1 Year', '3 Years', '5 Years', '7 Years'],
        },
        {
          name: 'Environments',
          values: ['1', '2', '3', 'Unlimited'],
        },
        {
          name: 'API rate limit (requests/min)',
          values: ['100', '500', '1000', '3000'],
        },
        {
          name: 'All usage limits can be upgraded',
          values: [true, true, true, true],
        },
      ],
    },
    {
      icon: Package,
      title: 'Content',
      features: [
        {
          name: 'Flows',
          values: ['Unlimited', 'Unlimited', 'Unlimited', 'Unlimited'],
        },
        {
          name: 'Checklists',
          values: ['Unlimited', 'Unlimited', 'Unlimited', 'Unlimited'],
        },
        {
          name: 'Launchers',
          values: ['Unlimited', 'Unlimited', 'Unlimited', 'Unlimited'],
        },
        {
          name: 'Surveys/NPS',
          values: ['Unlimited', 'Unlimited', 'Unlimited', 'Unlimited'],
        },
        {
          name: 'Banners(coming soon)',
          values: ['Unlimited', 'Unlimited', 'Unlimited', 'Unlimited'],
        },
        {
          name: 'Event Trackers(coming soon)',
          values: ['Unlimited', 'Unlimited', 'Unlimited', 'Unlimited'],
        },
        {
          name: 'No Usertour-branding',
          values: [false, true, true, true],
        },
      ],
    },
    {
      icon: Users2,
      title: 'Team',
      features: [
        {
          name: 'Team members',
          values: ['1', '3', '10', 'Unlimited'],
        },
      ],
    },
    {
      icon: Send,
      title: 'Features',
      features: [
        {
          name: 'Custom theming',
          values: [true, true, true, true],
        },
        {
          name: 'Custom user attributes',
          values: [true, true, true, true],
        },
        {
          name: 'Automatic, segmented flow triggering',
          values: [true, true, true, true],
        },
        {
          name: 'Version history',
          values: [true, true, true, true],
        },
        {
          name: 'Company profiles and events',
          values: [true, true, true, true],
        },
        {
          name: 'Localization(coming soon)',
          values: [true, true, true, true],
        },
        {
          name: 'Integrations(coming soon)',
          values: [true, true, true, true],
        },
        {
          name: 'Alerting(coming soon)',
          values: [true, true, true, true],
        },
      ],
    },
    {
      icon: Lock,
      title: 'Support & service',
      features: [
        {
          name: 'Live-chat and email support',
          values: [false, true, true, true],
        },
        {
          name: 'Priority support',
          values: [false, false, true, true],
        },
        {
          name: 'Concierge support',
          values: [false, false, false, true],
        },
      ],
    },
  ];

  return (
    <div className="my-8 grid gap-y-3">
      {/* Table header */}
      <div className="grid grid-cols-5 text-zinc-950/90 dark:text-white/90">
        <div />
        {['Hobby', 'Pro', 'Growth', 'Enterprise'].map((plan) => (
          <div key={plan} className="flex flex-col gap-2 p-4">
            <p className="text-sm font-semibold">{plan}</p>
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
                        <Check className="size-4" />
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

  const percent = (currentUsage / totalLimit) * 100;

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
              <h1 className="text-zinc-950/90 dark:text-white/90">Billing plan</h1>
            </div>
            <h2 className="text-zinc-950/50 dark:text-white/50 text-sm">
              View and manage your billing plan
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
                        <span>Current plan: </span>
                        <span className="font-normal text-zinc-950/60 dark:text-white/50 capitalize">
                          {planType}
                        </span>
                        {subscription?.cancelAt && (
                          <span className="text-red-500">
                            Expires on{' '}
                            {new Date(Number.parseInt(subscription.cancelAt)).toLocaleDateString()}
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
                        <Progress value={Math.min(percent, 100)} className="h-1 grow max-w-60" />
                        <span className="text-zinc-950/60 dark:text-white/50 flex-none">
                          {currentUsage} / {totalLimit}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-zinc-950/40 dark:text-white/40">
                        <span>Monthly sessions</span>
                        <span>•</span>
                        <span>{percent.toFixed(2)}% used</span>
                        <span>•</span>
                        <span>
                          {currentUsage < totalLimit * 0.8
                            ? 'Efficient usage'
                            : 'Consider upgrading'}
                        </span>
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
                    ? 'Renew Subscription'
                    : !subscription?.planType || subscription?.planType === PlanType.HOBBY
                      ? 'Upgrade'
                      : 'Manage Subscription'}
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
                <span>
                  Usage exceeded limit. Please upgrade your plan to continue using all features.{' '}
                </span>
                <QuestionTooltip>
                  All content will be hidden after exceeding the limit.
                </QuestionTooltip>
              </div>
            )}
          </div>
        </div>
        <Separator />
        <div className="py-8 grid grid-cols-1 sm:grid-cols-8 gap-x-12 gap-y-4">
          <div className="col-span-3 flex flex-col gap-1">
            <div className="flex flex-wrap gap-2">
              <h1 className="text-zinc-950/90 dark:text-white/90">Plans</h1>
            </div>
            <h2 className="text-zinc-950/50 dark:text-white/50 text-sm">
              You can upgrade or change your plan here
            </h2>
          </div>
          <div className="col-span-5">
            <div className="flex justify-end items-center h-full">
              <div className="flex gap-x-2.5">
                <div className="text-xs items-center text-zinc-950/60 dark:text-white/50">
                  Save with yearly billing
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
          <ComparisonTable isYearly={isYearly} plans={plans} />
        </div>
      </div>
    </>
  );
};

export default Pricing;
