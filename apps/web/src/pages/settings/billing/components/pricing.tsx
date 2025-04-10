import {
  BarChart2,
  Bot,
  GitFork,
  MessageSquare,
  Paintbrush,
  KeyRound,
  Languages,
  Palette,
  Layers,
  Home,
  Key,
  Activity,
  Headphones,
  Shield,
  Webhook,
  Package,
  Send,
  Lock,
  Check,
  Mails,
  Newspaper,
  User2,
  Zap,
  Users2,
  Calendar,
} from 'lucide-react';
import { FlowIcon, ChecklistIcon, LauncherIcon } from '@usertour-ui/icons';
import { Button } from '@usertour-ui/button';
import { Switch } from '@usertour-ui/switch';
import { Fragment } from 'react';
import { cn } from '@usertour-ui/ui-utils';

// Define plan type
interface Plan {
  name: string;
  price: string;
  description: string;
  isCurrentPlan?: boolean;
  features: {
    icon: React.ElementType;
    text: string;
  }[];
  buttonText: string;
  buttonLink?: string;
  buttonClassName?: string;
  showSpacing: boolean;
  buttonVariant?: 'default' | 'secondary';
}

// Define comparison section type
interface ComparisonSection {
  icon: React.ElementType;
  title: string;
  features: {
    name: string;
    values: (string | boolean)[];
  }[];
}

// const primaryButtonClassName =
//   'border border-transparent bg-zinc-950/90 text-white/90 hover:bg-zinc-950/80 dark:bg-white dark:text-zinc-950 dark:hover:bg-white/90';
const secondaryButtonClassName =
  'border border-zinc-950/10 bg-white text-zinc-950/70 hover:bg-zinc-950/5 dark:border-white/10 dark:bg-transparent dark:text-white/70 dark:hover:bg-white/5';

const plans: Plan[] = [
  {
    name: 'Hobby',
    price: '$0',
    description: 'Ideal for indie hackers and small teams to get started with Usertour.',
    isCurrentPlan: true,
    buttonText: 'Get started',
    buttonVariant: 'secondary',
    buttonClassName: secondaryButtonClassName,
    showSpacing: true,
    features: [
      { icon: User2, text: '3000 Monthly Active Users' },
      { icon: FlowIcon, text: 'Unlimited flows' },
      { icon: ChecklistIcon, text: 'Unlimited checklists' },
      { icon: LauncherIcon, text: 'Unlimited launchers' },
      { icon: BarChart2, text: 'Analytics' },
      { icon: Bot, text: 'Custom theming' },
      { icon: GitFork, text: 'Version history' },
      { icon: MessageSquare, text: 'Community support' },
    ],
  },
  {
    name: 'Pro',
    price: '$120',
    description: 'For small teams and startups who need extra features.',
    buttonText: 'Upgrade',
    isCurrentPlan: false,
    buttonVariant: 'default',
    buttonClassName: '',
    showSpacing: true,
    features: [
      { icon: Check, text: 'Everything in Hobby, plus' },
      { icon: User2, text: '5000 Monthly Active Users' },
      { icon: Newspaper, text: 'Unlimited surveys/NPS' },
      { icon: Zap, text: 'Unlimited Event Tracking' },
      { icon: Users2, text: '3 team members' },
      { icon: Calendar, text: '3 years data retention' },
      { icon: Palette, text: 'Remove Usertour branding' },
      { icon: Mails, text: 'Email support' },
    ],
  },
  {
    name: 'Growth',
    price: '$360',
    description: 'For growing startups who need all major features.',
    buttonText: 'Upgrade',
    buttonVariant: 'default',
    buttonClassName: '',
    showSpacing: true,
    features: [
      { icon: Check, text: 'Everything in Pro, plus' },
      { icon: User2, text: '10000 Monthly Active Users' },
      { icon: Languages, text: 'Localization' },
      { icon: KeyRound, text: 'Password protection' },
      { icon: Users2, text: 'Unlimited team members' },
      { icon: Calendar, text: '5 years data retention' },
      { icon: Layers, text: 'Advanced integrations' },
      { icon: Headphones, text: 'Priority support' },
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom Pricing',
    description: 'Custom built packages based on your needs',
    buttonText: 'Contact us',
    buttonLink: 'mailto:support@usertour.io',
    buttonVariant: 'secondary',
    buttonClassName: secondaryButtonClassName,
    showSpacing: true,
    features: [
      { icon: Check, text: 'Everything in Growth, plus' },
      { icon: Home, text: 'Security questionnaire' },
      { icon: Key, text: 'Single sign-on (SSO)' },
      { icon: Activity, text: '99.9% uptime SLA' },
      { icon: Shield, text: 'Security review' },
      { icon: Webhook, text: 'Custom integrations' },
      { icon: Paintbrush, text: 'Custom contracts' },
      { icon: Headphones, text: 'Concierge support' },
    ],
  },
];

// Plan Card Component
const PlanCard = ({ plan }: { plan: Plan }) => {
  return (
    <section
      className={`relative flex h-fit flex-col gap-5 rounded-2xl ${
        plan.isCurrentPlan
          ? 'bg-zinc-950/5 dark:bg-white/10'
          : 'border border-zinc-950/5 dark:border-white/10'
      } p-5`}
    >
      {plan.isCurrentPlan && (
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
              {plan.price}
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
          <Button className="inline-flex h-10 w-full min-w-[40px] select-none items-center justify-center gap-0.5 rounded-[10px] border border-zinc-950/10 bg-white px-2.5 text-sm text-zinc-950/70 ring-zinc-950/10 ring-offset-transparent hover:bg-zinc-950/5 focus:bg-white focus:ring disabled:pointer-events-none dark:border-white/10 dark:bg-transparent dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white/90">
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
        >
          {plan.buttonText}
        </Button>
      )}
      <div className="grid auto-rows-fr gap-3.5 text-sm text-zinc-600 dark:text-zinc-400">
        {plan.features.map((feature, index) => (
          <div key={index} className="flex items-center gap-2">
            <feature.icon className="size-4" />
            <span className="line-clamp-1">{feature.text}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

// Comparison Table Component
const ComparisonTable = () => {
  // Define comparison data
  const sections: ComparisonSection[] = [
    {
      icon: Paintbrush,
      title: 'Usage',
      features: [
        {
          name: 'Price (monthly billing)',
          values: ['$0/month', '$120/month', '$360/month', 'Chat with us'],
        },
        {
          name: 'MAUs (Monthly Active Users)',
          values: ['3000', '5000', '10000', 'Custom'],
        },
        {
          name: 'Sessions (Monthly)',
          values: ['5000', 'Unlimited', 'Unlimited', 'Unlimited'],
        },
        {
          name: 'Data Retention',
          values: ['1 Year', '3 Years', '5 Years', 'Custom'],
        },
        {
          name: 'Usage limits can be upgraded',
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
          name: 'Survey/NPS',
          values: ['1', 'Unlimited', 'Unlimited', 'Unlimited'],
        },
        {
          name: 'Banners',
          values: ['1', 'Unlimited', 'Unlimited', 'Unlimited'],
        },
        {
          name: 'Event Trackers(coming soon)',
          values: ['1', 'Unlimited', 'Unlimited', 'Unlimited'],
        },
        {
          name: 'No Usertour-branding',
          values: [false, true, true, true],
        },
      ],
    },
    {
      icon: Send,
      title: 'Features',
      features: [
        {
          name: 'Environments',
          values: [true, true, true, true],
        },
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
          name: 'Localization',
          values: [false, false, true, true],
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
                  key={index}
                  className="mx-4 border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/70"
                >
                  {typeof value === 'boolean' ? (
                    value ? (
                      <div className="pt-1">
                        <Check className="size-4" />
                      </div>
                    ) : null
                  ) : (
                    <p className="text-zinc-950/60 dark:text-white/60">{value}</p>
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

const Pricing = () => {
  return (
    <>
      <div className="mx-auto pb-10">
        <div className="flex flex-col divide-zinc-950/5 dark:divide-white/5">
          <div>
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
                      <Switch className="data-[state=unchecked]:bg-input" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-12">
              <div className="grid grid-cols-1 gap-3 lg:max-w-none lg:grid-cols-4">
                {plans.map((plan, index) => (
                  <PlanCard key={index} plan={plan} />
                ))}
              </div>
              <ComparisonTable />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Pricing;
