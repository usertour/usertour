import {
  UsersIcon,
  AnalyticsIcon,
  AIAssistantIcon,
  SubpathIcon,
  FeedbackIcon,
  CustomizationIcon,
  PasswordIcon,
  GrammarIcon,
  BrandingIcon,
  MultiProductIcon,
  CustomHomepageIcon,
  SSOIcon,
  UptimeIcon,
  SupportIcon,
  SecurityIcon,
  APIIcon,
  FeaturesIcon,
  PublishingIcon,
  Security2Icon,
  CheckIcon,
} from '@usertour-ui/icons';
import { FlowIcon, ChecklistIcon, LauncherIcon } from '@usertour-ui/icons';
import { Button } from '@usertour-ui/button';
import { Mails, NewspaperIcon, User2Icon, ZapIcon, PanelTopIcon } from 'lucide-react';
import { Switch } from '@usertour-ui/switch';
const Pricing = () => {
  return (
    <>
      <div className="mx-auto max-w-6xl pb-10 ">
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
                <section className="relative flex h-fit flex-col gap-5 rounded-2xl border border-zinc-950/5 p-5 dark:border-white/10">
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col">
                      <h3 className="flex items-center font-semibold text-zinc-950 dark:text-white">
                        Hobby
                      </h3>
                      <p className="mt-1.5">
                        <span className="align-baseline text-2xl font-semibold text-zinc-950 dark:text-white">
                          $0
                        </span>
                        <span className="align-baseline text-sm text-zinc-950/50 dark:text-white/50">
                          /month
                        </span>
                      </p>
                      <p className="mt-4 line-clamp-3 min-h-[40px] max-w-full text-sm text-zinc-950/70 dark:text-white/50">
                        Ideal for indie hackers and small teams to get started with Usertour.
                      </p>
                    </div>
                  </div>
                  <div className="grid auto-rows-fr gap-2">
                    <div className="h-5 hidden lg:block" />
                  </div>
                  {/* <div className="grid auto-rows-fr gap-2">
										<div className="flex min-w-0 flex-1 items-center justify-between gap-2 text-sm text-zinc-950/70 dark:text-white/50">
											<div className="flex min-w-0 flex-1 items-center gap-2">
												<PreviewIcon className="size-4" />
												<span className="hello min-w-0 flex-grow truncate">
													Previews
												</span>
											</div>
											<button
												type="button"
												className="inline-flex h-6 items-center justify-center gap-1 text-sm font-medium text-green-600 outline-none hover:text-green-800 disabled:pointer-events-none disabled:text-zinc-950/10 dark:hover:text-green-400 dark:disabled:text-white/20"
											>
												<p>Enable</p>
												<ChevronRightIcon className="size-4" />
											</button>
										</div>
									</div> */}
                  <Button className="inline-flex h-10 w-full min-w-[40px] select-none items-center justify-center gap-0.5 rounded-[10px] border border-zinc-950/10 bg-white px-2.5 text-sm text-zinc-950/70 ring-zinc-950/10 ring-offset-transparent hover:bg-zinc-950/5 focus:bg-white focus:ring disabled:pointer-events-none dark:border-white/10 dark:bg-transparent dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white/90">
                    Get started
                  </Button>
                  <div className="grid auto-rows-fr gap-3.5 text-sm text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center gap-2">
                      <User2Icon className="size-4" />
                      <span className="line-clamp-1 ">3000 Monthly Active Users</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* <AIAssistantIcon className="size-4" /> */}
                      <FlowIcon className="size-4" />
                      <span className="line-clamp-1">Unlimited flows</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ChecklistIcon className="size-4" />
                      <span className="line-clamp-1">2 checklists</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <LauncherIcon className="size-4" />
                      <span className="line-clamp-1">20 launchers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AnalyticsIcon className="size-4" />
                      <span className="line-clamp-1">Analytics</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AIAssistantIcon className="size-4" />
                      <span className="line-clamp-1">Custom theming</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <SubpathIcon className="size-4" />
                      <span className="line-clamp-1">Version history </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FeedbackIcon className="size-4" />
                      <span className="line-clamp-1">Community support</span>
                    </div>
                  </div>
                </section>
                <section className="relative order-first flex h-fit flex-col gap-5 rounded-2xl bg-zinc-950/5 p-5 lg:order-none dark:bg-white/10">
                  <div className="absolute right-4 top-4 h-[21px] rounded-md bg-green-600 px-1.5 text-xs font-semibold text-white dark:bg-green-500">
                    <p className="translate-y-[3px] uppercase">Popular</p>
                  </div>
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col">
                      <h3 className="flex items-center font-semibold text-zinc-950 dark:text-white">
                        Pro
                      </h3>
                      <p className="mt-1.5">
                        <span className="align-baseline text-2xl font-semibold text-zinc-950 dark:text-white">
                          $120
                        </span>
                        <span className="align-baseline text-sm text-zinc-950/50 dark:text-white/50">
                          /month
                        </span>
                      </p>
                      <p className="mt-4 line-clamp-3 min-h-[40px] max-w-full text-sm text-zinc-950/70 dark:text-white/50">
                        For small teams and startups who need extra features.
                      </p>
                    </div>
                  </div>
                  <div className="grid auto-rows-fr gap-2">
                    <div className="h-5 hidden lg:block" />
                  </div>
                  <Button className="inline-flex h-10 min-w-[40px] select-none items-center justify-center gap-0.5 rounded-[10px] border border-transparent bg-zinc-950/90 px-2.5 text-sm text-white/90 ring-zinc-950/10 ring-offset-transparent hover:bg-zinc-950/80 focus:ring disabled:pointer-events-none dark:bg-white dark:text-zinc-950 dark:hover:bg-white/90">
                    Coming soon
                  </Button>
                  <div className="grid auto-rows-fr gap-3.5 text-sm text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center gap-2">
                      <CheckIcon className="size-4" />

                      <span className="line-clamp-1">Everything in Hobby, plus</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User2Icon className="size-4" />

                      <span className="line-clamp-1 ">5000 Monthly Active Users</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ChecklistIcon className="size-4" />
                      <span className="line-clamp-1">Unlimited checklists</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <LauncherIcon className="size-4" />
                      <span className="line-clamp-1">Unlimited launchers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <PanelTopIcon className="size-4" />
                      <span className="line-clamp-1">Unlimited banners</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BrandingIcon className="size-4" />
                      <span className="line-clamp-1">Remove Usertour branding</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UsersIcon className="size-4" />
                      <span className="line-clamp-1">Unlimited team members</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mails className="size-4" />
                      <span className="line-clamp-1">Email support</span>
                    </div>
                  </div>
                </section>

                <section className="relative flex h-fit flex-col gap-5 rounded-2xl border border-zinc-950/5 p-5 dark:border-white/10">
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col">
                      <h3 className="flex items-center font-semibold text-zinc-950 dark:text-white">
                        Growth
                      </h3>
                      <p className="mt-1.5">
                        <span className="align-baseline text-2xl font-semibold text-zinc-950 dark:text-white">
                          $360
                        </span>
                        <span className="align-baseline text-sm text-zinc-950/50 dark:text-white/50">
                          /month
                        </span>
                      </p>
                      <p className="mt-4 line-clamp-3 min-h-[40px] max-w-full text-sm text-zinc-950/70 dark:text-white/50">
                        For growing startups who need all major features.
                      </p>
                    </div>
                  </div>
                  <div className="grid auto-rows-fr gap-2">
                    <div className="h-5 hidden lg:block" />
                  </div>
                  {/* <button
										type="button"
										className="inline-flex h-10 min-w-[40px] select-none items-center justify-center gap-0.5 rounded-[10px] border border-transparent bg-zinc-950/90 px-2.5 text-sm text-white/90 ring-zinc-950/10 ring-offset-transparent hover:bg-zinc-950/80 focus:ring disabled:pointer-events-none dark:bg-white dark:text-zinc-950 dark:hover:bg-white/90"
									>
										<div className="px-1">Upgrade </div>
									</button> */}
                  <Button className="inline-flex h-10 w-full min-w-[40px] select-none items-center justify-center gap-0.5 rounded-[10px] border border-zinc-950/10 bg-white px-2.5 text-sm text-zinc-950/70 ring-zinc-950/10 ring-offset-transparent hover:bg-zinc-950/5 focus:bg-white focus:ring disabled:pointer-events-none dark:border-white/10 dark:bg-transparent dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white/90">
                    Coming soon
                  </Button>
                  <div className="grid auto-rows-fr gap-3.5 text-sm text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center gap-2">
                      <CheckIcon className="size-4" />

                      <span className="line-clamp-1">Everything in Pro, plus</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User2Icon className="size-4" />
                      <span className="line-clamp-1 ">10000 Monthly Active Users</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <NewspaperIcon className="size-4" />
                      <span className="line-clamp-1">Unlimited surveys/NPS</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ZapIcon className="size-4" />
                      <span className="line-clamp-1">No-code Event Tracking</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <PasswordIcon className="size-4" />
                      <span className="line-clamp-1">Password protection</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <GrammarIcon className="size-4" />
                      <span className="line-clamp-1">Localization</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MultiProductIcon className="size-4" />
                      <span className="line-clamp-1">Advanced integrations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <SupportIcon className="size-4" />
                      <span className="line-clamp-1">Priority support</span>
                    </div>
                  </div>
                </section>
                <section className="relative flex h-fit flex-col gap-5 rounded-2xl border border-zinc-950/5 p-5 dark:border-white/10">
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col">
                      <h3 className="flex items-center font-semibold text-zinc-950 dark:text-white">
                        Enterprise
                      </h3>
                      <p className="mt-1.5">
                        <span className="align-baseline text-2xl font-semibold text-zinc-950 dark:text-white">
                          Custom Pricing
                        </span>
                      </p>
                      <p className="mt-4 line-clamp-3 min-h-[40px] max-w-full text-sm text-zinc-950/70 dark:text-white/50">
                        Custom built packages based on your needs
                      </p>
                    </div>
                  </div>
                  <div className="grid auto-rows-fr gap-2">
                    <div className="h-5 hidden lg:block" />
                  </div>
                  <a target="_self" className="flex" href="mailto:support@usertour.io">
                    <Button className="inline-flex h-10 w-full min-w-[40px] select-none items-center justify-center gap-0.5 rounded-[10px] border border-zinc-950/10 bg-white px-2.5 text-sm text-zinc-950/70 ring-zinc-950/10 ring-offset-transparent hover:bg-zinc-950/5 focus:bg-white focus:ring disabled:pointer-events-none dark:border-white/10 dark:bg-transparent dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white/90">
                      Contact us
                    </Button>
                  </a>
                  <div className="grid auto-rows-fr gap-3.5 text-sm text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center gap-2">
                      <CheckIcon className="size-4" />

                      <span className="line-clamp-1">Everything in Growth, plus</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CustomHomepageIcon className="size-4" />
                      <span className="line-clamp-1">Security questionnaire</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <SSOIcon className="size-4" />
                      <span className="line-clamp-1">Single sign-on (SSO)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UptimeIcon className="size-4" />
                      <span className="line-clamp-1">99.9% uptime SLA</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <SecurityIcon className="size-4" />
                      <span className="line-clamp-1">Security review</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <APIIcon className="size-4" />
                      <span className="line-clamp-1">Custom integrations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CustomizationIcon className="size-4" />
                      <span className="line-clamp-1">Custom contracts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <SupportIcon className="size-4" />
                      <span className="line-clamp-1">Concierge support</span>
                    </div>
                  </div>
                </section>
              </div>
              <div className="my-8 grid gap-y-3">
                <div className="grid grid-cols-5 text-zinc-950/90 dark:text-white/90">
                  <div />
                  <div className="flex flex-col gap-2 p-4">
                    <p className="text-sm font-semibold">Hobby</p>
                  </div>
                  <div className="flex flex-col gap-2 p-4">
                    <p className="text-sm font-semibold">Pro</p>
                  </div>
                  <div className="flex flex-col gap-2 p-4">
                    <p className="text-sm font-semibold">Growth</p>
                  </div>
                  <div className="flex flex-col gap-2 p-4">
                    <p className="text-sm font-semibold">Enterprise</p>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-y-3 text-sm">
                  <div className="col-span-5 flex items-center gap-2 py-4 text-base text-zinc-950/90 dark:text-white/90">
                    <CustomizationIcon className="size-4" />
                    Usage
                  </div>
                  <p className="border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/50">
                    Price (monthly billing)
                  </p>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="text-zinc-950/60 dark:text-white/60">$0/month</p>
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="text-zinc-950/60 dark:text-white/60">$120/month</p>
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3  text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="text-zinc-950/60 dark:text-white/60">$360/month</p>
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="text-zinc-950/60 dark:text-white/60">Chat with us</p>
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <p className="border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/50">
                    MAUs (Monthly Active Users)
                  </p>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="text-zinc-950/60 dark:text-white/60">3000</p>
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3  text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="text-zinc-950/60 dark:text-white/60">5000</p>
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="text-zinc-950/60 dark:text-white/60">10000</p>
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="text-zinc-950/60 dark:text-white/60">Custom</p>
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <p className="border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/50">
                    Usage limits can be upgraded
                  </p>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-y-3 text-sm">
                  <div className="col-span-5 flex items-center gap-2 py-4 text-base text-zinc-950/90 dark:text-white/90">
                    <FeaturesIcon className="size-4" />
                    Content
                  </div>
                  <p className="border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/50">
                    Flows
                  </p>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="text-zinc-950/60 dark:text-white/60">Unlimited</p>
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3  text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="text-zinc-950/60 dark:text-white/60">Unlimited</p>
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3  text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="text-zinc-950/60 dark:text-white/60">Unlimited</p>
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3  text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="text-zinc-950/60 dark:text-white/60">Unlimited</p>
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <p className="border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/50">
                    Checklists
                  </p>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="text-zinc-950/60 dark:text-white/60">2</p>
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3  text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="text-zinc-950/60 dark:text-white/60">Unlimited</p>
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3  text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="text-zinc-950/60 dark:text-white/60">Unlimited</p>
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3  text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="text-zinc-950/60 dark:text-white/60">Unlimited</p>
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <p className="border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/50">
                    Launchers
                  </p>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="text-zinc-950/60 dark:text-white/60">20</p>
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3  text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="text-zinc-950/60 dark:text-white/60">Unlimited</p>
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3  text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="text-zinc-950/60 dark:text-white/60">Unlimited</p>
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3  text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="text-zinc-950/60 dark:text-white/60">Unlimited</p>
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <p className="border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/50">
                    Banners
                  </p>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    {/* <p className="text-zinc-950/60 dark:text-white/60">0</p> */}
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3  text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="text-zinc-950/60 dark:text-white/60">Unlimited</p>
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3  text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="text-zinc-950/60 dark:text-white/60">Unlimited</p>
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3  text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="text-zinc-950/60 dark:text-white/60">Unlimited</p>
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <p className="border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/50">
                    Survey/NPS (coming soon)
                  </p>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    {/* <p className="text-zinc-950/60 dark:text-white/60">0</p> */}
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3  text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="text-zinc-950/60 dark:text-white/60">Unlimited</p>
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3  text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="text-zinc-950/60 dark:text-white/60">Unlimited</p>
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3  text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="text-zinc-950/60 dark:text-white/60">Unlimited</p>
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <p className="border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/50">
                    Event Trackers(coming soon)
                  </p>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    {/* <p className="text-zinc-950/60 dark:text-white/60">0</p> */}
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3  text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="text-zinc-950/60 dark:text-white/60">Unlimited</p>
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3  text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="text-zinc-950/60 dark:text-white/60">Unlimited</p>
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3  text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="text-zinc-950/60 dark:text-white/60">Unlimited</p>
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <p className="border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/50">
                    Flow/checklist views
                  </p>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <p className="border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/50">
                    No Usertour-branding
                  </p>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-y-3 text-sm">
                  <div className="col-span-5 flex items-center gap-2 py-4 text-base text-zinc-950/90 dark:text-white/90">
                    <PublishingIcon className="size-4" />
                    Features
                  </div>
                  <p className="border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/50">
                    Environments
                  </p>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <p className="border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/50">
                    Custom theming
                  </p>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <p className="border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/50">
                    Custom user attributes
                  </p>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <p className="border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/50">
                    Automatic, segmented flow triggering
                  </p>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <p className="border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/50">
                    Version history
                  </p>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <p className="border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/50">
                    Company profiles and events
                  </p>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <p className="border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/50">
                    Localization
                  </p>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-y-3 text-sm">
                  <div className="col-span-5 flex items-center gap-2 py-4 text-base text-zinc-950/90 dark:text-white/90">
                    <Security2Icon className="size-4" />
                    Support & service
                  </div>
                  <p className="border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/50">
                    Live-chat and email support
                  </p>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <p className="border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/50">
                    Priority support
                  </p>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <p className="border-b border-zinc-950/5 pb-3 text-zinc-950/70 dark:border-white/10 dark:text-white/50">
                    Concierge support
                  </p>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                  <div className="mx-4 border-b border-zinc-950/5 pb-3 pt-1 text-zinc-950/70 dark:border-white/10 dark:text-white/70">
                    <CheckIcon className="size-4" />
                    <p className="mt-1 text-zinc-950/40 dark:text-white/40" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Pricing;
