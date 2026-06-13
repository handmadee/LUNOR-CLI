import type { LoadedAgentSkill } from './types.js';

export class SkillComposer {
  constructor(private readonly skills: LoadedAgentSkill[]) {}

  compose(skillId: string): LoadedAgentSkill[] {
    const byId = new Map(this.skills.map(skill => [skill.manifest.id, skill]));
    if (!byId.has(skillId)) throw new Error(`Unknown skill: ${skillId}`);
    const ordered: LoadedAgentSkill[] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (id: string): void => {
      if (visited.has(id)) return;
      if (visiting.has(id)) throw new Error(`Circular skill dependency detected at ${id}`);
      const skill = byId.get(id);
      if (!skill) throw new Error(`Missing dependency: ${id}`);
      visiting.add(id);
      for (const dependency of skill.manifest.dependsOn) visit(dependency);
      visiting.delete(id);
      visited.add(id);
      ordered.push(skill);
    };

    visit(skillId);
    return ordered;
  }
}
