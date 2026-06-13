
/**
 * SIMULATION TEST for /lt_today 5
 * 
 * This script simulates the command execution flow and logs
 * the "Telegram" messages to the console for verification.
 */

import { telegramCommandsHandler } from '../src/infrastructure/telegram/telegram-commands.handler';
import { leantimeCredentialsRepository } from '../src/modules/leantime/repositories/leantime-credentials.repository';
import { LeantimeTasksService } from '../src/modules/leantime/services/leantime-tasks.service';
import { LeantimeUsersService } from '../src/modules/leantime/services/leantime-users.service';
import { telegramBot } from '../src/infrastructure/telegram/telegram-bot.service';

// Mock Dependencies
jest.mock('../src/modules/leantime/repositories/leantime-credentials.repository');
jest.mock('../src/modules/leantime/services/leantime-tasks.service');
jest.mock('../src/modules/leantime/services/leantime-users.service');
jest.mock('../src/infrastructure/telegram/telegram-bot.service');

describe('Simulation: /lt_today 5', () => {
  const mockUserId = 'datpx@hilab.asia';
  const mockLeantimeId = 17;
  const todayStr = new Date().toISOString().slice(0, 10);

  beforeAll(() => {
    // 1. Mock Credentials
    (leantimeCredentialsRepository.findAll as jest.Mock).mockReturnValue([{
      user_id: mockUserId,
      leantime_url: 'https://leantime.test',
      access_token: 'mock_token'
    }]);

    // 2. Mock User Service
    (LeantimeUsersService as any).mockImplementation(() => ({
      getUserIdByEmail: jest.fn().mockResolvedValue(mockLeantimeId)
    }));

    // 3. Mock Tasks Service
    (LeantimeTasksService as any).mockImplementation(() => ({
      getAllTasks: jest.fn().mockResolvedValue([
        // Task 1: MATCH (Done today, my task)
        { 
          id: 101, 
          headline: 'Fix bug payment gateway', 
          type: 'bug', 
          status: 0, 
          dateModified: `${todayStr} 10:00:00`, 
          editorId: mockLeantimeId,
          projectName: 'Panda Tech' 
        },
        // Task 2: MATCH (Done today, my task)
        { 
          id: 102, 
          headline: 'Update API Documentation', 
          type: 'task', 
          status: 0, 
          dateModified: `${todayStr} 14:30:00`, 
          editorId: mockLeantimeId,
          projectName: 'Panda Tech' 
        },
        // Task 3: NO MATCH (Not done - status 10)
        { 
          id: 103, 
          headline: 'New Feature Planning', 
          type: 'story', 
          status: 10, 
          dateModified: `${todayStr} 09:00:00`, 
          editorId: mockLeantimeId 
        },
        // Task 4: NO MATCH (Done yesterday)
        { 
          id: 104, 
          headline: 'Old Task', 
          type: 'task', 
          status: 0, 
          dateModified: `2020-01-01 10:00:00`, 
          editorId: mockLeantimeId 
        },
        // Task 5: NO MATCH (Done today but NOT MINE)
        { 
          id: 105, 
          headline: 'Someone else task', 
          type: 'bug', 
          status: 0, 
          dateModified: `${todayStr} 11:00:00`, 
          editorId: 999 
        }
      ])
    }));

    // 4. Mock Telegram Bot to log output
    (telegramBot.sendMessage as jest.Mock).mockImplementation((msg) => {
      console.log('\n🤖 [TELEGRAM BOT SAYS]:\n' + '─'.repeat(30));
      console.log(msg);
      console.log('─'.repeat(30) + '\n');
      return Promise.resolve();
    });
  });

  it('should simulate execution of /lt_today 5', async () => {
    console.log('🚀 STARTING SIMULATION: User types "/lt_today 5"');
    
    // Access private method via 'any' casting for simulation test
    await (telegramCommandsHandler as any).handleLeantimeToday(['5']);
    
    console.log('✅ SIMULATION COMPLETE');
  });
});
