import pc from 'picocolors';
import { SkillAuditor, SkillLoader } from '../../lib/agent-skills/index.js';
import { logger } from '../../utils/logger.js';

export async function skillsAuditCommand(skillId: string): Promise<void> {
  logger.section('Audit Canonical Agent Skill');
  const skill = await new SkillLoader().loadById(skillId);
  if (!skill) throw new Error(`Unknown canonical skill: ${skillId}`);
  const findings = await new SkillAuditor().audit(skill);
  logger.info(`${skill.manifest.name} (${skill.manifest.id})`);
  if (findings.length === 0) {
    logger.success('No audit findings');
    return;
  }
  for (const finding of findings) {
    const label = finding.severity === 'high' ? pc.red('high') : finding.severity === 'medium' ? pc.yellow('medium') : pc.cyan('low');
    console.log(`${label} ${pc.dim(finding.file ?? '')} ${finding.message}`);
  }
}
