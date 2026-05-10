import { type ImgHTMLAttributes, useMemo, useState } from 'react';

type SafeImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  fallbackSrc?: string;
};

const DEFAULT_FALLBACK =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%236b7280" font-family="Arial" font-size="28">Imagem indispon%C3%ADvel</text></svg>';

export default function SafeImage({ src, fallbackSrc = DEFAULT_FALLBACK, onError, ...props }: SafeImageProps) {
  const [failed, setFailed] = useState(false);
  const finalSrc = useMemo(() => (failed || !src ? fallbackSrc : src), [failed, src, fallbackSrc]);

  return (
    <img
      {...props}
      src={finalSrc}
      onError={(e) => {
        setFailed(true);
        onError?.(e);
      }}
    />
  );
}
