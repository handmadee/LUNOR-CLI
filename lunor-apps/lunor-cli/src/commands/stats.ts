import { writeFileSync } from 'node:fs';
import pc from 'picocolors';
import { AnalyticsService } from '../services/analytics-service.js';
import { logger } from '../utils/logger.js';
import { prompts } from '../utils/prompts.js';
import { ui } from '../utils/ui.js';
import { PATHS } from '../constants/paths.js';

export async function statsSummaryCommand(): Promise<void> {
  const analytics = new AnalyticsService(PATHS.analyticsDb);

  const total = analytics.getTotalUsage();
  const byProvider = analytics.getUsageByProvider();
  const topModels = analytics.getUsageByModel(5);

  prompts.intro('Usage Statistics');

  console.log(`${pc.bold('Total Switches:')} ${total}`);
  
  if (Object.keys(byProvider).length > 0) {
    ui.section('By Provider');
    for (const [provider, count] of Object.entries(byProvider)) {
      console.log(`  ${provider.padEnd(12)} ${pc.cyan(String(count))}`);
    }
  }

  if (topModels.length > 0) {
    ui.section('Top Models');
    console.log(`  ${pc.dim('Model'.padEnd(40))} ${pc.dim('Usage')}`);
    console.log(pc.dim('  ' + '─'.repeat(50)));
    
    for (const { model, count } of topModels) {
      console.log(`  ${model.padEnd(40)} ${pc.cyan(String(count))}`);
    }
  }

  console.log();
  analytics.close();
}

export async function statsHistoryCommand(days: number = 7): Promise<void> {
  const analytics = new AnalyticsService(PATHS.analyticsDb);

  const records = analytics.getUsageStats(days);

  if (records.length === 0) {
    logger.warning(`No usage data found for the last ${days} days`);
    analytics.close();
    return;
  }

  prompts.intro(`Usage History (Last ${days} days)`);

  console.log(
    `  ${pc.dim('Date'.padEnd(24))}` +
    `${pc.dim('Action'.padEnd(10))}` +
    `${pc.dim('Model'.padEnd(30))}` +
    `${pc.dim('Provider')}`
  );
  console.log(pc.dim('  ' + '─'.repeat(80)));

  for (const record of records.slice(0, 20)) {
    const date = new Date(record.timestamp).toLocaleString();
    console.log(
      `  ${date.padEnd(24)}` +
      `${record.action.padEnd(10)}` +
      `${record.model.padEnd(30)}` +
      `${record.provider}`
    );
  }

  if (records.length > 20) {
    console.log();
    console.log(pc.dim(`  ... and ${records.length - 20} more records`));
  }

  console.log();
  analytics.close();
}

export async function statsExportCommand(outputFile?: string): Promise<void> {
  const analytics = new AnalyticsService(PATHS.analyticsDb);

  const records = analytics.exportData();
  const output = outputFile || PATHS.usageExport;

  writeFileSync(output, JSON.stringify(records, null, 2));

  logger.success(`Exported ${records.length} records to: ${pc.cyan(output)}`);
  analytics.close();
}
