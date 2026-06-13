import type { ISourceStrategy, SourceType, AnySourceConfig } from '../types.js';
import { LocalSourceStrategy } from './local-strategy.js';
import { GitHubSourceStrategy } from './github-strategy.js';

export { BaseSourceStrategy } from './base-strategy.js';
export { LocalSourceStrategy } from './local-strategy.js';
export { GitHubSourceStrategy } from './github-strategy.js';

const strategyRegistry = new Map<SourceType, ISourceStrategy>();

export function registerStrategy(strategy: ISourceStrategy): void {
  strategyRegistry.set(strategy.type, strategy);
}

export function getStrategy(type: SourceType): ISourceStrategy {
  const strategy = strategyRegistry.get(type);
  if (!strategy) {
    throw new Error(`No strategy registered for source type: ${type}`);
  }
  return strategy;
}

export function getStrategyForConfig(config: AnySourceConfig): ISourceStrategy {
  return getStrategy(config.type);
}

export function initializeStrategies(): void {
  registerStrategy(new LocalSourceStrategy());
  registerStrategy(new GitHubSourceStrategy());
}

initializeStrategies();
