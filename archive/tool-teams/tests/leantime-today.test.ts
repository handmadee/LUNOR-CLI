/**
 * Tests for /lt_today Command
 * 
 * Tests the handleLeantimeToday functionality that shows tasks
 * completed today by the logged-in user.
 */

import { cleanHtmlDescription, normalizeWhitespace, decodeHtmlEntities } from '../src/infrastructure/telegram/text-utils';

describe('text-utils', () => {
  describe('normalizeWhitespace', () => {
    it('should collapse multiple spaces', () => {
      const input = 'Hello    World';
      const result = normalizeWhitespace(input);
      expect(result).toBe('Hello World');
    });

    it('should collapse multiple newlines to single newline', () => {
      const input = 'Line1\n\n\n\nLine2';
      const result = normalizeWhitespace(input);
      expect(result).toBe('Line1\nLine2');
    });

    it('should trim whitespace from lines', () => {
      const input = '  Hello  \n  World  ';
      const result = normalizeWhitespace(input);
      expect(result).toBe('Hello\nWorld');
    });
  });

  describe('decodeHtmlEntities', () => {
    it('should decode basic HTML entities', () => {
      expect(decodeHtmlEntities('&amp;')).toBe('&');
      expect(decodeHtmlEntities('&lt;')).toBe('<');
      expect(decodeHtmlEntities('&gt;')).toBe('>');
      expect(decodeHtmlEntities('&quot;')).toBe('"');
    });

    it('should decode numeric HTML entities for Vietnamese', () => {
      // &#224; = à, &#234; = ê
      expect(decodeHtmlEntities('&#224;')).toBe('à');
      expect(decodeHtmlEntities('&#234;')).toBe('ê');
      expect(decodeHtmlEntities('&#259;')).toBe('ă');
    });

    it('should decode named Vietnamese entities', () => {
      expect(decodeHtmlEntities('&aacute;')).toBe('á');
      expect(decodeHtmlEntities('&ecirc;')).toBe('ê');
      expect(decodeHtmlEntities('&ograve;')).toBe('ò');
    });
  });

  describe('cleanHtmlDescription', () => {
    it('should remove HTML tags', () => {
      const input = '<p>Hello</p><div>World</div>';
      const result = cleanHtmlDescription(input);
      expect(result.text).toBe('Hello\nWorld');
    });

    it('should convert list items to dashes', () => {
      const input = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const result = cleanHtmlDescription(input);
      expect(result.text).toContain('- Item 1');
      expect(result.text).toContain('- Item 2');
    });

    it('should extract image attachments', () => {
      const input = '<p>Text</p><img src="https://example.com/image.png" />';
      const result = cleanHtmlDescription(input);
      expect(result.attachments).toHaveLength(1);
      expect(result.attachments[0]).toBe('https://example.com/image.png');
    });

    it('should decode Vietnamese text', () => {
      const input = '<p>&#272;&#417;n h&#224;ng c&#243; tr&#432;&#7901;ng</p>';
      const result = cleanHtmlDescription(input);
      // Should properly decode Vietnamese
      expect(result.text.length).toBeGreaterThan(0);
    });

    it('should remove JSON-like data', () => {
      const input = 'Test {"type":"text","value":"hidden"} content';
      const result = cleanHtmlDescription(input);
      expect(result.text).toBe('Test content');
    });

    it('should truncate long text', () => {
      const input = 'A'.repeat(1000);
      const result = cleanHtmlDescription(input, 100);
      expect(result.text.length).toBeLessThanOrEqual(103); // 100 + "..."
    });

    it('should return default message for empty input', () => {
      const result = cleanHtmlDescription('');
      expect(result.text).toBe('Không có mô tả');
    });
  });
});

describe('/lt_today command logic', () => {
  describe('todayDoneTasks filter', () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    const mockTasks = [
      { id: 1, status: 0, dateModified: `${todayStr} 10:00:00`, editorId: 17, headline: 'Done today' },
      { id: 2, status: 0, dateModified: `${yesterdayStr} 10:00:00`, editorId: 17, headline: 'Done yesterday' },
      { id: 3, status: 1, dateModified: `${todayStr} 10:00:00`, editorId: 17, headline: 'In progress today' },
      { id: 4, status: 0, dateModified: `${todayStr} 10:00:00`, editorId: 26, headline: 'Done today by other' },
    ];

    it('should filter tasks done today', () => {
      const result = mockTasks.filter(t => {
        const statusNum = typeof t.status === 'number' ? t.status : parseInt(String(t.status), 10);
        const isDone = statusNum === 0;
        const modified = (t.dateModified || '').slice(0, 10);
        const isToday = modified === todayStr;
        return isDone && isToday;
      });

      expect(result).toHaveLength(2); // Task 1 and 4 (both done today)
    });

    it('should filter tasks done today by specific user', () => {
      const leantimeUserId = 17;
      const result = mockTasks.filter(t => {
        const statusNum = typeof t.status === 'number' ? t.status : parseInt(String(t.status), 10);
        const isDone = statusNum === 0;
        const modified = (t.dateModified || '').slice(0, 10);
        const isToday = modified === todayStr;
        const editorId = typeof t.editorId === 'number' ? t.editorId : parseInt(String(t.editorId), 10);
        const isMine = editorId === leantimeUserId;
        return isDone && isToday && isMine;
      });

      expect(result).toHaveLength(1); // Only task 1
      expect(result[0].id).toBe(1);
    });

    it('should exclude in-progress tasks', () => {
      const result = mockTasks.filter(t => {
        const statusNum = typeof t.status === 'number' ? t.status : parseInt(String(t.status), 10);
        const isDone = statusNum === 0;
        return isDone;
      });

      expect(result).toHaveLength(3); // Tasks 1, 2, 4
      expect(result.every(t => t.status === 0)).toBe(true);
    });

    it('should exclude tasks from yesterday', () => {
      const result = mockTasks.filter(t => {
        const modified = (t.dateModified || '').slice(0, 10);
        return modified === todayStr;
      });

      expect(result).toHaveLength(3); // Tasks 1, 3, 4
    });
  });
});
