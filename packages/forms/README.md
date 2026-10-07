# @axon/forms

A form engine and prebuilt forms for Axon UI. The engine is [react-hook-form](https://react-hook-form.com) with [zod](https://zod.dev) validation, wired to the `@axon/core` inputs. The prebuilt forms (login, registration, password reset, OTP, profile, contact, newsletter) are built on it, so every one of them can be customised, translated and extended.

No form makes a network call. Each hands validated values to your `onSubmit` and shows the errors you return from it.

```bash
pnpm add @axon/forms @axon/core @axon/theme
```

```tsx
import { ThemeProvider } from '@axon/theme';
import { LoginForm } from '@axon/forms';
import '@axon/theme/styles.css';
import '@axon/core/styles.css';
import '@axon/forms/styles.css';

export function SignIn() {
  return (
    <ThemeProvider>
      <LoginForm
        forgotPasswordHref="/forgot"
        footer={<a href="/signup">Create an account</a>}
        onSubmit={async ({ identifier, password, remember }) => {
          const response = await fetch('/api/login', { method: 'POST', body: JSON.stringify({ identifier, password, remember }) });
          if (response.status === 401) return { fieldErrors: { password: 'That password is not right.' } };
          if (!response.ok) throw new Error('Something went wrong. Try again.');
        }}
      />
    </ThemeProvider>
  );
}
```

`@axon/forms/styles.css` needs `@axon/core/styles.css` too, which it builds on.

## The form engine

```tsx
import { Form, FormTextField, FormSelect, FormActions, z } from '@axon/forms';

const schema = z.object({
  email: z.string().min(1, 'Enter your email.').pipe(z.email('Enter a valid email.')),
  plan: z.string({ error: 'Choose a plan.' }),
});

<Form
  schema={schema}
  defaultValues={{ email: '', plan: null }}
  onSubmit={async (values) => {
    await save(values); // values is the schema's parsed output
  }}
>
  <FormTextField name="email" label="Email" type="email" fullWidth required />
  <FormSelect name="plan" label="Plan" options={plans} placeholder="Choose" fullWidth />
  <FormActions submitLabel="Save" />
</Form>;
```

| Piece                         | What it does                                                                                                                                                                           |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Form`                        | A `<form>` with `schema` (zod) and/or `validate` (any function, sync or async), `defaultValues`, `mode` (default `onTouched`), async `onSubmit`, a submitting state and an error banner |
| `FormField`                   | Wires any input: value, change, blur, label, helper text, error message, required marker and `aria-invalid` through a `render` function                                                |
| Bindings                      | `FormTextField`, `FormTextArea`, `FormNumberInput`, `FormSelect`, `FormMultiSelect`, `FormCheckbox`, `FormCheckboxGroup`, `FormRadioGroup`, `FormSwitch`, `FormDatePicker`, `FormTimePicker`, `FormFileUpload`, `FormOTPInput` |
| `FormActions`                 | Cancel and submit row. The submit button is busy while submitting; `disableWhenPristine` and `disableWhenInvalid` are available                                                         |
| `FormSection`, `FormGrid`     | A titled `fieldset` with a description; responsive columns (`FormGridItem` for a field that spans more than one)                                                                         |
| `FormWizard`                  | Multi-step form on `Stepper`: per-step validation, Back and Next, an optional review step, focus moved to each step's heading                                                           |
| `SchemaForm`                  | Renders a form from a JSON config and generates the validation schema from it                                                                                                          |
| `useFormStatus`, `useAxonForm`| Read the submitting state from anywhere inside a form; create the form yourself when something outside the `<form>` needs it                                                           |

Each binding takes the matching `@axon/core` input's props, plus `name`. The field is seeded with the value the input shows (`''`, `null`, `[]` or `false`), so your schema never sees `undefined` for an untouched field.

### Server errors

`onSubmit` may be async. Report problems three ways, and use whichever fits:

```tsx
onSubmit={async (values, helpers) => {
  // 1. Return them:
  return { fieldErrors: { email: 'Already registered.' }, formError: 'Could not sign you up.' };

  // 2. Throw them. Any other thrown error shows its message in the banner:
  throw new FormSubmitError({ fieldErrors: { email: 'Already registered.' } });

  // 3. Use the helpers:
  helpers.setError('email', 'Already registered.');
  helpers.setFormError('Could not sign you up.');
}}
```

Field errors go on the matching fields (nested names use dots: `"address.city"`) and the first one is focused. They clear when the user edits the field.

### Multi-step forms

```tsx
<FormWizard
  schema={schema}
  defaultValues={defaults}
  onSubmit={save}
  steps={[
    { id: 'account', label: 'Account', fields: ['name', 'email'], content: <>…</> },
    { id: 'plan', label: 'Plan', fields: ['plan'], content: <>…</> },
  ]}
  summary={(values, goToStep) => <Review values={values} onEdit={goToStep} />}
/>
```

Next validates only the step's `fields`. Enter acts as Next until the last step. If the final submit fails, the wizard returns to the first step with an error.

### Schema-driven forms

```tsx
<SchemaForm
  columns={2}
  fields={[
    { type: 'email', name: 'email', label: 'Email', required: true },
    { type: 'select', name: 'role', label: 'Role', options },
    { type: 'text', name: 'other', label: 'Which role?', required: true, hidden: (v) => v.role !== 'other' },
  ]}
  onSubmit={save}
/>
```

Field types: text, email, password, tel, url, search, textarea, number, select, radio, multiselect, checkboxes, checkbox, switch, date, time, file, otp, and `section` for groups. `required`, `minLength`, `pattern` and the rest become validation. `hidden` can depend on other fields; a hidden field is skipped and left out of the submitted values. Pass your own `schema` for anything the config cannot say, or start from `createSchemaFromFields(fields)`.

## Prebuilt forms

| Form                                | Submits                                                          | Notes                                                                                                   |
| ----------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `LoginForm`                         | `{ identifier, password, remember }`                             | Email, username or either; forgot-password link; social buttons slot                                    |
| `RegistrationForm`                  | `{ name, email, password, confirmPassword, acceptTerms }`        | Password strength meter, configurable password rules, terms with links                                  |
| `ForgotPasswordForm`                | `{ email }`                                                      | Swaps itself for a "Check your email" confirmation                                                      |
| `ResetPasswordForm`                 | `{ password, confirmPassword }`                                  | The token stays in your app                                                                             |
| `OTPVerificationForm`               | `{ code }`                                                       | Resend button with a countdown; `autoSubmit`; any code length                                           |
| `ChangePasswordForm`                | `{ currentPassword, newPassword, confirmPassword }`              | Rejects reusing the current password                                                                    |
| `ProfileForm`                       | `{ avatar, name, bio }`                                          | Local picture preview with size and type checks; `avatar` is a `File` or `null`                         |
| `ContactForm`                       | `{ name, email, topic, subject, message, consent }`              | Optional topics, subject and consent; confirmation with "Send another"                                  |
| `NewsletterForm`                    | `{ name, email, consent }`                                       | Stacked or `inline`; no card by default                                                                 |
| `AuthCard`, `PasswordStrengthMeter` | —                                                                | The layout and the meter, for your own forms                                                            |

Every prebuilt form accepts:

- `onSubmit`, `defaultValues`, `mode`, `disabled`, `error` (a banner message from your own state).
- `title`, `description`, `logo`, `footer`, `headingLevel`, `size`, `card`, `centered`, `className`, to dress the card.
- `labels` for every piece of text, including the ones inside confirmations. Defaults are exported (`defaultLoginLabels`, …).
- `children`: extra fields, placed after the built-in ones and before the submit button.
- `schema`: replaces the validation, with the schema the form exports as the starting point.

### Extending a form

Each form exports its schema, a `createXSchema(options)` factory for other rules or translated messages, and the values type.

```tsx
import { RegistrationForm, registrationSchema, FormTextField, z } from '@axon/forms';

const schema = registrationSchema.safeExtend({ company: z.string().min(1, 'Enter your company.') });

<RegistrationForm schema={schema} defaultValues={{ company: '' }} onSubmit={signUp}>
  <FormTextField name="company" label="Company" fullWidth />
</RegistrationForm>;
```

Use `.safeExtend()`, not `.extend()`: it keeps the schema's own rules, such as "the passwords must match".

### Translating

```tsx
<LoginForm
  title="Iniciar sesión"
  labels={{ email: 'Correo', password: 'Contraseña', submit: 'Entrar' }}
  onSubmit={signIn}
/>
```

For translated validation messages build the schema with the factory: `createLoginSchema({ messages: { passwordRequired: 'Escribe tu contraseña.' } })`, and pass it as `schema`.

## Accessibility

Fields are labelled, errors are linked with `aria-describedby` and set `aria-invalid`, and the first invalid field is focused on a failed submit. The error banner is `role="alert"`. A confirmation that replaces a form is `role="status"`. The wizard moves focus to each step's heading, which reads out "Step 2 of 4: Plan". Auto-focus is never on unless you ask for it.

## Notes

- `react-hook-form`, `zod` and `@hookform/resolvers` are dependencies. `z`, `useWatch`, `useFormContext` and the other common react-hook-form hooks are re-exported, so most apps do not import them directly.
- The password strength meter is a hint for the person typing, based on length and character mix. It is not a security check: set real rules in your schema and check passwords against breach lists on your server.
