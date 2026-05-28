import { ReactNode } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@usertour/ui';
import { SpinnerIcon } from '@usertour/icons';

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
        <CardContent className={loading ? 'flex justify-center py-8' : contentClassName}>
          {loading ? (
            <SpinnerIcon className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            children
          )}
        </CardContent>
      )}
      {footer && <CardFooter className="flex flex-col">{footer}</CardFooter>}
    </Card>
  );
};

AuthCard.displayName = 'AuthCard';
