import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { precompressImage } from '../lib/image-precompress.ts';

describe('image-precompress client utility', () => {
  let origCreateImageBitmap: any;
  let origDocument: any;

  before(() => {
    origCreateImageBitmap = (globalThis as any).createImageBitmap;
    origDocument = (globalThis as any).document;

    // Mock createImageBitmap
    (globalThis as any).createImageBitmap = async (_file: any) => {
      return {
        width: 4000,
        height: 3000,
        close: () => {},
      };
    };

    // Mock document and canvas
    (globalThis as any).document = {
      createElement: (type: string) => {
        if (type === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: (contextType: string) => {
              if (contextType === '2d') {
                return {
                  drawImage: () => {},
                };
              }
              return null;
            },
            toBlob: (cb: (blob: any) => void, _mime?: string, _quality?: number) => {
              cb(new Blob([new Uint8Array(250000)], { type: 'image/jpeg' }));
            },
          };
        }
        return null;
      },
    };
  });

  after(() => {
    (globalThis as any).createImageBitmap = origCreateImageBitmap;
    (globalThis as any).document = origDocument;
  });

  it('correctly resizes and compresses a large image client-side', async () => {
    const fakeFile = {
      name: 'test_photo.jpg',
      size: 12000000, // 12MB
      type: 'image/jpeg',
    } as any;

    const compressed = await precompressImage(fakeFile, 1600);
    
    assert.equal(compressed.name, 'test_photo.jpg');
    assert.equal(compressed.type, 'image/jpeg');
    assert.equal(compressed.size, 250000); // 250KB
  });
});
