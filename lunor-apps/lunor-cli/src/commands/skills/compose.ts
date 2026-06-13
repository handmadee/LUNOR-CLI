import pc from 'picocolors';
import { AGENT_TARGETS, SkillComposer, SkillLoader, SkillRenderer, type AgentTarget } from '../../lib/agent-skills/index.js';
import { logger } from '../../utils/logger.js';

export async function skillsComposeCommand(skillId: string, options: { target?: AgentTarget } = {}): Promise<void> {
  logger.section('Compose Canonical Agent Skill Kit');
  const skills = await new SkillLoader().loadAll();
  const composed = new SkillComposer(skills).compose(skillId);
  logger.info(`Composition for ${pc.cyan(skillId)}:`);
  for (const skill of composed) {
    console.log(`  ${pc.cyan(skill.manifest.id.padEnd(28))} ${pc.dim(skill.manifest.category)}`);
  }
  if (options.target) {
    if (!AGENT_TARGETS.includes(options.target)) {
      throw new Error(`Unsupported target: ${options.target}. Supported: ${AGENT_TARGETS.join(', ')}`);
    }
    const result = await new SkillRenderer().render(options.target, composed);
    logger.success(`Rendered ${result.filesWritten.length} files for ${options.target}`);
    for (const file of result.filesWritten.slice(0, 8)) console.log(pc.dim(`  -> ${file}`));
    if (result.filesWritten.length > 8) console.log(pc.dim(`  ... and ${result.filesWritten.length - 8} more`));
  }
}
