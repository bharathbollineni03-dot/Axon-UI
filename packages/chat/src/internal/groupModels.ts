import type { ChatModel } from '../components/ModelSelector/ModelSelector';

/** Models with the same `group` together, in the order the groups first appear. */
export function groupModels(models: readonly ChatModel[]) {
  const groups: { name: string | undefined; models: ChatModel[] }[] = [];
  for (const model of models) {
    const existing = groups.find((group) => group.name === model.group);
    if (existing) existing.models.push(model);
    else groups.push({ name: model.group, models: [model] });
  }
  return groups;
}
