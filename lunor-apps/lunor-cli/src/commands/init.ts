import pc from 'picocolors';
import { existsSync, writeFileSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { getConfigService } from '../lib/config/index.js';
import { getEnvExporter } from '../lib/env/index.js';

export function initZshCommand(): void {
  const script = `# ---- Lunor zsh integration ----
# Add this to ~/.zshrc then run: source ~/.zshrc

lunor() {
  # If requesting help, bypass eval/emit and run directly
  for arg in "$@"; do
    if [[ "$arg" == "-h" || "$arg" == "--help" ]]; then
      command lunor "$@"
      return
    fi
  done

  case "$1" in
    use|set|off|reset)
      eval "$(command lunor __emit "$@")"
      ;;
    *)
      command lunor "$@"
      ;;
  esac
}`;

  console.log(script);
  console.log();
  console.log(pc.dim('# To install:'));
  console.log(pc.dim('# lunor init zsh >> ~/.zshrc'));
  console.log(pc.dim('# source ~/.zshrc'));
}

export async function emitCommand(action: string, ...args: string[]): Promise<void> {
  const configService = getConfigService();
  const exporter = getEnvExporter();

  switch (action) {
    case 'reset': {
      const target = args[0] as any || 'all';
      const { emitResetCommand } = await import('./reset.js');
      await emitResetCommand(target);
      break;
    }

    case 'off': {
      const unsetKeys = [
        'ANTHROPIC_BASE_URL',
        'ANTHROPIC_API_KEY',
        'ANTHROPIC_AUTH_TOKEN',
        'ANTHROPIC_DEFAULT_OPUS_MODEL',
        'ANTHROPIC_DEFAULT_SONNET_MODEL',
        'ANTHROPIC_DEFAULT_HAIKU_MODEL',
        'ANTHROPIC_MODEL',
        'ANTHROPIC_SMALL_FAST_MODEL',
        'CLAUDE_CODE_MAX_OUTPUT_TOKENS',
        'MAX_THINKING_TOKENS',
        'CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS',
        'MAX_MCP_OUTPUT_TOKENS',
        'LUNOR_PROFILE',
      ];
      console.log(exporter.generateUnsetScript(unsetKeys));

      // Also clean up Codex config.toml to revert it back to native ChatGPT/OpenAI
      try {
        const codexDir = join(homedir(), '.codex');
        const configTomlPath = join(codexDir, 'config.toml');

        if (existsSync(configTomlPath)) {
          let tomlContent = readFileSync(configTomlPath, 'utf-8');
          let modified = false;

          // Helper to remove top-level key
          const removeTopLevelKey = (toml: string, key: string): string => {
            const lines = toml.split(/\r?\n/);
            let firstTableIndex = -1;
            for (let i = 0; i < lines.length; i++) {
              const trimmed = lines[i].trim();
              if (trimmed.startsWith('[') && !trimmed.startsWith('#')) {
                firstTableIndex = i;
                break;
              }
            }
            const searchLimit = firstTableIndex !== -1 ? firstTableIndex : lines.length;
            for (let i = 0; i < searchLimit; i++) {
              if (new RegExp(`^\\s*${key}\\s*=`).test(lines[i])) {
                lines.splice(i, 1);
                modified = true;
                break;
              }
            }
            return lines.join('\n');
          };

          if (tomlContent.includes('model_provider')) {
            tomlContent = removeTopLevelKey(tomlContent, 'model_provider');
          }
          if (tomlContent.includes('supports_websockets')) {
            tomlContent = removeTopLevelKey(tomlContent, 'supports_websockets');
          }

          // Revert model to a safe native model or remove it
          if (tomlContent.includes('model = "gpt-5.5"')) {
            const lines = tomlContent.split(/\r?\n/);
            for (let i = 0; i < lines.length; i++) {
              if (/^\s*model\s*=\s*"gpt-5.5"\s*$/.test(lines[i])) {
                lines[i] = 'model = "gpt-4o"';
                modified = true;
                break;
              }
            }
            tomlContent = lines.join('\n');
          }

          // Remove [model_providers.cliproxyapi] block
          const providerHeader = '[model_providers.cliproxyapi]';
          if (tomlContent.includes(providerHeader)) {
            const lines = tomlContent.split(/\r?\n/);
            let startIdx = -1;
            let endIdx = lines.length;
            for (let i = 0; i < lines.length; i++) {
              const trimmed = lines[i].trim();
              if (trimmed === providerHeader) {
                startIdx = i;
              } else if (startIdx !== -1 && trimmed.startsWith('[') && !trimmed.startsWith('#')) {
                endIdx = i;
                break;
              }
            }
            if (startIdx !== -1) {
              lines.splice(startIdx, endIdx - startIdx);
              tomlContent = lines.join('\n');
              modified = true;
            }
          }

          if (modified) {
            tomlContent = tomlContent.replace(/\n{3,}/g, '\n\n');
            writeFileSync(configTomlPath, tomlContent, 'utf-8');
            console.log('# [+] Automatically reverted ~/.codex/config.toml to use native ChatGPT/OpenAI');
          }
        }
      } catch (err: any) {
        console.log(`# [-] Failed to auto-revert ~/.codex/config.toml: ${err.message}`);
      }

      break;
    }

    case 'use':
    case 'set': {
      const presetOrModel = args[0];

      // Check if using MiMo preset/model — use MiMo config instead of Claude
      const isMiMo = presetOrModel && (
        presetOrModel === 'mimo' || presetOrModel.startsWith('mimo-')
      );

      let claudeConfig: any = null;

      if (isMiMo) {
        const mimoConfig = await configService.getMiMoConfig();
        if (!mimoConfig || !mimoConfig.apiKey) {
          console.error('# Error: No MiMo API key configured. Run: lunor keys add-mimo');
          process.exit(1);
        }

        // Export MiMo base config
        const result = exporter.exportForMiMo(mimoConfig);
        console.log(result.shellScript);
      } else {
        claudeConfig = await configService.getClaudeConfig();

        if (presetOrModel === 'agentrouter') {
          claudeConfig = {
            apiKey: 'sk-yGTxAX4fUcGYHrNlJTfgWStxZ0UVllsxDr8UmdBmm1BrKu3L',
            baseUrl: 'https://agentrouter.org/',
          };
        } else if (presetOrModel === 'freemodel' || presetOrModel === 'claude-t0' || presetOrModel === 'claude-t1') {
          const { StateManager } = await import('../core/state-manager.js');
          const { PATHS } = await import('../constants/paths.js');
          const { getNextFreeModelKey, maskKey } = await import('../core/key-rotator.js');

          const stateManager = new StateManager(PATHS.stateFile);
          const state = stateManager.getState();
          const currentKey = state?.freeModelKey;
          const rotatedKey = getNextFreeModelKey(currentKey);

          claudeConfig = {
            apiKey: rotatedKey,
            baseUrl: 'https://api-cc.freemodel.dev',
          };
          console.log(`# [Key Rotation] Active key rotated: ${maskKey(rotatedKey)}`);
        } else if (presetOrModel === 'cliproxy' || presetOrModel === 'cliproxy-claude' || presetOrModel === 'cliproxy-codex') {
          const userConfig = await configService.getClaudeConfig();
          claudeConfig = {
            apiKey: userConfig?.apiKey || 'lunor-proxy-api-key-2025',
            baseUrl: userConfig?.baseUrl || 'https://proxy.lunor.cloud/v1/',
          };

          if (presetOrModel === 'cliproxy-codex') {
            try {
              const codexDir = join(homedir(), '.codex');
              if (!existsSync(codexDir)) {
                mkdirSync(codexDir, { recursive: true });
              }

              const configTomlPath = join(codexDir, 'config.toml');

              // Update config.toml in-place according to CLIProxyAPI doc for OAuth Login Mode (Recommended)
              let tomlContent = '';
              if (existsSync(configTomlPath)) {
                tomlContent = readFileSync(configTomlPath, 'utf-8');
              }

              // Helper function to set/add top-level key before any table [section]
              const setTopLevelKey = (toml: string, key: string, value: string | boolean): string => {
                const lines = toml.split(/\r?\n/);
                let keyUpdated = false;

                let firstTableIndex = -1;
                for (let i = 0; i < lines.length; i++) {
                  const trimmed = lines[i].trim();
                  if (trimmed.startsWith('[') && !trimmed.startsWith('#')) {
                    firstTableIndex = i;
                    break;
                  }
                }

                const searchLimit = firstTableIndex !== -1 ? firstTableIndex : lines.length;
                for (let i = 0; i < searchLimit; i++) {
                  const line = lines[i];
                  if (new RegExp(`^\\s*${key}\\s*=`).test(line)) {
                    lines[i] = `${key} = ${typeof value === 'string' ? `"${value}"` : value}`;
                    keyUpdated = true;
                    break;
                  }
                }

                if (!keyUpdated) {
                  const newLine = `${key} = ${typeof value === 'string' ? `"${value}"` : value}`;
                  if (firstTableIndex !== -1) {
                    lines.splice(firstTableIndex, 0, newLine);
                  } else {
                    lines.push(newLine);
                  }
                }

                return lines.join('\n');
              };

              tomlContent = setTopLevelKey(tomlContent, 'model', 'gpt-5.5');
              tomlContent = setTopLevelKey(tomlContent, 'model_provider', 'cliproxyapi');
              tomlContent = setTopLevelKey(tomlContent, 'model_reasoning_effort', 'xhigh');
              tomlContent = setTopLevelKey(tomlContent, 'plan_mode_reasoning_effort', 'xhigh');
              tomlContent = setTopLevelKey(tomlContent, 'supports_websockets', true);

              let codexBaseUrl = claudeConfig.baseUrl;
              if (codexBaseUrl.includes('proxy.lunor.cloud') && !codexBaseUrl.endsWith('/v1/')) {
                codexBaseUrl = codexBaseUrl.replace(/\/$/, '') + '/v1/';
              }

              const providerHeader = '[model_providers.cliproxyapi]';
              const providerBlock = `[model_providers.cliproxyapi]
base_url = "${codexBaseUrl}"
experimental_bearer_token = "${claudeConfig.apiKey}"
name = "cliproxyapi"
wire_api = "responses"
requires_openai_auth = true
`;

              if (tomlContent.includes(providerHeader)) {
                const lines = tomlContent.split(/\r?\n/);
                let startIdx = -1;
                let endIdx = lines.length;
                for (let i = 0; i < lines.length; i++) {
                  const trimmed = lines[i].trim();
                  if (trimmed === providerHeader) {
                    startIdx = i;
                  } else if (startIdx !== -1 && trimmed.startsWith('[') && !trimmed.startsWith('#')) {
                    endIdx = i;
                    break;
                  }
                }
                if (startIdx !== -1) {
                  lines.splice(startIdx, endIdx - startIdx, providerBlock.trim());
                  tomlContent = lines.join('\n');
                }
              } else {
                tomlContent = tomlContent.trim() + '\n\n' + providerBlock;
              }

              writeFileSync(configTomlPath, tomlContent, 'utf-8');
              console.log('# [+] Automatically configured ~/.codex/config.toml for OAuth Login Mode (Recommended)');
            } catch (err: any) {
              console.log(`# [-] Failed to auto-configure ~/.codex: ${err.message}`);
            }
          }
        }

        if (!claudeConfig || !claudeConfig.apiKey) {
          console.error('# Error: No API key configured. Run: lunor keys add');
          process.exit(1);
        }

        const isAgentRouter = presetOrModel === 'agentrouter' || (claudeConfig && claudeConfig.baseUrl?.includes('agentrouter.org'));
        if (isAgentRouter) {
          console.log(`export ANTHROPIC_AUTH_TOKEN="${claudeConfig.apiKey}"`);
        } else {
          // Unset ANTHROPIC_AUTH_TOKEN first to prevent auth conflict with Claude Code's native login
          console.log('unset ANTHROPIC_AUTH_TOKEN');
        }

        // Export base config
        const result = exporter.exportForClaude(claudeConfig);
        console.log(result.shellScript);

        // Prevent Claude Code from making non-essential requests to Anthropic servers
        console.log('export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC="1"');
      }

      // Export preset/model if provided
      if (presetOrModel) {
        console.log(`export LUNOR_PROFILE="${presetOrModel}"`);
        console.log(`export LUNOR_ENDPOINT="${presetOrModel}"`);

        // Try to load preset and export models
        try {
          const { PresetManager } = await import('../core/preset-manager.js');
          const { StateManager } = await import('../core/state-manager.js');
          const { ANTHROPIC_BASE_URLS } = await import('../constants/base-urls.js');

          const presetManager = new PresetManager();
          const preset = presetManager.getPreset(presetOrModel);
          const endpointOption = ANTHROPIC_BASE_URLS.find((option) => option.id === presetOrModel);

          let endpointId = endpointOption?.id;
          if (!endpointId) {
            if (presetOrModel.startsWith('cliproxy-') || presetOrModel === 'cliproxy') {
              endpointId = 'cliproxy';
            } else if (presetOrModel.startsWith('mimo-') || presetOrModel === 'mimo') {
              endpointId = 'mimo';
            } else if (presetOrModel === 'agentrouter') {
              endpointId = 'agentrouter';
            } else if (presetOrModel === 'freemodel') {
              endpointId = 'freemodel';
            }
          }

          const { PATHS } = await import('../constants/paths.js');
          const stateFile = PATHS.stateFile;
          const stateManager = new StateManager(stateFile);
          const existingState = stateManager.getState();

          if (preset || endpointOption || endpointId) {
            const finalEndpoint = endpointId || existingState?.endpoint || 'claude-t0';
            let finalBaseUrl = endpointOption?.url || claudeConfig?.baseUrl;
            if (!finalBaseUrl && finalEndpoint) {
              const opt = ANTHROPIC_BASE_URLS.find(o => o.id === finalEndpoint);
              if (opt) finalBaseUrl = opt.url;
            }
            if (!finalBaseUrl) {
              finalBaseUrl = existingState?.baseUrl || '';
            }

            const isFreeModel = presetOrModel === 'freemodel' || presetOrModel === 'claude-t0' || presetOrModel === 'claude-t1' || finalEndpoint === 'freemodel' || finalEndpoint === 'claude-t0' || finalEndpoint === 'claude-t1';

            stateManager.setState({
              currentPreset: presetOrModel,
              endpoint: finalEndpoint,
              baseUrl: finalBaseUrl,
              opus: preset?.opus || existingState?.opus || '',
              sonnet: preset?.sonnet || existingState?.sonnet || '',
              haiku: preset?.haiku || existingState?.haiku || '',
              lastUpdated: new Date().toISOString(),
              freeModelKey: isFreeModel ? claudeConfig?.apiKey : existingState?.freeModelKey,
            });

            if (preset) {
              // Export model env vars
              console.log(`export ANTHROPIC_DEFAULT_OPUS_MODEL="${preset.opus}"`);
              console.log(`export ANTHROPIC_DEFAULT_SONNET_MODEL="${preset.sonnet}"`);
              console.log(`export ANTHROPIC_DEFAULT_HAIKU_MODEL="${preset.haiku}"`);
              console.log(`export ANTHROPIC_MODEL="${preset.sonnet}"`); // Default to sonnet
            }
          } else {
            // Treat as direct model name
            console.log(`export ANTHROPIC_MODEL="${presetOrModel}"`);
          }
        } catch (err) {
          // If not a preset, treat as direct model name
          console.log(`export ANTHROPIC_MODEL="${presetOrModel}"`);
        }
      }

      const ampConfig = await configService.getAMPConfig();
      if (ampConfig) {
        const ampResult = exporter.exportForAMP(ampConfig.url, ampConfig.apiKey);
        console.log(ampResult.shellScript);
      }

      break;
    }

    default:
      console.error(`# Unknown action: ${action}`);
      process.exit(1);
  }
}
