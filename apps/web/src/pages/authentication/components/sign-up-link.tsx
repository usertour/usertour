'use client';

import { useGlobalConfigQuery } from '@usertour-packages/shared-hooks';
import { Link } from 'react-router-dom';

export const SignUpLink = ({
  prefix,
  label = 'Sign up for a free trial',
}: {
  prefix: string;
  label?: string;
}) => {
  const { data, loading } = useGlobalConfigQuery();

  if (loading || data?.allowUserRegistration === false || data?.needsSystemAdminSetup === true) {
    return null;
  }

  return (
    <>
      {prefix}{' '}
      <Link to="/auth/signup" className="underline underline-offset-4 hover:text-primary">
        {label}
      </Link>
    </>
  );
};

SignUpLink.displayName = 'SignUpLink';

export const SignUpPrompt = ({
  prefix,
  className,
  label = 'Sign up for a free trial',
}: {
  prefix: string;
  className?: string;
  label?: string;
}) => {
  const { data, loading } = useGlobalConfigQuery();

  if (loading || data?.allowUserRegistration === false || data?.needsSystemAdminSetup === true) {
    return null;
  }

  return (
    <div className={className}>
      <SignUpLink prefix={prefix} label={label} />
    </div>
  );
};

SignUpPrompt.displayName = 'SignUpPrompt';
