"use client";

import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@usertour-ui/card";
import { Link } from "react-router-dom";

export const ResetPasswordSuccess = () => {
  return (
    <Card>
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl  font-semibold tracking-tight">
          Welcome back!
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Check your inbox, and click the link we just send to you.
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex flex-col">
        <div className="pt-4 text-center text-sm text-muted-foreground">
          <Link
            to="/auth/signin"
            className="underline underline-offset-4 hover:text-primary"
          >
            Back to sign in
          </Link>{" "}
        </div>
        <div className="pt-4 text-center text-sm text-muted-foreground">
          No account yet?{" "}
          <Link
            to="/auth/signup"
            className="underline underline-offset-4 hover:text-primary"
          >
            Sign up for a free trial
          </Link>{" "}
        </div>
      </CardFooter>
    </Card>
  );
};

ResetPasswordSuccess.displayName = "ResetPasswordSuccess";
