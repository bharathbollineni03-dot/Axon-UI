---
'@axon/theme': minor
'@axon/core': minor
'@axon/forms': minor
'@axon/chat': minor
'@axon/charts': minor
'@axon/table': minor
---

First release of Axon UI.

- **@axon/theme**: design tokens as CSS variables, `ThemeProvider`, light, dark and system modes, `createTheme`.
- **@axon/core**: about 70 accessible base components: inputs, choice controls, pickers, layout, navigation, overlays and feedback.
- **@axon/forms**: a form engine on react-hook-form and zod, field bindings, a wizard, schema-driven forms and nine prebuilt auth and account forms.
- **@axon/chat**: streaming chat window, messages with markdown and code, composer, conversation sidebar and settings forms. It calls no AI provider.
- **@axon/charts**: line, area, bar, combo, pie, donut, scatter, radar, gauge, sparkline, heatmap and KPI cards as accessible SVG.
- **@axon/table**: a static `Table` and a `DataGrid` with sorting, filtering, pagination (client and server), selection, column tools, grouping, detail panels, inline editing, CSV export and virtualization.

Every package ships ESM, CommonJS, types and a stylesheet, starts with a `"use client"` directive, tree-shakes, and works with React 18 and 19.
