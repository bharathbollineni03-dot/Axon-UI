# @axonui/core

Base components for Axon UI: buttons and inputs, choice controls, pickers, layout, navigation, overlays and feedback.

```bash
pnpm add @axonui/core @axonui/theme
```

```tsx
import { ThemeProvider } from '@axonui/theme';
import { Button, TextField } from '@axonui/core';
import '@axonui/theme/styles.css';
import '@axonui/core/styles.css';

export function App() {
  return (
    <ThemeProvider>
      <TextField label="Email" type="email" required helperText="We'll never share it." />
      <Button>Continue</Button>
    </ThemeProvider>
  );
}
```

## Available components

**Batch A: buttons and text** (Step 3)

| Component     | Notes                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------ |
| `Button`      | `solid`/`outline`/`ghost`/`link`, sizes, colors, `loading`, icons, `fullWidth`, `href` link |
| `IconButton`  | Requires `aria-label`; `round` or `square`                                                 |
| `ButtonGroup` | Attached or spaced; shares `size`/`variant`/`color`/`disabled` with its buttons            |
| `Label`       | `htmlFor`, required marker, hint text                                                      |
| `TextField`   | Label, helper/error text, adornments, `clearable`, counter, password toggle                |
| `TextArea`    | `autoResize` with `minRows`/`maxRows`, counter                                             |
| `NumberInput` | `min`/`max`/`step`/`precision`, steppers, arrow, Page and Home/End keys                    |

**Batch B: choice controls** (Step 3)

| Component                  | Notes                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| `Checkbox`                 | Native checkbox with a custom box; `indeterminate`, label and description                              |
| `CheckboxGroup`            | `options` or children; `value` is a `string[]`; horizontal/vertical; helper and error text            |
| `Radio` / `RadioGroup`     | Native radios sharing a `name`: arrow keys move and select, one tab stop (WAI-ARIA radio group)        |
| `Switch`                   | `role="switch"`; label on either side                                                                  |
| `Slider` / `RangeSlider`   | WAI-ARIA slider thumbs; marks, step, value tooltip, pointer drag, arrows / Page / Home / End            |
| `Rating`                   | Stars with half values; read-only mode is an image with a text alternative                              |

**Batch C, part 1: listbox pickers** (Step 3)

| Component      | Notes                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------- |
| `Select`       | Custom listbox (WAI-ARIA select-only combobox): groups, descriptions, disabled options, typeahead, form `name` |
| `MultiSelect`  | Removable chips, "select all", `clearable`, Backspace removes the last chip, one hidden input per value       |
| `Autocomplete` | Editable combobox: client filtering or async `loadOptions` (debounced, abortable), `freeSolo`, match highlighting |

**Batch C, part 2: date, time and special inputs** (Step 3)

| Component         | Notes                                                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `DatePicker`      | Typed or picked; `Date` value; `min`/`max`/`isDateDisabled`; locale formatting and parsing via `Intl`; ARIA grid calendar |
| `DateRangePicker` | Start and end inputs with a two-month calendar and hover preview; value is `{ start, end }`                            |
| `TimePicker`      | Value is a 24-hour `"HH:mm"` string; typed ("3pm", "15:30") or picked from hour/minute/AM-PM columns; `min`/`max`       |
| `FileUpload`      | Drag-and-drop zone, `accept`/`maxSize`/`maxFiles` validation with reasons, file list with remove, progress state         |
| `ColorPicker`     | Swatch radio group, hex input and the native chooser; value is lowercase `#rrggbb`                                     |
| `OTPInput`        | N boxes with auto-advance, Backspace navigation, paste and SMS-autofill support, `mask`, `onComplete`                   |

Dates are local calendar dates and the pickers default to the `en-US` locale so server and client render identically; pass `locale={navigator.language}` to follow the user. The date and time dialogs are non-modal: Escape, an outside press or tabbing away closes them and focus returns to the field.

**Step 4, batch A: layout and display**

| Component                           | Notes                                                                                                |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `Box`                               | Polymorphic (`as`); spacing, surface, radius and shadow shortcuts backed by theme tokens             |
| `Stack`                             | Flex row/column with gap, align, justify, wrap, an optional `divider`; every prop can be responsive   |
| `Grid` / `GridItem`                 | 12-column CSS grid; `columns`, `gap`, `span` and `start` can be responsive                          |
| `Container`                         | Centers content; max widths taken from the theme breakpoints                                         |
| `Divider`                           | Horizontal, vertical, dashed, or labelled; `separator` role (or decorative)                          |
| `Card` (+ Header, Media, Content, Footer) | Outlined/elevated/filled; `clickable` cards are keyboard-operable buttons or links                |
| `Typography`, `Heading`, `Text`      | Type-scale variants; `color`, `weight`, `align`, `truncate`, `lineClamp`; heading level vs size       |
| `Avatar` / `AvatarGroup`            | Image with initials fallback, status dot, "+N" overflow                                              |
| `Badge`, `Chip` / `Tag`            | Count/dot/pill badge (anchorable); chip that can be clickable, selectable and removable              |
| `Kbd`, `Code`                       | Key caps and inline/block code                                                                       |
| `List` / `ListItem`                 | Icon, two lines of text, trailing action; rows can be buttons or links                               |
| `Image`                             | Lazy loading, aspect ratio, and a placeholder, node or backup image when loading fails              |

**Step 4, batch B: navigation**

| Component                                | Notes                                                                                                                               |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `Link`                                   | Polymorphic (`as` for router links); `underline`, `external` (new tab, `rel`, announced), `disabled`                                |
| `Tabs` / `TabList` / `Tab` / `TabPanel`  | WAI-ARIA tabs: horizontal or vertical, automatic or manual activation, `line`/`solid`/`pills`, `lazy` panels                        |
| `Accordion` / `AccordionItem`            | `single` (collapsible or not) or `multiple`; value is a `string[]`; ↑/↓/Home/End move between headers; `headingLevel`               |
| `Breadcrumbs`                            | `items` as data; last crumb is `aria-current="page"`; `maxItems` collapses the middle behind a "…" button; `linkAs` for routers      |
| `Pagination`, `getPaginationRange`       | Prev/next, first/last, ellipsis ranges with a constant width; the range function is exported for custom controls                     |
| `Stepper` / `Step`                       | Horizontal or vertical; `linear` or free selection; optional, error and completed states; vertical steps hold their content          |
| `AppBar`                                 | `banner` with leading/children/trailing; `static`/`sticky`/`fixed`; plain or filled with a color                                     |
| `Sidebar` (+ Section, Item, Toggle)      | `navigation` landmark that collapses to icons (names stay available to screen readers); items are links, buttons or router links     |
| `DropdownMenu`, `Menu` (+ items)         | WAI-ARIA menu button: arrows, Home/End, typeahead, checkbox and radio items, nested `SubMenu`s, focus returns to the trigger         |

Menus are built from `MenuItem`, `MenuCheckboxItem`, `MenuRadioGroup` / `MenuRadioItem`, `MenuGroup`, `MenuSeparator` and `SubMenu`. `DropdownMenu` takes the trigger element (a `Button`, say) and wires up `aria-haspopup`, `aria-expanded` and the keys; use `Menu` directly when you open and place it yourself. Choosing an item closes the whole tree, while checkbox and radio items keep it open. `Tab` closes the menu and returns focus to the trigger.

**Step 4, batch C: overlays**

| Component                | Notes                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `Modal` (`Dialog`)       | Modal dialog: focus trap, focus returns to the opener, Esc and backdrop close, page scroll lock, sizes, `title`/`description` wired to `aria-labelledby`/`-describedby` |
| `ConfirmDialog`          | `alertdialog` with Cancel/Confirm, an async busy state, and focus that starts on Cancel for `danger`                                         |
| `Drawer`                 | Same machinery as `Modal`, sliding in from `left`, `right`, `top` or `bottom`; preset or custom size                                         |
| `Popover`                | Non-modal dialog on a trigger: rich content or a small form; Esc, outside press or tabbing away close it and focus returns to the trigger   |
| `Tooltip`                | Hover (delayed) and focus; hoverable, dismissible with Esc; a disabled control is wrapped in a focusable `<span>` so it can still show one |
| `Portal`                 | Renders children outside their parent, in the closest overlay or `.axon-root`; renders nothing on the server                              |

Modals and drawers stack: Esc closes only the topmost, and only that one holds the focus trap. Menus, selects, popovers and tooltips opened from inside a modal render **inside** it, so they sit above it and stay within its focus trap. Give `Modal`, `Drawer` and `Popover` a `title`, `aria-label` or `aria-labelledby`; the types require one. Tooltips supplement a visible or `aria-label` name, they do not replace it.

**Step 4, batch D: feedback**

| Component                     | Notes                                                                                                                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Alert`                       | `info`/`success`/`warning`/`danger`; `subtle`/`solid`/`outline`; `title`, `actions`, an `onClose` close button; `danger` is `role="alert"`, the rest `role="status"`          |
| `ToastProvider`, `useToast`   | Queueing past `limit`, auto-dismiss, pause on hover and focus, Esc closes, six placements; `show`, `info`/`success`/`warning`/`danger`, `dismiss`, `dismissAll`              |
| `Spinner`                     | Indeterminate ring; a polite `status` with a text label, or `decorative` when the busy state is announced elsewhere                                                          |
| `Progress`                    | `linear` or `circular`; determinate (`value`/`max`, announced as `aria-valuetext`) or indeterminate; the types require a name (`label`, `aria-label` or `aria-labelledby`)  |
| `Skeleton`                    | `text` (with `lines`), `circle` and `rect` placeholders; `pulse`, `wave` or still; hidden from assistive technology                                                          |
| `EmptyState`                  | Icon, title (heading level via `titleAs`), description and an `action` slot                                                                                                  |

Put `ToastProvider` once near the root, inside `ThemeProvider`, and call `useToast()` below it. The functions it returns never change identity, so they are safe in dependency arrays.

```tsx
function SaveButton() {
  const toast = useToast();
  return (
    <Button
      onClick={async () => {
        const id = toast.show({
          id: 'save',
          title: 'Saving…',
          duration: 0,
          icon: <Spinner size="sm" decorative />,
        });
        await save();
        toast.show({ id, status: 'success', title: 'Saved' }); // same id: replaced in place
      }}
    >
      Save
    </Button>
  );
}
```

Toasts are announced one by one (`danger` as `role="alert"`, the others as `role="status"`), and the "Notifications" region around them exists only while something is showing. A toast's timer stops while the pointer is over it or focus is inside it, and resumes with the time that was left; `duration: 0` (or `Infinity`) keeps it until it is dismissed. Showing a toast with the id of one that is already on screen, or waiting in the queue, replaces it and restarts its timer. `Skeleton` is decorative: mark the region that is loading with `aria-busy="true"`.

**Responsive values.** `Stack` and `Grid` props take either a value or `{ base, sm, md, lg, xl, '2xl' }` (mobile first: each key applies from that width up, matching the theme breakpoints). They compile to CSS custom properties and media queries, so nothing runs in JavaScript and server and client output are identical.

```tsx
<Stack direction={{ base: 'column', md: 'row' }} gap={{ base: 2, md: 6 }}>…</Stack>
<Grid columns={12} gap={4}>
  <GridItem span={{ base: 12, sm: 6, lg: 4 }}>…</GridItem>
</Grid>
```

Popups use `@floating-ui/react` (flip, shift, size) and render into the nearest `.axon-root`, so dark mode and custom theme tokens apply inside them. Focus stays on the combobox and the highlighted option is exposed through `aria-activedescendant`.

## Conventions

- Every component forwards its `ref` and merges `className`/`style`. For form controls (`TextField`, `TextArea`, `NumberInput`) `className` and `style` apply to the outer wrapper, `ref` and all other props go to the native control.
- `size` is `"sm" | "md" | "lg"` and `color` is `"primary" | "secondary" | "success" | "warning" | "danger" | "neutral"`.
- Controlled (`value` + `onChange`) and uncontrolled (`defaultValue`) usage are both supported.
- Colors come from the mode-aware accent tokens in `@axonui/theme` (`--axon-color-<color>-solid`, `-text`, `-subtle`, ...), which meet WCAG AA contrast in light and dark mode.

## Hooks

Exported for your own components:

- `useControllableState({ value, defaultValue, onChange })`: controlled and uncontrolled state.
- `useDisclosure()`: open/closed state with `onOpen`, `onClose`, `onToggle`.
- `useClickOutside(ref, handler)`: react to presses outside an element.
- `useMediaQuery(query)`: SSR-safe media query match.
- `useFocusTrap(ref)`: keep Tab inside a container and restore focus afterwards.
- `useId()`: stable ids for labels and descriptions.
- `useDebounce(value, delay)`: a value that settles after a delay.
