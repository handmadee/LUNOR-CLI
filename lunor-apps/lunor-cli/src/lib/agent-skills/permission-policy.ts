import type { AgentSkillManifest, SkillPermissions } from './types.js';

const DANGEROUS_SHELL_TOKENS = ['rm', 'reset', 'chmod', 'curl', 'wget', 'sudo'];

export class PermissionPolicy {
  validate(manifest: AgentSkillManifest): string[] {
    const warnings: string[] = [];
    const permissions = manifest.permissions;
    for (const scope of Object.keys(permissions) as Array<keyof SkillPermissions>) {
      if (!Array.isArray(permissions[scope])) warnings.push(`${scope} permissions must be an array`);
    }
    for (const token of permissions.shell) {
      if (DANGEROUS_SHELL_TOKENS.includes(token)) warnings.push(`Shell permission "${token}" requires explicit review`);
    }
    if ((permissions.network.length > 0 || permissions.shell.length > 0) && !manifest.trust.reviewRequired) {
      warnings.push('Network or shell permissions should set trust.reviewRequired=true');
    }
    return warnings;
  }
}
