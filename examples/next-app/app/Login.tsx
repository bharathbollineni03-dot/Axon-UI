'use client';

import { LoginForm } from '@axonui/forms';

// `onSubmit` is a function, so the form lives in a client component.
export function Login() {
  return <LoginForm onSubmit={async () => {}} card={false} />;
}
