"use client";

import type { JSX } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { signOut } from "../../actions";
import { logoutButtonCopy } from "./copy";

const SubmitButton = (): JSX.Element => {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? logoutButtonCopy.pending : logoutButtonCopy.label}
    </Button>
  );
};

export const LogoutButton = (): JSX.Element => (
  <form action={signOut}>
    <SubmitButton />
  </form>
);
