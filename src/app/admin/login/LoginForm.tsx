"use client";

import { Button, PasswordInput } from "@once-ui-system/core";
import { useActionState } from "react";
import { LuCircleAlert } from "react-icons/lu";
import { type LoginState, loginAction } from "../actions";
import styles from "../admin.module.scss";

const initial: LoginState = { error: "" };

export function LoginForm({ next, configured }: { next: string; configured: boolean }) {
  const [state, action, pending] = useActionState(loginAction, initial);
  const error =
    state.error ||
    (configured
      ? ""
      : "ADMIN_PASSWORD is not set. Add it in Vercel → Settings → Environment Variables.");

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <input type="hidden" name="next" value={next} />
      <PasswordInput
        id="password"
        name="password"
        label="Password"
        autoComplete="current-password"
        autoFocus
        required
      />
      {error && (
        <div className={styles.formError} role="alert">
          <LuCircleAlert aria-hidden />
          {error}
        </div>
      )}
      <Button
        type="submit"
        variant="primary"
        size="m"
        fillWidth
        loading={pending}
        disabled={pending}
      >
        Log in
      </Button>
    </form>
  );
}
