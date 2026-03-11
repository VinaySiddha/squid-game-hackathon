import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';

const Webcam = forwardRef(function Webcam({ width = 320, height = 240 }, ref) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    let stream = null;
    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Camera access denied:', err);
      }
    }
    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const capture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8);
    });
  }, []);

  useImperativeHandle(ref, () => ({ capture }), [capture]);

  return (
    <div>
      <video ref={videoRef} autoPlay playsInline muted style={{ width, height, borderRadius: 8, background: '#000' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
});

export default Webcam;
