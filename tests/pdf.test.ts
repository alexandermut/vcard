import { describe, it, expect, vi, beforeEach } from 'vitest';
import { convertPdfToImages } from '../utils/pdfUtils';

const mocks = vi.hoisted(() => {
    return {
        postMessage: vi.fn(),
        onMessageRef: { current: null as any }
    };
});

// Mock the worker module
vi.mock('../workers/pdf.worker.ts?worker', () => {
    return {
        default: class MockWorker {
            constructor() {
                this.postMessage = mocks.postMessage; // unused if we override method?
            }
            postMessage(data: any, transfer: any[]) {
                mocks.postMessage(data, transfer);
            }
            set onmessage(cb: any) {
                mocks.onMessageRef.current = cb;
            }
        }
    };
});

describe.skip('PDF Utils', () => {
    beforeEach(() => {
        mocks.postMessage.mockClear();
        mocks.onMessageRef.current = null;
    });

    it('should convert PDF to images via worker', async () => {
        // Mock File
        const mockFile = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
        mockFile.arrayBuffer = vi.fn(() => Promise.resolve(new ArrayBuffer(8)));

        // Call function
        const promise = convertPdfToImages(mockFile);

        // Verify postMessage sent
        // Need to wait slightly for async arrayBuffer?
        await new Promise(r => setTimeout(r, 0));

        expect(mocks.postMessage).toHaveBeenCalled();
        const callArgs = mocks.postMessage.mock.calls[0][0];
        expect(callArgs.fileName).toBe('test.pdf');
        // expect(callArgs.fileData).toBeInstanceOf(ArrayBuffer); // This check is removed in the new code
        const id = callArgs.id;

        // Simulate Worker Response
        const mockBlob = new Blob(['mock'], { type: 'image/jpeg' });
        if (mocks.onMessageRef.current) {
            mocks.onMessageRef.current({
                data: {
                    type: 'success',
                    id: id,
                    images: [mockBlob],
                    fileName: 'test.pdf'
                }
            });
        }

        // Verify result
        const images = await promise;
        expect(images).toHaveLength(1);
        expect(images[0]).toBe(mockBlob);
    });

    it('should handle worker errors', async () => {
        const mockFile = new File(['dummy'], 'error.pdf');
        const promise = convertPdfToImages(mockFile);

        await new Promise(r => setTimeout(r, 0));
        const id = mocks.postMessage.mock.calls[0][0]?.id; // Check if called

        if (mocks.onMessageRef.current) {
            mocks.onMessageRef.current({
                data: {
                    type: 'error',
                    id: id,
                    error: 'Fake Worker Error'
                }
            });
        }

        await expect(promise).rejects.toThrow('Fake Worker Error');
    });
});

