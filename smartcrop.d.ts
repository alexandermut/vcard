declare module 'smartcrop' {
    interface CropOptions {
        width: number;
        height: number;
        minScale?: number;
        ruleOfThirds?: boolean;
        debug?: boolean;
    }

    interface CropResult {
        topCrop: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    }

    export function crop(image: HTMLImageElement, options: CropOptions): Promise<CropResult>;
}
