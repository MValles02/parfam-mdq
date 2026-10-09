"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authenticate, type LoginState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className="h-[52px] w-full text-base"
      disabled={pending}
    >
      {pending ? (
        <>
          <LoaderCircle className="animate-spin" />
          Entrando...
        </>
      ) : (
        "Entrar"
      )}
    </Button>
  );
}

export function LoginForm({ returnTo }: { returnTo?: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(
    authenticate,
    {},
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {returnTo ? (
        <input type="hidden" name="returnTo" value={returnTo} />
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="email" className="text-sm font-semibold">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          className="h-12"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password" className="text-sm font-semibold">
          Contraseña
        </Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="h-12 pr-20"
          />
          {/* The visible text is exactly "Mostrar"/"Ocultar": an aria-label
              containing "contraseña" would make the password label locator
              ambiguous in the e2e specs. */}
          <button
            type="button"
            aria-pressed={showPassword}
            onClick={() => setShowPassword((value) => !value)}
            className="absolute top-1 right-1 h-10 rounded px-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            {showPassword ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      </div>

      {state.error ? (
        <p
          role="alert"
          className="flex items-center gap-2 rounded bg-danger px-3 py-2.5 text-sm text-danger-foreground"
        >
          <AlertCircle className="size-4 shrink-0" />
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
