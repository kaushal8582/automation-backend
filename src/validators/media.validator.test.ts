import { describe, expect, it } from 'vitest';
import {
  bulkDeleteMediaSchema,
  presignMediaBatchSchema,
  presignMediaSchema,
} from '../validators/media.validator.js';

describe('presignMediaSchema', () => {
  it('accepts a video file', () => {
    const parsed = presignMediaSchema.parse({
      originalFilename: 'clip.mp4',
      mimeType: 'video/mp4',
      fileSize: 1024,
      type: 'video',
    });
    expect(parsed.originalFilename).toBe('clip.mp4');
  });
});

describe('presignMediaBatchSchema', () => {
  it('accepts 1–20 files', () => {
    const parsed = presignMediaBatchSchema.parse({
      files: [
        {
          originalFilename: 'a.mp4',
          mimeType: 'video/mp4',
          fileSize: 100,
        },
        {
          originalFilename: 'b.mp4',
          mimeType: 'video/mp4',
          fileSize: 200,
        },
      ],
    });
    expect(parsed.files).toHaveLength(2);
  });

  it('rejects more than 20 files', () => {
    const result = presignMediaBatchSchema.safeParse({
      files: Array.from({ length: 21 }, (_, i) => ({
        originalFilename: `f${i}.mp4`,
        mimeType: 'video/mp4',
        fileSize: 100,
      })),
    });
    expect(result.success).toBe(false);
  });
});

describe('bulkDeleteMediaSchema', () => {
  it('accepts ids array', () => {
    const parsed = bulkDeleteMediaSchema.parse({ ids: ['a', 'b'] });
    expect(parsed.ids).toHaveLength(2);
  });

  it('rejects empty ids', () => {
    expect(bulkDeleteMediaSchema.safeParse({ ids: [] }).success).toBe(false);
  });
});
