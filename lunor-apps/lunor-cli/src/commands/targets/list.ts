import pc from 'picocolors';
import { TARGET_ADAPTERS } from '../../lib/agent-skills/index.js';
import { logger } from '../../utils/logger.js';

export async function targetsListCommand(): Promise<void> {
  logger.section('Agent Targets');
  for (const target of Object.values(TARGET_ADAPTERS)) {
    const features = [
      target.supportsSkillFolder && 'skills',
      target.supportsRules && 'rules',
      target.supportsSteering && 'steering',
      target.supportsAgents && 'agents',
    ].filter(Boolean).join(', ');
    console.log(`${pc.cyan(target.id.padEnd(14))} ${target.displayName.padEnd(16)} ${pc.dim(target.outputRoot)} ${pc.dim(features)}`);
  }
}
