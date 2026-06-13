import React from 'react';
import { Box, Text } from 'ink';
import type { AppState } from '../types/index.js';
import { FREE_MODEL_KEYS, maskKey } from '../core/key-rotator.js';
import { getActiveInkPalette } from '../lib/ui/colors.js';

interface DashboardProps {
  state: AppState | null;
  isLoading?: boolean;
}

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return 'unknown';
  }
  return date.toLocaleString();
};

export const Dashboard: React.FC<DashboardProps> = ({ state, isLoading = false }) => {
  const theme = getActiveInkPalette();

  if (isLoading) {
    return (
      <Box borderStyle="round" borderColor={theme.primary} paddingX={2} paddingY={1} flexDirection="column" width={78}>
        <Text color={theme.primary} bold>● L U N O R   K I T</Text>
        <Box marginTop={1}>
          <Text color={theme.warning}>⏳ Preparing secure workspace...</Text>
        </Box>
      </Box>
    );
  }

  if (!state) {
    return (
      <Box borderStyle="round" borderColor={theme.warning} paddingX={2} paddingY={1} flexDirection="column" width={78}>
        <Text color={theme.warning} bold>● L U N O R   K I T</Text>
        <Box marginTop={1} flexDirection="column">
          <Text color={theme.error} bold>[!] No active configuration found.</Text>
          <Box marginTop={1}>
            <Text color={theme.muted}>To activate a preset, please run:</Text>
          </Box>
          <Text color={theme.primary} bold>   lunor use coding</Text>
        </Box>
      </Box>
    );
  }

  const presetName = state.currentPreset ?? 'custom';
  const endpoint = state.endpoint ?? 'claude-t0';
  const isFreeModel = presetName === 'freemodel' || presetName === 'claude-t0' || presetName === 'claude-t1' || endpoint === 'freemodel' || endpoint === 'claude-t0' || endpoint === 'claude-t1';
  
  // Find which key is currently active
  const activeKey = state.freeModelKey || FREE_MODEL_KEYS[0];

  return (
    <Box borderStyle="round" borderColor={theme.borderActive} paddingX={2} paddingY={1} flexDirection="column" width={78}>
      {/* Header Banner */}
      <Box justifyContent="space-between" marginBottom={1}>
        <Box>
          <Text color={theme.secondary} bold>● L U N O R   K I T</Text>
          <Text color={theme.muted}>  │  Command Center</Text>
        </Box>
        <Box borderStyle="single" borderColor={theme.success} paddingX={1}>
          <Text color={theme.success} bold>✔ ACTIVE</Text>
        </Box>
      </Box>

      {/* System Status Panel */}
      <Box flexDirection="column" borderStyle="single" borderColor={theme.borderInactive} paddingX={1} marginY={1}>
        <Box justifyContent="space-between">
          <Text bold color={theme.primary}>⚙ SYSTEM PROFILE</Text>
          <Text color={theme.muted}>{formatTimestamp(state.lastUpdated)}</Text>
        </Box>
        
        <Box marginTop={1} flexDirection="column">
          <Box>
            <Box width={16}><Text color={theme.muted}>Profile preset :</Text></Box>
            <Text bold color={theme.secondary}>{presetName}</Text>
          </Box>
          <Box>
            <Box width={16}><Text color={theme.muted}>Endpoint ID    :</Text></Box>
            <Text color={theme.text}>{endpoint}</Text>
          </Box>
          <Box>
            <Box width={16}><Text color={theme.muted}>Base Service   :</Text></Box>
            <Text color={theme.primary}>{state.baseUrl || 'Default Base URL'}</Text>
          </Box>
        </Box>
      </Box>

      {/* Active Model Slots */}
      <Box flexDirection="column" borderStyle="single" borderColor={theme.borderInactive} paddingX={1} marginBottom={1}>
        <Text bold color={theme.primary}>🧠 ACTIVE MODEL SLOTS</Text>
        
        <Box marginTop={1} flexDirection="column">
          {/* OPUS SLOT */}
          <Box justifyContent="space-between" marginBottom={1}>
            <Box>
              <Text bold color={theme.warning}>  P0 [OPUS]   │ </Text>
              <Text color={theme.text}>{state.opus || 'Not Selected'}</Text>
            </Box>
            <Box borderStyle="single" borderColor={theme.warning} paddingX={1}>
              <Text color={theme.warning} bold>Reasoning</Text>
            </Box>
          </Box>

          {/* SONNET SLOT */}
          <Box justifyContent="space-between" marginBottom={1}>
            <Box>
              <Text bold color={theme.primary}>  P1 [SONNET] │ </Text>
              <Text color={theme.text}>{state.sonnet || 'Not Selected'}</Text>
            </Box>
            <Box borderStyle="single" borderColor={theme.primary} paddingX={1}>
              <Text color={theme.primary} bold>Balanced</Text>
            </Box>
          </Box>

          {/* HAIKU SLOT */}
          <Box justifyContent="space-between">
            <Box>
              <Text bold color={theme.success}>  P2 [HAIKU]  │ </Text>
              <Text color={theme.text}>{state.haiku || 'Not Selected'}</Text>
            </Box>
            <Box borderStyle="single" borderColor={theme.success} paddingX={1}>
              <Text color={theme.success} bold>Speed/Fast</Text>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Key Rotation Pool Section (Visible only when using free model endpoints) */}
      {isFreeModel && (
        <Box flexDirection="column" borderStyle="single" borderColor={theme.primary} paddingX={1} marginBottom={1}>
          <Box justifyContent="space-between">
            <Text bold color={theme.primary}>🔑 FREE MODEL KEY ROTATION</Text>
            <Text color={theme.success} bold>● ENABLED</Text>
          </Box>
          
          <Box marginTop={1} flexDirection="column">
            {FREE_MODEL_KEYS.map((key, index) => {
              const isActive = key === activeKey;
              return (
                <Box key={key} marginY={0} alignItems="center">
                  <Box width={4}>
                    <Text color={isActive ? theme.success : theme.muted}>{isActive ? " ► " : "   "}</Text>
                  </Box>
                  <Box width={12}>
                    <Text bold color={isActive ? theme.success : theme.muted}>{`Key Slot ${index + 1}:`}</Text>
                  </Box>
                  <Text color={isActive ? theme.text : theme.muted}>{maskKey(key)}</Text>
                  <Text> </Text>
                  {isActive && (
                    <Box borderStyle="single" borderColor={theme.success} paddingX={1}>
                      <Text color={theme.success} bold>ACTIVE KEY</Text>
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
          <Box marginTop={1}>
            <Text color={theme.muted}>💡 Tip: Run </Text>
            <Text color={theme.primary}>"lunor use freemodel"</Text>
            <Text color={theme.muted}> to cycle to the next key in the pool.</Text>
          </Box>
        </Box>
      )}

      {/* Helpful Action Bar */}
      <Box justifyContent="center" marginTop={1}>
        <Text color={theme.muted}>💡 Pro Tip: </Text>
        <Text color={theme.primary} bold>lunor use [preset]</Text>
        <Text color={theme.muted}> to switch presets  •  </Text>
        <Text color={theme.primary} bold>lunor status</Text>
        <Text color={theme.muted}> for TUI</Text>
      </Box>
    </Box>
  );
};

