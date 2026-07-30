import { useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import './AvatarCropper.css';

interface Props {
  imageSrc: string;
  onCropComplete: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

export default function AvatarCropper({ imageSrc, onCropComplete, onCancel }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropChange = useCallback((newCrop: { x: number; y: number }) => setCrop(newCrop), []);
  const onZoomChange = useCallback((newZoom: number) => setZoom(newZoom), []);

  const onCropCompleteHandler = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const getCroppedImage = useCallback(async () => {
    if (!croppedAreaPixels || !imageSrc) return;
    const outputSize = 1024; // высокое разрешение
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => (image.onload = resolve));

    // Включаем высококачественное масштабирование
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      outputSize,
      outputSize
    );

    const dataUrl = canvas.toDataURL('image/png');
    onCropComplete(dataUrl);
  }, [croppedAreaPixels, imageSrc, onCropComplete]);

  return (
    <div className="cropper-overlay">
      <div className="cropper-modal">
        <div className="cropper-container">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropCompleteHandler}
          />
        </div>
        <div className="cropper-controls">
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
          <button onClick={getCroppedImage} className="btn-primary">
            Обрезать
          </button>
          <button onClick={onCancel}>Отмена</button>
        </div>
      </div>
    </div>
  );
}
