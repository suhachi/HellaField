import React, { useEffect, useRef, useState } from 'react';

type Props = {
    imageUrl: string;
    onSave: (file: File) => void;
    onCancel: () => void;
};

export default function DrawingCanvas({ imageUrl, onSave, onCancel }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState<'#ef4444' | '#ffffff'>('#ef4444'); // Red-500 or White
    const [lineWidth] = useState(5);
    const [imageLoaded, setImageLoaded] = useState(false);
    const imgRef = useRef<HTMLImageElement | null>(null);

    // Initialize canvas with image
    useEffect(() => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imageUrl;
        img.onload = () => {
            imgRef.current = img;
            const canvas = canvasRef.current;
            if (canvas) {
                // Set canvas size to match image resolution
                canvas.width = img.width;
                canvas.height = img.height;

                // Draw image initially
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                }
                setImageLoaded(true);
            }
        };
    }, [imageUrl]);

    const getPoint = (e: React.MouseEvent | React.TouchEvent | PointerEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;

        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        // Map client coords to canvas resolution
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            const { x, y } = getPoint(e);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth * (canvasRef.current!.width / 1000); // Scale line width relative to image size
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        // Prevent scrolling on touch
        if (e.cancelable) e.preventDefault();

        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            const { x, y } = getPoint(e);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.closePath();
        }
    };

    const handleSave = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], "annotated_image.jpg", { type: "image/jpeg" });
                onSave(file);
            }
        }, 'image/jpeg', 0.92);
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        const img = imgRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && img && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 3050, background: '#000',
            display: 'flex', flexDirection: 'column'
        }}>
            {/* Toolbar */}
            <div style={{
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#1f2937',
                color: '#fff'
            }}>
                <button onClick={onCancel} style={{ fontSize: '14px' }}>취소</button>
                <div style={{ fontWeight: 'bold' }}>사진 편집</div>
                <button onClick={handleSave} style={{ color: '#3b82f6', fontWeight: 'bold' }}>저장</button>
            </div>

            {/* Canvas Area */}
            <div style={{
                flex: 1,
                position: 'relative',
                background: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                touchAction: 'none' // Important for drawing
            }}>
                {!imageLoaded && <div style={{ color: '#fff' }}>이미지 로딩 중...</div>}
                <canvas
                    ref={canvasRef}
                    style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        display: imageLoaded ? 'block' : 'none'
                    }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseOut={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
            </div>

            {/* Tools */}
            <div style={{
                padding: '20px',
                background: '#1f2937',
                display: 'flex',
                justifyContent: 'center',
                gap: '20px'
            }}>
                <button
                    onClick={() => setColor('#ef4444')}
                    style={{
                        width: 40, height: 40, borderRadius: '50%', background: '#ef4444',
                        border: color === '#ef4444' ? '3px solid #fff' : 'none'
                    }}
                />
                <button
                    onClick={() => setColor('#ffffff')}
                    style={{
                        width: 40, height: 40, borderRadius: '50%', background: '#ffffff',
                        border: color === '#ffffff' ? '3px solid #3b82f6' : 'none'
                    }}
                />
                <div style={{ width: 1, background: '#4b5563', margin: '0 10px' }} />
                <button
                    onClick={handleClear}
                    style={{
                        padding: '8px 16px', background: '#374151', color: '#fff',
                        borderRadius: '8px', fontSize: '14px'
                    }}
                >
                    초기화
                </button>
            </div>
        </div>
    );
}
