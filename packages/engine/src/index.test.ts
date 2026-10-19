import { describe, expect, it } from 'vitest';
import { ENGINE_NAME } from './index';

describe('engine', () => {
  it('exports its name', () => {
    expect(ENGINE_NAME).toBe('chess9s-engine');
  });
});
