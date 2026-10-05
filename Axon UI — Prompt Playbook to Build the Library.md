# Axon UI — Prompt Playbook to Build the Library

Oct 5, 2026 · @Venkata Bharath Bollieneni

## How to use these prompts

Run the prompts in order, one per coding session, in an agentic coding tool such as Claude Code. Each package builds on the ones before it: theme feeds core, and core feeds forms, chat, charts and table.

1. Start every session by pasting **Prompt 0** (the master brief), then the prompt for that step.
2. Finish one step completely before moving on: it should build, pass tests, and render in Storybook.
3. Commit after each step so you can roll back if a later prompt goes wrong.
4. If a step is large (Prompts 3, 4, 6), split it: ask for 3 to 5 components per session rather than all at once.
5. After each step, run the review prompts in the last section to catch gaps before they pile up.

The stack choices in Prompt 0 are a strong default. Change them there once, and every later prompt inherits the change.

## Prompt 0: Master project brief

Paste this at the start of every session so the AI keeps the same conventions across the whole library.

```text
You are a senior React engineer and design-system architect. We are building "Axon UI", an open-source React component library comparable to Material UI, with extra packages for prebuilt forms, AI chat interfaces, charts and data tables.

MONOREPO PACKAGES
- @axon/theme   design tokens, ThemeProvider, light/dark mode
- @axon/core    base controls (Button, TextField, Checkbox, Radio, Label, etc.)
- @axon/forms   form engine + prebuilt forms (login, registration, etc.)
- @axon/chat    AI chat window and all related components/forms
- @axon/charts  SVG charts (line, bar, area, pie, etc.)
- @axon/table   data grid (sorting, filtering, pagination, virtualization)
- apps/docs     Storybook documentation

TECH STACK
- React 18+ (support 19), TypeScript strict mode, function components + hooks only
- pnpm workspaces + Turborepo
- tsup for builds: ESM + CJS + .d.ts, tree-shakeable, "sideEffects" set correctly
- Styling: plain CSS per component using CSS custom properties from @axon/theme; class names prefixed "axon-" using BEM-like naming (axon-button, axon-button--primary); each package ships a styles.css; no CSS-in-JS runtime
- Positioning for popovers/menus/tooltips: @floating-ui/react
- Testing: Vitest + React Testing Library + jest-axe
- Docs: Storybook 8 with autodocs
- Versioning: Changesets

CONVENTIONS (apply to every component)
- Use forwardRef and spread remaining props onto the root element
- Support both controlled and uncontrolled usage where relevant (value/defaultValue/onChange)
- Common props: size ("sm" | "md" | "lg"), variant, color ("primary" | "secondary" | "success" | "warning" | "danger" | "neutral"), disabled, className, style
- Accessibility: WAI-ARIA patterns, full keyboard support, visible focus rings, labels linked to inputs, respects prefers-reduced-motion
- Export typed props interfaces (ButtonProps, TextFieldProps, ...)
- No hard-coded colors, spacing or fonts: always use theme CSS variables
- SSR safe (no window/document access during render)
- Each component folder contains: Component.tsx, Component.css, Component.test.tsx, Component.stories.tsx, index.ts

WORKING RULES
- Work only on the step I give you; do not start later steps
- After writing code, run build, lint and tests, and fix failures before finishing
- End each session with a short summary: files created, decisions made, anything left to do
```

## Prompt 1: Monorepo setup

This creates the empty skeleton every later step plugs into. Done when `pnpm build`, `pnpm test` and `pnpm storybook` all run cleanly.

```text
Step 1: Set up the Axon UI monorepo.

Create:
- Root: package.json, pnpm-workspace.yaml, turbo.json, tsconfig.base.json, .eslintrc (typescript-eslint, react, react-hooks, jsx-a11y), .prettierrc, .gitignore, .editorconfig, README.md, LICENSE (MIT)
- packages/theme, packages/core, packages/forms, packages/chat, packages/charts, packages/table
  Each with: package.json (name @axon/<pkg>, version 0.0.0, peerDependencies react and react-dom, "exports" map for ESM/CJS/types and ./styles.css), tsconfig.json extending the base, tsup.config.ts, src/index.ts, vitest.config.ts
- Internal dependencies: core depends on theme; forms, chat, charts and table depend on core and theme
- apps/docs: Storybook 8 (React + Vite) that loads stories from all packages and imports every package's styles.css
- Shared test setup: jsdom, @testing-library/jest-dom, jest-axe
- Changesets initialised
- GitHub Actions workflow: install, lint, typecheck, test, build on every pull request

Root scripts: dev, build, test, lint, typecheck, storybook, changeset, release.

Add one placeholder component (AxonPlaceholder) in core with a test and a story to prove the whole pipeline works end to end, then run every script and fix any issues.
```

## Prompt 2: @axon/theme

The theme is the foundation for every visual decision, so get it right before building any control.

```text
Step 2: Build @axon/theme.

Design tokens (TypeScript objects, exported):
- Color palettes: primary, secondary, success, warning, danger, info, neutral; each with shades 50-950
- Semantic tokens: background, surface, surface-raised, border, text-primary, text-secondary, text-disabled, focus-ring, overlay
- Typography: font families (sans, mono), sizes xs-4xl, weights, line heights, letter spacing
- Spacing scale (0, 0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16 in rem multiples)
- Radius (none, sm, md, lg, xl, full), shadows (sm-xl), z-index layers (dropdown, sticky, modal, popover, toast, tooltip), motion durations and easings, breakpoints

CSS output:
- Generate CSS custom properties from the tokens: --axon-color-primary-500, --axon-space-4, --axon-radius-md, etc.
- Light theme on :root and [data-axon-theme="light"], dark theme on [data-axon-theme="dark"]
- Optional automatic mode that follows prefers-color-scheme
- A small CSS reset scoped to .axon-root

React API:
- <ThemeProvider theme={...} mode="light" | "dark" | "system"> that applies the data attribute and any custom token overrides as CSS variables
- createTheme(overrides) that deep-merges with the default theme, fully typed
- useTheme() hook returning tokens, current mode and setMode
- Persist the chosen mode optionally via a storageKey prop (guard for SSR)

Storybook: a "Foundations" section showing color swatches, type scale, spacing, radius, shadows, and a light/dark toolbar toggle that applies to all stories.

Tests: createTheme merging, ThemeProvider sets the attribute, mode switching.
```

## Prompt 3: @axon/core input controls

These are the controls you listed first. Build them in three batches (buttons and text, choice controls, pickers) if one session gets too long.

```text
Step 3: Build the input controls in @axon/core. Follow every convention from the master brief.

Batch A: Buttons and text
- Button: variants solid | outline | ghost | link; sizes; colors; loading state with spinner (keeps width, sets aria-busy); startIcon/endIcon; fullWidth; renders as <a> when href is given
- IconButton: requires aria-label; round and square shapes
- ButtonGroup: attached buttons, shared size/variant
- Label: htmlFor, required indicator, optional hint text
- TextField: label, placeholder, helperText, error + errorMessage (linked via aria-describedby), startAdornment/endAdornment, clearable, character counter, types text | email | password (with show/hide toggle) | number | search | tel | url
- TextArea: autoResize with minRows/maxRows, character counter
- NumberInput: min, max, step, stepper buttons, keyboard arrows, precision

Batch B: Choice controls
- Checkbox: checked, indeterminate, label, description
- CheckboxGroup: options array or children, value as string[], horizontal/vertical
- Radio + RadioGroup: roving tabindex and arrow-key navigation per WAI-ARIA radio group pattern
- Switch: role="switch", label left or right
- Slider and RangeSlider: marks, step, min/max, tooltip on thumb, keyboard support
- Rating: stars, half values, read-only mode

Batch C: Pickers
- Select: native-feel custom listbox, placeholder, groups, disabled options
- MultiSelect: chips for selected values, select all
- Autocomplete / Combobox: async options loader, debounced search, free text option, highlight matching text
- DatePicker, TimePicker, DateRangePicker: calendar popover, min/max dates, locale-aware formatting via Intl, keyboard grid navigation
- FileUpload: drag-and-drop zone, accept and maxSize validation, file list with remove, progress state
- ColorPicker: swatches and hex input
- OTPInput: N boxes, auto-advance, paste support

For every component: test rendering, controlled and uncontrolled usage, keyboard interaction, disabled state, and an axe accessibility check. Write stories showing every variant, size, state and a playground with controls.
```

## Prompt 4: @axon/core layout, navigation, overlays and feedback

These are the "many other controls" that make Axon a full MUI-style kit. The chat, forms and table packages reuse them heavily.

```text
Step 4: Build the remaining @axon/core components. Follow every convention from the master brief.

Batch A: Layout and display
- Box (polymorphic "as" prop), Stack (direction, gap, align, justify, wrap, responsive values), Grid (12 columns, responsive spans), Container (max widths per breakpoint), Divider
- Card (header, media, content, footer, elevation, clickable variant)
- Typography / Text and Heading (variants mapped to the type scale, truncate and line clamp)
- Avatar and AvatarGroup (image, initials fallback, status dot, max with +N)
- Badge, Chip/Tag (removable, clickable, with icon), Kbd, Code
- List and ListItem (icon, secondary text, actions), Image with fallback

Batch B: Navigation
- Tabs (horizontal/vertical, lazy panels, keyboard per WAI-ARIA tabs pattern)
- Accordion (single or multiple open), Breadcrumbs (collapse when long), Pagination
- Menu / DropdownMenu (nested submenus, checkable items, keyboard and typeahead)
- AppBar, Sidebar / Drawer navigation (collapsible), Stepper (horizontal/vertical, linear/non-linear), Link

Batch C: Overlays
- Modal / Dialog (focus trap, return focus, Esc to close, scroll lock, sizes, aria-labelledby)
- ConfirmDialog helper, Drawer (left/right/top/bottom)
- Popover, Tooltip (delay, placement, never on disabled elements without a wrapper)
- Portal utility

Batch D: Feedback
- Alert (info/success/warning/danger, dismissible, with actions)
- Toast system: <ToastProvider> + useToast() with queueing, auto-dismiss, pause on hover, aria-live region
- Spinner, Progress (linear and circular, determinate and indeterminate), Skeleton (text, circle, rect)
- EmptyState (icon, title, description, action)

Shared hooks to export: useDisclosure, useControllableState, useClickOutside, useMediaQuery, useId, useFocusTrap, useDebounce.

Tests and stories for everything, same standard as Step 3.
```

## Prompt 5: @axon/forms

This step builds a form engine first, then the prebuilt forms on top of it, so every prebuilt form stays customizable.

```text
Step 5: Build @axon/forms.

Form engine
- Built on react-hook-form with zod validation (both as dependencies; also allow a custom validator function)
- <Form> component: takes schema, defaultValues, onSubmit (async supported), mode; handles submitting state and a form-level error message
- <FormField name="..."> that wires any @axon/core input to the form: label, helper text, error message, required marker, aria-invalid
- Prebuilt bindings: FormTextField, FormSelect, FormCheckbox, FormRadioGroup, FormSwitch, FormDatePicker, FormFileUpload
- FormActions (submit/cancel row), FormSection (title + description), FormGrid (responsive columns)
- Multi-step forms: <FormWizard> using Stepper, per-step validation, back/next, summary step
- Schema-driven forms: <SchemaForm fields={[...]}> that renders fields from a JSON config

Prebuilt forms (each fully customizable via props: title, logo, labels/i18n strings, extra fields, slots, onSubmit; each exports its zod schema so users can extend it)
- LoginForm: email or username, password, remember me, forgot password link, social login buttons slot, error banner
- RegistrationForm: name, email, password + confirm with strength meter, terms checkbox, optional extra fields
- ForgotPasswordForm, ResetPasswordForm, OTPVerificationForm (resend with countdown)
- ChangePasswordForm, ProfileForm (avatar upload, name, bio), ContactForm, NewsletterForm
- AuthCard layout wrapper (centered card, logo, footer links) usable by all auth forms

No network calls inside forms: everything goes through onSubmit and returned errors (support mapping server errors to fields via setError).

Tests: validation messages, async submit states, server error mapping, wizard navigation. Stories for every prebuilt form with a mocked submit.
```

## Prompt 6: @axon/chat

This is the package that sets Axon apart from MUI. It stays provider-agnostic: the library renders the chat, and the app decides which AI backend to call.

```text
Step 6: Build @axon/chat. Split into the batches below across sessions.

Data model and state (build first)
- Types: Message { id, role: "user" | "assistant" | "system" | "tool", content, parts (text, code, image, file, tool-call, tool-result), createdAt, status: "pending" | "streaming" | "done" | "error", metadata }, Conversation { id, title, messages, updatedAt, pinned }
- useChat({ onSend, initialMessages }) hook: messages, input, setInput, send, stop, regenerate, editAndResend, deleteMessage, isStreaming, error
- onSend receives the history and returns either a Promise<string> or an AsyncIterable<string> for token streaming; stop() aborts via AbortSignal
- Example adapters in docs only (OpenAI-compatible and Anthropic-compatible fetch with streaming); no API keys or provider SDKs inside the package

Batch A: Chat window
- ChatWindow: composed layout (header, message list, composer), full-page, embedded and floating-widget (launcher button) modes
- ChatHeader: title, model selector slot, new chat, settings, close
- MessageList: auto-scroll that pauses when the user scrolls up, "jump to latest" button, date separators, virtualized for long threads, aria-live for new assistant messages
- MessageBubble: user/assistant styles, avatar, timestamp, status, actions (copy, edit, regenerate, thumbs up/down, delete)
- Markdown rendering (react-markdown + GFM) with tables, lists and links; CodeBlock with syntax highlighting, language label and copy button
- StreamingText with blinking cursor, TypingIndicator, ThinkingIndicator (collapsible reasoning)
- ToolCallCard (name, arguments, result, status), Citations / SourceList

Batch B: Composer
- PromptInput: auto-growing textarea, Enter to send and Shift+Enter for newline (configurable), send/stop button, character or token counter
- Attachments: file and image picker, drag-and-drop and paste, preview chips with remove
- Slash commands menu and @mentions (pluggable lists), voice input button slot
- SuggestedPrompts / starter cards for empty state

Batch C: Surrounding UI
- ConversationSidebar: list grouped by Today / Yesterday / Previous 7 days, search, rename, pin, delete, new chat
- ModelSelector (name, description, badge), ChatEmptyState, ChatErrorState with retry
- FeedbackDialog (rating + reason chips + comment)
- ShareConversationDialog, ExportConversation (markdown/JSON)

Batch D: Chat forms (built with @axon/forms)
- ChatSettingsForm: model, temperature, max tokens, top-p, streaming toggle
- SystemPromptEditor with saved presets
- PromptTemplateForm (variables like {{name}} detected and rendered as fields)
- APIKeyForm (masked input, provider select, test-connection button calling a prop)
- PersonaForm / AssistantProfileForm (name, avatar, instructions, tone)
- KnowledgeUploadForm (files for retrieval, status list)

Tests: streaming updates, stop/abort, auto-scroll behaviour, keyboard send, attachment validation. Stories with a mock streaming backend that emits tokens on a timer.
```

## Prompt 7: @axon/charts

Charts render as plain SVG using small d3 math modules, so they theme with the same CSS variables and stay light.

```text
Step 7: Build @axon/charts.

Foundation
- Use d3-scale, d3-shape, d3-array and d3-format for math only; render all output as React SVG (no d3 DOM manipulation)
- ResponsiveContainer using ResizeObserver; SSR-safe fallback size
- Shared primitives: XAxis, YAxis (tick formatting, label, grid lines), Legend (clickable to toggle series), Tooltip (follows pointer, shared across series), CrosshairCursor
- Chart palette pulled from theme tokens; works in dark mode
- Common props: data, xKey, series [{ key, name, color }], height, loading, emptyState, animate (respect reduced motion)

Chart types
- LineChart (curve types, dots, multiple series), AreaChart (stacked option)
- BarChart (vertical/horizontal, grouped, stacked), ComboChart (bars + line, dual Y axis)
- PieChart and DonutChart (center label, labels with leader lines)
- ScatterChart (size and color encodings), RadarChart, Gauge, Sparkline (inline, tiny)
- Heatmap (calendar style option)
- StatCard / KPI card with value, delta and sparkline

Accessibility
- role="img" with generated aria-label summary; optional visually hidden data table; keyboard focus moves between data points and shows the tooltip

Tests: scale/domain calculations, legend toggling, tooltip content, empty and loading states. Stories with realistic sample datasets for every chart type.
```

## Prompt 8: @axon/table

The table builds on TanStack Table for logic, with Axon styling on top, which saves months of edge-case work.

```text
Step 8: Build @axon/table.

Foundation
- Use @tanstack/react-table (headless logic) and @tanstack/react-virtual (row virtualization)
- Simple <Table> for static data (striped, bordered, dense, sticky header, caption) using semantic table markup
- <DataGrid> for full features, with typed column definitions: header, accessor, cell renderer, width, minWidth, align, sortable, filterable, pinned

DataGrid features
- Sorting (single and multi with Shift), column filters (text, number range, select, date range) and global search
- Pagination (client and server modes) and infinite scroll mode
- Row selection (checkbox column, select all on page vs all rows), bulk action toolbar
- Column resizing, reordering, pinning left/right, show/hide menu
- Expandable rows (detail panel) and row grouping with aggregates
- Inline cell editing using @axon/core inputs, with validation and onRowUpdate
- Loading skeleton rows, empty state, error state
- Toolbar: search, filters, density toggle, column menu, export to CSV
- Server mode: onStateChange({ pagination, sorting, filters }) so apps fetch data themselves; totalRowCount prop
- Save/restore grid state (column order, widths, visibility) via a callback

Accessibility: ARIA grid pattern for DataGrid with arrow-key cell navigation; announced sort changes.

Tests: sort, filter, pagination, selection, editing, server mode callbacks. Stories with 10,000 generated rows to prove virtualization performance.
```

## Prompt 9: Docs, quality and publishing

The final step turns the code into a library other developers can find, trust and install.

```text
Step 9: Prepare Axon UI for release.

Documentation
- Storybook: Introduction, Getting Started (install, import styles.css, wrap in ThemeProvider), Theming guide, Accessibility notes per component, and a props table for every component via autodocs
- Example pages built only from Axon components: Admin dashboard (charts + DataGrid), Auth pages (all prebuilt forms), AI chat app (sidebar + chat window + settings)
- README for each package with install and a minimal usage example

Quality
- Visual regression tests with Storybook test-runner or Playwright screenshots, light and dark
- Bundle size check per package (size-limit) added to CI
- Verify tree-shaking: importing only Button must not pull in other components
- Run an accessibility audit across all stories and fix every violation
- Test against React 18 and React 19, and in a Next.js app router project (add "use client" banners where needed)

Publishing
- Set up npm org @axon (or my fallback scope), publishConfig access public, provenance
- Changesets release workflow in GitHub Actions: version PR, then publish on merge
- Deploy Storybook to GitHub Pages or Vercel on every release
- CHANGELOG, CONTRIBUTING.md, CODE_OF_CONDUCT.md, issue and PR templates
```

## Reusable follow-up prompts

Use these after any step to review, fix or extend the work.

**Review a finished step**

```text
Review everything built in this step against the master brief. List every gap: missing props, convention violations, accessibility issues, missing tests or stories, hard-coded values, inconsistent naming with other packages. Then fix them all and re-run build, lint and tests.
```

**Add a new component later**

```text
Add a new component <Name> to @axon/<package>. Purpose: <what it does>. Required features: <list>. Match the API style, file structure, theming, accessibility and test coverage of existing components such as <similar component>. Export it from the package index and add stories.
```

**Fix a bug**

```text
Bug in <Component>: <what happens> when <steps to reproduce>. Expected: <what should happen>. First write a failing test that reproduces it, then fix the code, then confirm all tests pass.
```

**Consistency pass across packages**

```text
Audit all Axon packages for consistency: prop names (onChange vs onValueChange, size values, variant names), CSS class naming, exported types, and README format. Produce a table of inconsistencies, propose one standard for each, then apply it.
```
