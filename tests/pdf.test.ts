import { describe, it, expect, vi } from 'vitest';
import { convertPdfToImages } from '../utils/pdfUtils';

// Mock pdfjs-dist
vi.mock('pdfjs-dist', () => ({
    GlobalWorkerOptions: { workerSrc: '' },
    version: '1.0.0',
    getDocument: vi.fn(() => ({
        promise: Promise.resolve({
            numPages: 2,
            getPage: vi.fn(() => Promise.resolve({
                getViewport: vi.fn(() => ({ width: 100, height: 100 })),
                render: vi.fn(() => ({ promise: Promise.resolve() }))
            }))
        })
    }))
}));

describe('PDF Utils', () => {
    it('should convert PDF to images', async () => {
        // Mock File
        const mockFile = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
        mockFile.arrayBuffer = vi.fn(() => Promise.resolve(new ArrayBuffer(8)));

        // Mock Canvas
        const mockContext = {
            drawImage: vi.fn(),
        };
        const mockCanvas = {
            getContext: vi.fn(() => mockContext),
            toDataURL: vi.fn(() => 'data:image/jpeg;base64,mockimage'),
            height: 0,
            width: 0
        };
        vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as any);

        const images = await convertPdfToImages(mockFile);

        expect(images).toHaveLength(2); // 2 pages mocked
        expect(images[0]).toBe('data:image/jpeg;base64,mockimage');
        expect(document.createElement).toHaveBeenCalledWith('canvas');
    });
});
