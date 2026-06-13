import pc from 'picocolors';

export function completionZshCommand(): void {
  const completion = `#compdef lunor

_lunor() {
  local context state line

  _arguments -C \\
    '1: :->command' \\
    '*::arg:->args'

  case $state in
    command)
      _values "lunor command" \\
        'init[Setup shell integration]' \\
        'list[List available models]' \\
        'search[Search for models]' \\
        'use[Activate a preset]' \\
        'set[Set a single model]' \\
        'show[Show current configuration]' \\
        'status[Show interactive dashboard]' \\
        'presets[Manage presets]' \\
        'keys[Manage API keys]' \\
        'config[Manage configuration]' \\
        'stats[View usage statistics]' \\
        'doctor[Run health checks]' \\
        'completion[Generate shell completion]' \\
        'off[Disable Lunor]'
      ;;
    args)
      case $line[1] in
        use)
          _values "preset" \\
            'coding' 'coding-claude' 'coding-codex' \\
            'research' 'reasoning' 'writing' \\
            'gpt' 'claude' 'gemini' 'fast' \\
            'deepseek' 'qwen' 'vision'
          ;;
        presets)
          _values "presets command" \\
            'list[List all presets]' \\
            'search[Search presets]'
          ;;
        keys)
          _values "keys command" \\
            'add[Add API key]' \\
            'list[List keys]' \\
            'test[Test key]' \\
            'remove[Remove key]'
          ;;
        stats)
          _values "stats command" \\
            'summary[Show summary]' \\
            'history[Show history]' \\
            'export[Export data]'
          ;;
        config)
          _values "config command" \\
            'get[Get config value]' \\
            'set[Set config value]' \\
            'backup[Backup config]' \\
            'restore[Restore config]'
          ;;
        skills)
          _values "skills command" \\
            'init[Initialize skill source]' \\
            'list[List skills]' \\
            'update[Update from remote]' \\
            'remove[Remove skill]' \\
            'refresh[Force refresh skill]' \\
            'new[Create custom skill]' \\
            'copy[Copy skills to project]' \\
            'browse[Browse skills with preview]' \\
            'convert[Convert skill source type]'
          ;;
        amp)
          _values "amp command" \\
            'set[Configure AMP]' \\
            'show[Show AMP config]' \\
            'test[Test AMP connection]' \\
            'remove[Remove AMP config]'
          ;;
        rules)
          _values "rules command" \\
            'add[Add rule]' \\
            'list[List rules]' \\
            'show[Show rule details]' \\
            'remove[Remove rule]' \\
            'sync[Sync rules across IDEs]' \\
            'ides[List supported IDEs]'
          ;;
        plugin)
          _values "plugin command" \\
            'list[List marketplace repos & categories]' \\
            'marketplace[Manage marketplace repos]' \\
            'install[Install a plugin category]'
          ;;
      esac
      ;;
  esac
}

_lunor`;

  console.log(completion);
  console.log();
  console.log(pc.dim('# To install:'));
  console.log(pc.dim('# mkdir -p ~/.zsh/completions'));
  console.log(pc.dim('# lunor completion zsh > ~/.zsh/completions/_lunor'));
  console.log(pc.dim('# Add to ~/.zshrc: fpath=(~/.zsh/completions $fpath)'));
  console.log(pc.dim('# autoload -Uz compinit && compinit'));
}
