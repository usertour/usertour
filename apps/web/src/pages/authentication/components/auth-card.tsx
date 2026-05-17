import { ReactNode } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@usertour/card';
import { Skeleton } from '@usertour/skeleton';

interface AuthCardProps {
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  loading?: boolean;
  contentClassName?: string;
  children?: ReactNode;
}

export const AuthCard = ({
  title,
  description,
  footer,
  loading,
  contentClassName = 'grid gap-4',
  children,
}: AuthCardProps) => {
  return (
    <Card>
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-semibold tracking-tight">{title}</CardTitle>
        {description && (
          <CardDescription className="text-sm text-muted-foreground">{description}</CardDescription>
        )}
      </CardHeader>
      {(loading || children !== undefined) && (
        <CardContent className={contentClassName}>
          {loading ? <AuthCardSkeleton /> : children}
        </CardContent>
      )}
      {footer && <CardFooter className="flex flex-col">{footer}</CardFooter>}
    </Card>
  );
};

AuthCard.displayName = 'AuthCard';

export const AuthCardSkeleton = () => (
  <>
    <Skeleton className="h-4 w-24" />
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-4 w-24" />
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-10 w-full" />
  </>
);

AuthCardSkeleton.displayName = 'AuthCardSkeleton';
