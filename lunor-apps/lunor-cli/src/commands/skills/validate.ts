import pc from 'picocolors';
import { SkillLoader, SkillRegistryWriter, SkillValidator } from '../../lib/agent-skills/index.js';
import { logger } from '../../utils/logger.js';

export async function skillsValidateCommand(): Promise<void> {
  logger.section('Validate Canonical Agent Skills');
  const loader = new SkillLoader();
  const skills = await loader.loadAll();
  const result = await new SkillValidator().validateAll(skills);
  const registry = new SkillRegistryWriter();
  await registry.writeCatalog(skills);
  await registry.writeTargetsCatalog();
  logger.info(`Loaded ${pc.cyan(String(skills.length))} canonical skills from .agents/skills`);
  if (result.issues.length === 0) {
    logger.success('All canonical skills are valid');
    return;
  }
  for (const issue of result.issues) {
    const label = issue.severity === 'error' ? pc.red('error') : pc.yellow('warning');
    const location = [issue.skillId, issue.file].filter(Boolean).join(' ');
    console.log(`${label} ${pc.dim(location)} ${issue.message}`);
  }
  if (!result.valid) throw new Error('Canonical skill validation failed');
}
