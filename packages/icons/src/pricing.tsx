import React from 'react';

interface IconProps {
  className?: string;
}

export const PreviewIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ className }, forwardedRef) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      className={className}
      ref={forwardedRef}
    >
      <title>Preview content icon</title>
      <g fill="currentColor">
        <path
          d="M9.926,16.11c-.461,.092-.938,.14-1.426,.14-4.004,0-7.25-3.246-7.25-7.25S4.496,1.75,8.5,1.75s7.25,3.246,7.25,7.25c0,.264-.014,.524-.041,.78"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M11.126,10.768l5.94,2.17c.25,.091,.243,.448-.011,.529l-2.719,.87-.87,2.719c-.081,.254-.438,.261-.529,.011l-2.17-5.94c-.082-.223,.135-.44,.359-.359Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M15.75,9c0-1.657-3.246-3-7.25-3S1.25,7.343,1.25,9c0,1.646,3.205,2.983,7.175,3"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M11.486,8.293c-.147-3.672-1.428-6.543-2.986-6.543-1.657,0-3,3.246-3,7.25s1.343,7.25,3,7.25"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  ),
);

PreviewIcon.displayName = 'PreviewIcon';

export const CheckIcon = ({ className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 18 18"
    className={className}
  >
    <title>Check icon</title>
    <g fill="currentColor">
      <path
        d="M2.75 9.5L6.5 13.25L15.25 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </g>
  </svg>
);

CheckIcon.displayName = 'CheckIcon';
export const UsersIcon = ({ className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 18 18"
    className={className}
  >
    <title>Users icon</title>
    <g fill="currentColor">
      <circle
        cx="9"
        cy="7"
        r="2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M5.801,15.776c-.489-.148-.818-.635-.709-1.135,.393-1.797,1.993-3.142,3.908-3.142s3.515,1.345,3.908,3.142c.109,.499-.219,.987-.709,1.135-.821,.248-1.911,.474-3.199,.474s-2.378-.225-3.199-.474Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <circle
        cx="13.75"
        cy="3.25"
        r="1.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M13.584,7.248c.055-.002,.11-.004,.166-.004,1.673,0,3.079,1.147,3.473,2.697,.13,.511-.211,1.02-.718,1.167-.643,.186-1.457,.352-2.403,.385"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <circle
        cx="4.25"
        cy="3.25"
        r="1.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M4.416,7.248c-.055-.002-.11-.004-.166-.004-1.673,0-3.079,1.147-3.473,2.697-.13,.511,.211,1.02,.718,1.167,.643,.186,1.457,.352,2.403,.385"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </g>
  </svg>
);

UsersIcon.displayName = 'UsersIcon';

export const ChatIcon = ({ className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 18 18"
    className={className}
  >
    <title>Chat icon</title>
    <g fill="currentColor">
      <path
        d="M16.213,9.735c.024-.242,.037-.487,.037-.735,0-4.004-3.246-7.25-7.25-7.25S1.75,4.996,1.75,9c0,1.319,.358,2.552,.973,3.617,.43,.806-.053,2.712-.973,3.633,1.25,.068,2.897-.497,3.633-.973,.489,.282,1.264,.656,2.279,.848,.433,.082,.881,.125,1.338,.125,.248,0,.494-.013,.736-.037"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M14.25 11.25L15.25 13.25 17.25 14.25 15.25 15.25 14.25 17.25 13.25 15.25 11.25 14.25 13.25 13.25 14.25 11.25z"
      />
    </g>
  </svg>
);

ChatIcon.displayName = 'ChatIcon';

export const AnalyticsIcon = ({ className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 18 18"
    className={className}
  >
    <title>Analytics icon</title>
    <g fill="currentColor">
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M11.75 8L11.75 11"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M6.25 9.5L6.25 11"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M9 6.5L9 11"
      />
      <path
        d="M4.25,14.75c-1.105,0-2-.895-2-2V4.75c0-1.105,.895-2,2-2H13.75c1.105,0,2,.895,2,2V12.75c0,1.105-.895,2-2,2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M0.75 14.75L17.25 14.75"
      />
    </g>
  </svg>
);

AnalyticsIcon.displayName = 'AnalyticsIcon';

export const AIAssistantIcon = ({ className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 18 18"
    className={className}
  >
    <title>AI Assistant icon</title>
    <g
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      stroke="currentColor"
    >
      <path d="M5.154,15.147c.479-1.673,2.019-2.897,3.846-2.897s3.367,1.224,3.846,2.897" />
      <circle cx="9" cy="9" r="7.25" />
      <path
        d="M11.59,7.16l-1.515-.506-.505-1.515c-.164-.49-.975-.49-1.139,0l-.505,1.515-1.515,.506c-.245,.081-.41,.311-.41,.569s.165,.488,.41,.569l1.515,.506,.505,1.515c.082,.245,.312,.41,.57,.41s.487-.165,.57-.41l.505-1.515,1.515-.506c.245-.081,.41-.311,.41-.569s-.165-.487-.41-.569Z"
        fill="currentColor"
        data-stroke="none"
        stroke="none"
      />
    </g>
  </svg>
);

AIAssistantIcon.displayName = 'AIAssistantIcon';

export const ChartIcon = ({ className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 18 18"
    className={className}
  >
    <title>Chart icon</title>
    <g fill="currentColor">
      <rect
        x="2.75"
        y="2.75"
        width="12.5"
        height="12.5"
        rx="2"
        ry="2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M5.75 8L5.75 12.25"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M12.25 10.25L12.25 12.25"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M9 5.75L9 12.25"
      />
    </g>
  </svg>
);

ChartIcon.displayName = 'ChartIcon';

export const SubpathIcon = ({ className }: IconProps) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <title>Subpath icon</title>
    <g clipPath="url(#clip0_6617_34037)">
      <path
        d="M10.7756 2.44406H12.6662C13.1569 2.44406 13.5551 2.84229 13.5551 3.33295V5.55518C13.5551 6.04584 13.1569 6.44406 12.6662 6.44406H8.66623C8.17557 6.44406 7.77734 6.04584 7.77734 5.55518V2.44406C7.77734 1.9534 8.17557 1.55518 8.66623 1.55518H9.59601C9.8529 1.55518 10.0965 1.66629 10.2653 1.85918L10.7756 2.44406Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.7756 10.4441H12.6662C13.1569 10.4441 13.5551 10.8423 13.5551 11.333V13.5552C13.5551 14.0458 13.1569 14.4441 12.6662 14.4441H8.66623C8.17557 14.4441 7.77734 14.0458 7.77734 13.5552V10.4441C7.77734 9.9534 8.17557 9.55518 8.66623 9.55518H9.59601C9.8529 9.55518 10.0965 9.66629 10.2653 9.85918L10.7756 10.4441Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.55545 4.22201H3.77767C3.04167 4.22201 2.44434 3.62467 2.44434 2.88867V0.888672"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.55545 12.2221H3.77767C3.04167 12.2221 2.44434 11.6247 2.44434 10.8887V2.6665"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
    <defs>
      <clipPath id="clip0_6617_34037">
        <rect width="16" height="16" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

SubpathIcon.displayName = 'SubpathIcon';

export const FeedbackIcon = ({ className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 18 18"
    className={className}
  >
    <title>Feedback icon</title>
    <g fill="currentColor">
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M9 13.185L4.519 15.54 5.375 10.551 1.75 7.017 6.76 6.289 9 1.75 11.24 6.289 16.25 7.017 14.473 8.75"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M11 14.75L16 14.75"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M11 11.25L16 11.25"
      />
    </g>
  </svg>
);

FeedbackIcon.displayName = 'FeedbackIcon';

export const CustomizationIcon = ({ className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 18 18"
    className={className}
  >
    <title>Customization icon</title>
    <g fill="currentColor">
      <path
        d="M7.25,4.25v-.5c0-.552-.448-1-1-1H3.75c-.552,0-1,.448-1,1V13"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M12.932,8.25l.2-.2c.391-.391,.391-1.024,0-1.414l-1.768-1.768c-.391-.391-1.024-.391-1.414,0L3.409,11.409"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <circle cx="5" cy="13" r=".75" fill="currentColor" data-stroke="none" stroke="none" />
      <path
        d="M9,6.75h0c1.242,0,2.25,1.008,2.25,2.25v9.25c0,.552-.448,1-1,1h-2.5c-.552,0-1-.448-1-1V9c0-1.242,1.008-2.25,2.25-2.25Z"
        transform="rotate(-90 9 13)"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M8.25 10.75L8.25 15.25"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M11.75 10.75L11.75 15.25"
      />
    </g>
  </svg>
);

CustomizationIcon.displayName = 'CustomizationIcon';

export const PasswordIcon = ({ className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 18 18"
    className={className}
  >
    <title>Password icon</title>
    <g fill="currentColor">
      <circle cx="5.5" cy="9" r="1" fill="currentColor" data-stroke="none" stroke="none" />
      <circle cx="9" cy="9" r="1" fill="currentColor" data-stroke="none" stroke="none" />
      <circle cx="12.5" cy="9" r="1" fill="currentColor" data-stroke="none" stroke="none" />
      <path
        d="M16.25,8.471v-1.721c0-1.104-.895-2-2-2H3.75c-1.105,0-2,.896-2,2v4.5c0,1.104,.895,2,2,2h6.052"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M12.244 13.75L13.853 15.25 17.25 10.75"
      />
    </g>
  </svg>
);

PasswordIcon.displayName = 'PasswordIcon';

export const GrammarIcon = ({ className }: IconProps) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <title>Grammar icon</title>
    <g clipPath="url(#clip0_6617_34129)">
      <path
        d="M4.54012 10.4443H11.4592L8.35612 2.44434H7.64323L3.33301 13.5554"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.99414 13.0141L11.4244 14.4443L14.4439 10.5181"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
    <defs>
      <clipPath id="clip0_6617_34129">
        <rect width="16" height="16" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

GrammarIcon.displayName = 'GrammarIcon';

export const BrandingIcon = ({ className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 18 18"
    className={className}
  >
    <title>Branding icon</title>
    <g fill="currentColor">
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M2.75 15.25L10.749 7.251"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M9.998 2.052L12.337 3.579 14.921 2.519 14.191 5.215 15.998 7.344 13.209 7.483 11.742 9.86 10.748 7.25 8.034 6.59 10.209 4.837 9.998 2.052z"
      />
    </g>
  </svg>
);

BrandingIcon.displayName = 'BrandingIcon';

export const AICreditsIcon = ({ className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 18 18"
    className={className}
  >
    <title>AI Credits icon</title>
    <g fill="currentColor">
      <path
        d="M16.213,9.735c.024-.242,.037-.487,.037-.735,0-4.004-3.246-7.25-7.25-7.25S1.75,4.996,1.75,9c0,1.319,.358,2.552,.973,3.617,.43,.806-.053,2.712-.973,3.633,1.25,.068,2.897-.497,3.633-.973,.489,.282,1.264,.656,2.279,.848,.433,.082,.881,.125,1.338,.125,.248,0,.494-.013,.736-.037"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M14.25 11.25L15.25 13.25 17.25 14.25 15.25 15.25 14.25 17.25 13.25 15.25 11.25 14.25 13.25 13.25 14.25 11.25z"
      />
    </g>
  </svg>
);

AICreditsIcon.displayName = 'AICreditsIcon';

export const DonationIcon = ({ className }: IconProps) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <title>Donation icon</title>
    <g clipPath="url(#clip0_595_67417)">
      <path
        d="M10.437 12.965L15.254 10.791C15.966 10.47 16.803 10.786 17.125 11.498C17.446 12.21 17.13 13.047 16.418 13.369L9.62698 16.434C8.95098 16.739 8.18598 16.783 7.47898 16.557L3.00098 15.125"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.245 12.098L9.216 12.992C9.927 13.315 10.765 13 11.088 12.289C11.411 11.578 11.096 10.74 10.385 10.417L7.608 9.14897C5.312 8.12597 3.375 9.68797 3 11.501"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M0.75 9.75H2C2.552 9.75 3 10.198 3 10.75V15.75C3 16.302 2.552 16.75 2 16.75H0.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.781 6.447C10.919 6.518 11.08 6.518 11.218 6.447C11.947 6.073 14.249 4.717 14.249 2.513C14.253 1.545 13.458 0.756 12.472 0.75C11.879 0.757 11.328 1.051 10.999 1.536C10.67 1.052 10.118 0.758 9.52597 0.75C8.54097 0.756 7.74597 1.544 7.74897 2.513C7.74897 4.718 10.052 6.073 10.78 6.447H10.781Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
    <defs>
      <clipPath id="clip0_595_67417">
        <rect width="18" height="18" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

DonationIcon.displayName = 'DonationIcon';

export const AuthIcon = ({ className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 18 18"
    className={className}
  >
    <title>Auth icon</title>
    <g fill="currentColor">
      <circle cx="4.25" cy="5.25" r=".75" fill="currentColor" data-stroke="none" stroke="none" />
      <circle cx="6.75" cy="5.25" r=".75" fill="currentColor" data-stroke="none" stroke="none" />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M1.75 7.75L16.25 7.75"
      />
      <path
        d="M16.25,11.75V4.75c0-1.104-.895-2-2-2H3.75c-1.105,0-2,.896-2,2V13.25c0,1.104,.895,2,2,2h3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <circle
        cx="11"
        cy="14.25"
        r="1.75"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M12.75 14.25L17.25 14.25"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M15.75 14.25L15.75 15.75"
      />
    </g>
  </svg>
);

AuthIcon.displayName = 'AuthIcon';

export const MultiProductIcon = ({ className }: IconProps) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <title>Multi Product icon</title>
    <g clipPath="url(#clip0_6617_34189)">
      <path
        d="M11.2228 4.77783L8.00054 8.00005L4.77832 11.2223"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.2228 11.2223L8.00054 8.00005L4.77832 4.77783"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.2223 4.77789L8.00011 1.55566L4.77789 4.77789L1.55566 8.00011L4.77789 11.2223L8.00011 14.4446L11.2223 11.2223L14.4446 8.00011L11.2223 4.77789Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
    <defs>
      <clipPath id="clip0_6617_34189">
        <rect width="16" height="16" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

MultiProductIcon.displayName = 'MultiProductIcon';

export const CustomHomepageIcon = ({ className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 18 18"
    className={className}
  >
    <title>Custom Homepage icon</title>
    <g
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      stroke="currentColor"
    >
      <circle cx="10.5" cy="8" r="2" />
      <rect x="5" y="10" width="3.5" height="3.5" rx=".9" ry=".9" />
      <path d="M7.402,7.648c.124-.217,.123-.486-.003-.701l-1.33-2.28c-.251-.43-.959-.428-1.208,0l-1.33,2.279c-.126,.216-.128,.484-.003,.702,.124,.217,.357,.352,.607,.352h2.659c.25,0,.483-.135,.607-.352Z" />
      <path d="M8.45,16.25H3.75c-1.105,0-2-.895-2-2V3.75c0-1.105,.895-2,2-2h5.586c.265,0,.52,.105,.707,.293l3.914,3.914c.188,.188,.293,.442,.293,.707v2.025" />
      <path d="M13.207,16.401c.143-.049,.273-.131,.38-.238l3.303-3.303c.483-.483,.478-1.261-.005-1.745h0c-.483-.483-1.261-.489-1.745-.005l-3.303,3.303c-.107,.107-.189,.237-.238,.38l-.849,2.457,2.457-.849Z" />
    </g>
  </svg>
);

CustomHomepageIcon.displayName = 'CustomHomepageIcon';

export const SSOIcon = ({ className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 18 18"
    className={className}
  >
    <title>SSO icon</title>
    <g fill="currentColor">
      <circle
        cx="9"
        cy="9"
        r="7.25"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M9 13L9 5"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M12.464 11L5.536 7"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M5.536 11L12.464 7"
      />
    </g>
  </svg>
);

SSOIcon.displayName = 'SSOIcon';

export const UptimeIcon = ({ className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 18 18"
    className={className}
  >
    <title>Uptime icon</title>
    <g fill="currentColor">
      <path
        d="M9.305,1.848l5.25,1.68c.414,.133,.695,.518,.695,.952v6.52c0,3.03-4.684,4.748-5.942,5.155-.203,.066-.413,.066-.616,0-1.258-.407-5.942-2.125-5.942-5.155V4.48c0-.435,.281-.82,.695-.952l5.25-1.68c.198-.063,.411-.063,.61,0Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M6.497 9.75L8.106 11.25 11.503 6.75"
      />
    </g>
  </svg>
);

UptimeIcon.displayName = 'UptimeIcon';

export const SupportIcon = ({ className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 18 18"
    className={className}
  >
    <title>Support icon</title>
    <g fill="currentColor">
      <path
        d="M5.486,7.688c.379-1.016,1.187-1.823,2.203-2.203"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M10.312,5.486c1.016,.379,1.823,1.187,2.203,2.203"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M12.514,10.312c-.379,1.016-1.187,1.823-2.203,2.203"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M7.688,12.514c-1.016-.379-1.823-1.187-2.203-2.203"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M6.464,15.794c-1.964-.733-3.525-2.294-4.259-4.259"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M15.794,11.536c-.733,1.964-2.295,3.525-4.259,4.259"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M11.536,2.206c1.964,.733,3.525,2.295,4.259,4.259"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M2.206,6.464c.733-1.964,2.294-3.525,4.259-4.259"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M10.311,5.487l1.399-3.749h0c-.844-.315-1.757-.487-2.711-.487-.954,0-1.867,.172-2.711,.487l1.399,3.749c.409-.153,.849-.236,1.311-.236s.903,.084,1.311,.237Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M12.513,10.311l3.749,1.399h0c.315-.844,.487-1.757,.487-2.71,0-.954-.172-1.867-.487-2.711l-3.749,1.399c.153,.409,.236,.849,.236,1.311s-.084,.903-.237,1.311Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M7.689,12.513l-1.399,3.749h0c.844,.315,1.757,.487,2.711,.487,.954,0,1.867-.172,2.711-.487l-1.399-3.749c-.409,.153-.849,.236-1.311,.236s-.903-.084-1.311-.237Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M5.487,7.689l-3.749-1.399h0c-.315,.844-.487,1.757-.487,2.71,0,.954,.172,1.867,.487,2.711l3.749-1.399c-.153-.409-.236-.849-.236-1.311s.084-.903,.237-1.311Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </g>
  </svg>
);

SupportIcon.displayName = 'SupportIcon';

export const SecurityIcon = ({ className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 18 18"
    className={className}
  >
    <title>Security icon</title>
    <g
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      stroke="currentColor"
    >
      <line x1="9" y1="1.847" x2="9" y2="16.153" />
      <line x1="2.75" y1="8.75" x2="15.25" y2="8.75" />
      <path d="M9.305,1.848l5.25,1.68c.414,.133,.695,.518,.695,.952v6.52c0,3.03-4.684,4.748-5.942,5.155-.203,.066-.413,.066-.616,0-1.258-.407-5.942-2.125-5.942-5.155V4.48c0-.435,.281-.82,.695-.952l5.25-1.68c.198-.063,.411-.063,.61,0Z" />
    </g>
  </svg>
);

SecurityIcon.displayName = 'SecurityIcon';

export const SearchIcon = ({ className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 18 18"
    className={className}
  >
    <title>Search icon</title>
    <g fill="currentColor">
      <circle
        cx="8"
        cy="8"
        r="5.25"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M11.59 11.59L15.25 15.25"
      />
    </g>
  </svg>
);

SearchIcon.displayName = 'SearchIcon';

export const APIIcon = ({ className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 18 18"
    className={className}
  >
    <title>API icon</title>
    <g fill="currentColor">
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M5.75 6.75L7.75 6.75"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M5.75 9.75L10.25 9.75"
      />
      <path
        d="M15.16,6.25h-3.41c-.552,0-1-.448-1V1.852"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M15.25,10.019v-3.355c0-.265-.105-.52-.293-.707l-3.914-3.914c-.188-.188-.442-.293-.707-.293H4.75c-1.105,0-2,.896-2,2V14.25c0,1.104,.895,2,2,2h4.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </g>
  </svg>
);

APIIcon.displayName = 'APIIcon';

export const WebEditorIcon = ({ className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 18 18"
    className={className}
  >
    <title>Web Editor icon</title>
    <g fill="currentColor">
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M3.25 1L3.25 5.5"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M5.5 3.25L1 3.25"
      />
      <path
        d="M4.75,14v-4.268c0-.53,.211-1.039,.586-1.414L10.22,3.434c1.407-1.407,3.689-1.407,5.096,0h0c1.407,1.407,1.407,3.689,0,5.096l-4.884,4.884c-.375,.375-.884,.586-1.414,.586h-.733"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M2.5 16.25L9.25 9.5"
      />
    </g>
  </svg>
);

WebEditorIcon.displayName = 'WebEditorIcon';

export const ArrowUpRightIcon = ({ className }: IconProps) => (
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
    className={className}
    aria-label="Upgrade arrow"
  >
    <title>Upgrade arrow</title>
    <path d="M7 7h10v10" />
    <path d="M7 17 17 7" />
  </svg>
);

ArrowUpRightIcon.displayName = 'ArrowUpRightIcon';

export const ChevronRightIcon = ({ className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.25"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <title>Chevron right</title>
    <path d="m9 18 6-6-6-6" />
  </svg>
);

ChevronRightIcon.displayName = 'ChevronRightIcon';

export const FeaturesIcon = ({ className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 18 18"
    className={className}
  >
    <title>Features icon</title>
    <g fill="currentColor">
      <rect
        x="1.75"
        y="2.75"
        width="7"
        height="5.5"
        rx="1"
        ry="1"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <rect
        x="12.25"
        y="4.75"
        width="4"
        height="8.5"
        rx="1"
        ry="1"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <rect
        x="3.75"
        y="11.25"
        width="5.5"
        height="4"
        rx="1"
        ry="1"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </g>
  </svg>
);

FeaturesIcon.displayName = 'FeaturesIcon';

export const PublishingIcon = ({ className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 18 18"
    className={className}
  >
    <title>Publishing icon</title>
    <g fill="currentColor">
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M3.25 1L3.25 5.5"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M5.5 3.25L1 3.25"
      />
      <path
        d="M4.75,14v-4.268c0-.53,.211-1.039,.586-1.414L10.22,3.434c1.407-1.407,3.689-1.407,5.096,0h0c1.407,1.407,1.407,3.689,0,5.096l-4.884,4.884c-.375,.375-.884,.586-1.414,.586h-.733"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M2.5 16.25L9.25 9.5"
      />
    </g>
  </svg>
);

PublishingIcon.displayName = 'PublishingIcon';

export const Security2Icon = ({ className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 18 18"
    className={className}
  >
    <title>Security 2 icon</title>
    <g fill="currentColor">
      <circle cx="5.5" cy="9" r="1" fill="currentColor" data-stroke="none" stroke="none" />
      <circle cx="9" cy="9" r="1" fill="currentColor" data-stroke="none" stroke="none" />
      <circle cx="12.5" cy="9" r="1" fill="currentColor" data-stroke="none" stroke="none" />
      <path
        d="M16.25,8.471v-1.721c0-1.104-.895-2-2-2H3.75c-1.105,0-2,.896-2,2v4.5c0,1.104,.895,2,2,2h6.052"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M12.244 13.75L13.853 15.25 17.25 10.75"
      />
    </g>
  </svg>
);

Security2Icon.displayName = 'Security2Icon';

// 导出所有图标组件的类型
export type IconComponent = React.FC<IconProps>;

// 导出所有图标名称的联合类型
export type IconName =
  | 'preview'
  | 'check'
  | 'users'
  | 'chat'
  | 'analytics'
  | 'aiAssistant'
  | 'chart'
  | 'subpath'
  | 'feedback'
  | 'customization'
  | 'password'
  | 'grammar'
  | 'branding'
  | 'aiCredits'
  | 'donation'
  | 'auth'
  | 'multiProduct'
  | 'customHomepage'
  | 'sso'
  | 'uptime'
  | 'support'
  | 'security'
  | 'search'
  | 'api'
  | 'webEditor'
  | 'arrowUpRight'
  | 'chevronRight'
  | 'features'
  | 'publishing'
  | 'security2';
