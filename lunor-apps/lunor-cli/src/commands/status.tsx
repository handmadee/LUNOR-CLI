import React from 'react';
import { render } from 'ink';
import { StateManager } from '../core/state-manager.js';
import { Dashboard } from '../ui/dashboard.js';
import { PATHS } from '../constants/paths.js';

export async function statusCommand(): Promise<void> {
  const stateManager = new StateManager(PATHS.stateFile);
  const state = stateManager.getState();

  render(<Dashboard state={state} />);
}
