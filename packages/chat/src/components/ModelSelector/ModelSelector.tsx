import { forwardRef } from 'react';
import {
  Button,
  DropdownMenu,
  MenuRadioGroup,
  MenuRadioItem,
  useControllableState,
} from '@axon/core';
import { ChevronDownIcon } from '../../internal/icons';

export interface ChatModel {
  id: string;
  name: string;
  /** A line under the name: what the model is good at. */
  description?: string;
  /** A short tag next to the name, such as "New", "Fast" or "Beta". */
  badge?: string;
  disabled?: boolean;
  /** Models with the same group are listed under that heading. */
  group?: string;
}

export interface ModelSelectorLabels {
  /** Names the control, and is read before the chosen model. */
  model: string;
  placeholder: string;
}

export const defaultModelSelectorLabels: ModelSelectorLabels = {
  model: 'Model',
  placeholder: 'Select a model',
};

export interface ModelSelectorProps {
  models: readonly ChatModel[];
  /** The chosen model's `id`. */
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  labels?: Partial<ModelSelectorLabels>;
}

function groupModels(models: readonly ChatModel[]) {
  const groups: { name: string | undefined; models: ChatModel[] }[] = [];
  for (const model of models) {
    const existing = groups.find((group) => group.name === model.group);
    if (existing) existing.models.push(model);
    else groups.push({ name: model.group, models: [model] });
  }
  return groups;
}

/**
 * A button showing the chosen model that opens a menu of models, each with its name, an optional
 * badge and a description. It is a menu of radio items, so arrows, Home/End and typing move
 * between models and Esc closes it.
 */
export const ModelSelector = forwardRef<HTMLButtonElement, ModelSelectorProps>(
  function ModelSelector(
    {
      models,
      value: valueProp,
      defaultValue,
      onChange,
      size = 'sm',
      disabled,
      className,
      labels: labelsProp,
    },
    ref,
  ) {
    const labels = { ...defaultModelSelectorLabels, ...labelsProp };
    const [value, setValue] = useControllableState<string | undefined>({
      value: valueProp,
      defaultValue,
      onChange: (next) => {
        if (next !== undefined) onChange?.(next);
      },
    });
    const selected = models.find((model) => model.id === value);
    const groups = groupModels(models);

    return (
      <DropdownMenu
        aria-label={labels.model}
        placement="bottom-end"
        className="axon-model-selector__menu"
        trigger={
          <Button
            ref={ref}
            variant="ghost"
            size={size}
            className={['axon-model-selector', className].filter(Boolean).join(' ')}
            endIcon={<ChevronDownIcon />}
            disabled={disabled || models.length === 0}
          >
            <span className="axon-visually-hidden">{labels.model}: </span>
            <span className="axon-model-selector__name">
              {selected ? selected.name : labels.placeholder}
            </span>
            {selected?.badge ? (
              <>
                {' '}
                <span className="axon-model-selector__badge">{selected.badge}</span>
              </>
            ) : null}
          </Button>
        }
      >
        {groups.map((group) => (
          <MenuRadioGroup
            key={group.name ?? ''}
            label={group.name}
            aria-label={group.name ? undefined : labels.model}
            value={value}
            onValueChange={setValue}
          >
            {group.models.map((model) => (
              <MenuRadioItem
                key={model.id}
                value={model.id}
                disabled={model.disabled}
                closeOnSelect
              >
                <span className="axon-model-option">
                  <span className="axon-model-option__name">
                    {model.name}
                    {model.badge ? (
                      <>
                        {' '}
                        <span className="axon-model-selector__badge">{model.badge}</span>
                      </>
                    ) : null}
                  </span>
                  {model.description ? (
                    <>
                      {' '}
                      <span className="axon-model-option__description">{model.description}</span>
                    </>
                  ) : null}
                </span>
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        ))}
      </DropdownMenu>
    );
  },
);
