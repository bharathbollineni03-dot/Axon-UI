# @axonui/table

## 0.1.0

### Minor Changes

- 3ef10a0: First release of Axon UI.

  - **@axonui/theme**: design tokens as CSS variables, `ThemeProvider`, light, dark and system modes, `createTheme`.
  - **@axonui/core**: about 70 accessible base components: inputs, choice controls, pickers, layout, navigation, overlays and feedback.
  - **@axonui/forms**: a form engine on react-hook-form and zod, field bindings, a wizard, schema-driven forms and nine prebuilt auth and account forms.
  - **@axonui/chat**: streaming chat window, messages with markdown and code, composer, conversation sidebar and settings forms. It calls no AI provider.
  - **@axonui/charts**: line, area, bar, combo, pie, donut, scatter, radar, gauge, sparkline, heatmap and KPI cards as accessible SVG.
  - **@axonui/table**: a static `Table` and a `DataGrid` with sorting, filtering, pagination (client and server), selection, column tools, grouping, detail panels, inline editing, CSV export and virtualization.

  Every package ships ESM, CommonJS, types and a stylesheet, starts with a `"use client"` directive, tree-shakes, and works with React 18 and 19.

### Patch Changes

- Updated dependencies [3ef10a0]
  - @axonui/theme@0.1.0
  - @axonui/core@0.1.0
