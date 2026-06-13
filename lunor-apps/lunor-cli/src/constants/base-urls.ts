export interface AnthropicBaseUrlOption {
  readonly id: string;
  readonly label: string;
  readonly tier?: string;
  readonly url: string;
  readonly online?: number;
  readonly nativeMessagesApi?: boolean;
}

export interface OpenAIBaseUrlOption {
  readonly id: string;
  readonly label: string;
  readonly tier?: string;
  readonly url: string;
  readonly online?: number;
}

export const ANTHROPIC_BASE_URLS: readonly AnthropicBaseUrlOption[] = [
  {
    id: 'claude-t0',
    label: 'claude-t0',
    url: 'https://cc.freemodel.dev',
    online: 131,
    nativeMessagesApi: true,
  },
  {
    id: 'claude-t1',
    label: 'claude-t1',
    tier: 'T1+',
    url: 'https://api-cc.freemodel.dev',
    online: 76,
    nativeMessagesApi: true,
  },
  {
    id: 'freemodel',
    label: 'FreeModel AI CC',
    url: 'https://api-cc.freemodel.dev',
    nativeMessagesApi: true,
  },
  {
    id: 'agentrouter',
    label: 'AgentRouter Official',
    url: 'https://agentrouter.org/',
    nativeMessagesApi: true,
  },
  {
    id: 'cliproxy',
    label: 'CLIPPROXY Cloud',
    url: 'https://proxy.lunor.cloud/v1/',
    nativeMessagesApi: true,
  },
] as const;

export const OPENAI_BASE_URLS: readonly OpenAIBaseUrlOption[] = [
  {
    id: 'default',
    label: '默认线路',
    url: 'https://api.freemodel.dev',
    online: 879,
  },
  {
    id: 'openai-t1-sg',
    label: 'openai-t1-sg',
    tier: 'T1+',
    url: 'https://vip-sg.freemodel.dev',
    online: 129,
  },
  {
    id: 'openai-t1-bj',
    label: 'openai-t1-bj',
    tier: 'T1+',
    url: 'https://bscclheilkfs.sealosbja.site',
    online: 75,
  },
  {
    id: 'openai-t1-hz',
    label: 'openai-t1-hz',
    tier: 'T1+',
    url: 'https://kqsgaywafmtx.sealoshzh.site',
    online: 70,
  },
  {
    id: 'openai-t1-gz',
    label: 'openai-t1-gz',
    tier: 'T1+',
    url: 'https://yxfwjmvmghoq.sealosgzg.site',
    online: 82,
  },
] as const;

export const DEFAULT_ANTHROPIC_BASE_URL = ANTHROPIC_BASE_URLS[0].url;
export const DEFAULT_OPENAI_BASE_URL = OPENAI_BASE_URLS[0].url;

export function formatAnthropicBaseUrlOptions(): string {
  return ANTHROPIC_BASE_URLS.map((option) => {
    const tier = option.tier ? ` ${option.tier}` : '';
    const online = typeof option.online === 'number' ? ` · online ${option.online}` : '';
    const native = option.nativeMessagesApi ? ' · /v1/messages' : '';
    return `${option.label}${tier}: ${option.url}${online}${native}`;
  }).join('\n');
}

export function formatOpenAIBaseUrlOptions(): string {
  return OPENAI_BASE_URLS.map((option) => {
    const tier = option.tier ? ` ${option.tier}` : '';
    const online = typeof option.online === 'number' ? ` · online ${option.online}` : '';
    return `${option.label}${tier}: ${option.url}${online}`;
  }).join('\n');
}
