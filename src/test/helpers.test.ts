import * as assert from 'assert';
import { getPreview } from '../helpers';

describe('Helper Functions', () => {
  describe('getPreview', () => {
    it('returns first N lines and truncates by maxChars', () => {
      const content = Array(50).fill('line').join('\n');
      const preview = getPreview(content, 10, 20);
      assert.ok(preview.startsWith('line\nline'));
      assert.ok(preview.endsWith('... (truncated)'));
      assert.ok(preview.length <= 30);
    });

    it('returns full content if under limits', () => {
      const content = 'a\nb\nc';
      const preview = getPreview(content, 10, 100);
      assert.strictEqual(preview, content);
    });

    it('handles empty content', () => {
      const preview = getPreview('');
      assert.strictEqual(preview, '');
    });

    it('handles single line content', () => {
      const preview = getPreview('single line');
      assert.strictEqual(preview, 'single line');
    });

    it('truncates by line limit', () => {
      const content = Array(50).fill('line').join('\n');
      const preview = getPreview(content, 5, 10000);
      const lines = preview.split('\n');
      assert.ok(lines.length <= 5);
    });

    it('truncates by character limit', () => {
      const content = 'a'.repeat(2000);
      const preview = getPreview(content, 100, 1000);
      assert.ok(preview.includes('... (truncated)'));
      assert.ok(preview.length <= 1050); // 1000 chars + truncation message
    });
  });
});

