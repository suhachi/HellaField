export type ImageQualityPreset = 'FAST_1024' | 'HQ_1600' | 'MAX_1920';

export function getMaxEdge(preset: ImageQualityPreset): number {
    switch (preset) {
        case 'FAST_1024': return 1024;
        case 'HQ_1600': return 1600;
        case 'MAX_1920': return 1920;
        default: return 1024;
    }
}

function getDefaultQuality(preset: ImageQualityPreset): number {
    switch (preset) {
        case 'FAST_1024': return 0.80;
        case 'HQ_1600': return 0.85;
        case 'MAX_1920': return 0.88;
        default: return 0.80;
    }
}

export interface OptimizeOptions {
    preset: ImageQualityPreset;
    mime?: 'image/jpeg' | 'image/webp' | 'image/png';
    quality?: number; // Override preset default if provided
}

/**
 * Optimizes an image (Blob or File) to the specified preset resolution and quality.
 * Keeps aspect ratio. Defaults to JPEG.
 */
export const optimizeImage = async (input: Blob | File, opts: OptimizeOptions): Promise<Blob> => {
    const startTime = Date.now();
    const originalKb = (input.size / 1024).toFixed(1);

    const maxEdge = getMaxEdge(opts.preset);
    const mime = opts.mime || 'image/jpeg';
    const quality = opts.quality ?? getDefaultQuality(opts.preset);

    // 1) Decode input to ImageBitmap or HTMLImageElement
    let img: ImageBitmap | HTMLImageElement;
    if (typeof createImageBitmap !== 'undefined') {
        try {
            img = await createImageBitmap(input);
        } catch (e) {
            console.warn("createImageBitmap failed, falling back to <img> decode", e);
            img = await decodeViaImg(input);
        }
    } else {
        img = await decodeViaImg(input);
    }

    // 2) Calculate new dimensions
    let { width, height } = img;
    if (width > maxEdge || height > maxEdge) {
        const ratio = width / height;
        if (ratio > 1) { // Landscape
            width = maxEdge;
            height = Math.round(maxEdge / ratio);
        } else { // Portrait or Square
            height = maxEdge;
            width = Math.round(maxEdge * ratio);
        }
    }

    // 3) Draw to canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error("Failed to get 2D context");
    }
    ctx.drawImage(img, 0, 0, width, height);

    // Clean up ImageBitmap if used
    if ('close' in img) {
        img.close();
    }

    // 4) Encode to Blob
    const optimizedBlob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error("Canvas toBlob failed"));
        }, mime, quality);
    });

    const optimizedKb = (optimizedBlob.size / 1024).toFixed(1);
    const elapsed = Date.now() - startTime;
    console.log(`[ImageOptimize] ${opts.preset}: ${originalKb}KB -> ${optimizedKb}KB (${elapsed}ms)`);

    return optimizedBlob;
};

// Fallback decoder
const decodeViaImg = (input: Blob): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(input);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = (e) => {
            URL.revokeObjectURL(url);
            reject(e);
        };
        img.src = url;
    });
};
