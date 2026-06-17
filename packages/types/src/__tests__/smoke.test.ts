import { describe, expect, it } from 'vitest';
import { z } from 'zod';

// Placeholder test: proves the Vitest pipeline runs (locally and in CI) before
// any real domain tests exist. Replace/expand as @caeorta/types fills in its
// Zod schemas — boundary validation is the thing worth testing here.
const placeholderSchema = z.object({
  id: z.string().uuid(),
  count: z.number().int().nonnegative(),
});

describe('placeholder zod schema', () => {
  it('parses a valid object', () => {
    const result = placeholderSchema.parse({
      id: '00000000-0000-0000-0000-000000000000',
      count: 3,
    });

    expect(result).toEqual({
      id: '00000000-0000-0000-0000-000000000000',
      count: 3,
    });
  });

  it('rejects an invalid object', () => {
    expect(() => placeholderSchema.parse({ id: 'not-a-uuid', count: -1 })).toThrow();
  });
});
