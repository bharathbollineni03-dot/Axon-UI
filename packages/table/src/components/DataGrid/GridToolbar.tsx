import type { ReactNode } from 'react';
import {
  Button,
  DropdownMenu,
  IconButton,
  MenuRadioGroup,
  MenuRadioItem,
  TextField,
} from '@axon/core';
import type { DataGridLabels } from '../../labels';
import { DensityIcon, FilterIcon, SearchIcon } from '../../internal/icons';
import { DENSITIES } from '../../internal/layout';
import { useDebouncedCommit } from '../../internal/useDebouncedCommit';
import type { DataGridDensity } from '../../types';

export interface ResolvedToolbar {
  search: boolean;
  filters: boolean;
  density: boolean;
  columns: boolean;
  export: boolean;
}

export interface GridToolbarProps {
  tools: ResolvedToolbar;
  labels: DataGridLabels;
  start?: ReactNode;
  end?: ReactNode;

  searchText: string;
  onSearchChange: (text: string) => void;
  debounce: number;

  filtersOpen: boolean;
  onToggleFilters: () => void;
  activeFilterCount: number;
  /** Whether anything (a filter or the search) can be cleared. */
  canClear: boolean;
  onClear: () => void;

  density: DataGridDensity;
  onDensityChange: (density: DataGridDensity) => void;
  /** More tools, in order, between the density menu and `end`. */
  extraTools?: ReactNode;
}

/** The strip of tools above the grid: search, filters, density, columns, export. */
export function GridToolbar({
  tools,
  labels,
  start,
  end,
  searchText,
  onSearchChange,
  debounce,
  filtersOpen,
  onToggleFilters,
  activeFilterCount,
  canClear,
  onClear,
  density,
  onDensityChange,
  extraTools,
}: GridToolbarProps) {
  const [text, setText] = useDebouncedCommit(
    searchText,
    onSearchChange,
    debounce,
    (a, b) => a === b,
  );

  return (
    <div role="group" aria-label={labels.toolbar} className="axon-datagrid__toolbar">
      <div className="axon-datagrid__toolbar-start">
        {start}
        {tools.search ? (
          <div className="axon-datagrid__search">
            <TextField
              type="search"
              size="sm"
              fullWidth
              aria-label={labels.search}
              placeholder={labels.searchPlaceholder}
              startAdornment={<SearchIcon />}
              value={text}
              onChange={(event) => setText(event.target.value)}
              clearable
              clearLabel={labels.clearSearch}
              onClear={() => setText('')}
            />
          </div>
        ) : null}
      </div>
      <div className="axon-datagrid__toolbar-end">
        {tools.filters ? (
          <Button
            size="sm"
            variant="outline"
            color="neutral"
            className={filtersOpen ? 'axon-datagrid__tool--on' : undefined}
            aria-pressed={filtersOpen}
            startIcon={<FilterIcon />}
            onClick={onToggleFilters}
          >
            {activeFilterCount > 0 ? labels.filtersActive(activeFilterCount) : labels.filters}
          </Button>
        ) : null}
        {canClear ? (
          <Button size="sm" variant="ghost" color="neutral" onClick={onClear}>
            {labels.clearFilters}
          </Button>
        ) : null}
        {tools.density ? (
          <DropdownMenu
            trigger={
              <IconButton aria-label={labels.density} size="sm">
                <DensityIcon />
              </IconButton>
            }
          >
            <MenuRadioGroup
              label={labels.density}
              value={density}
              onValueChange={(value) => onDensityChange(value as DataGridDensity)}
            >
              {DENSITIES.map((option) => (
                <MenuRadioItem key={option} value={option}>
                  {labels.densities[option]}
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
          </DropdownMenu>
        ) : null}
        {extraTools}
        {end}
      </div>
    </div>
  );
}
