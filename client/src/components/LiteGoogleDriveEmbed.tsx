// client/src/components/LiteGoogleDriveEmbed.tsx
import { useState, useRef, useEffect } from 'react';
import { PlayCircle } from 'lucide-react';

interface LiteGoogleDriveEmbedProps {
  id: string; // O ID do arquivo do Google Drive
  title: string;
}

const LiteGoogleDriveEmbed = ({ id, title }: LiteGoogleDriveEmbedProps) => {
  const [shouldLoad, setShouldLoad] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '200px',
      }
    );
    
    observer.observe(ref.current);

    return () => observer.disconnect();
  }, []);
  
  const embedUrl = `https://drive.google.com/file/d/${id}/preview`;

  return (
    <div ref={ref} className="w-full h-full bg-slate-800">
      {shouldLoad ? (
        <iframe
          className="w-full h-full"
          title={title}
          src={embedUrl}
          allow="autoplay"
          allowFullScreen
        ></iframe>
      ) : (
        <div className="w-full h-full relative group flex items-center justify-center cursor-pointer">
            <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-40 transition-all duration-300"></div>
            <PlayCircle className="w-12 h-12 text-white opacity-0 group-hover:opacity-80 transition-opacity duration-300 drop-shadow-lg z-10" />
        </div>
      )}
    </div>
  );
};

export default LiteGoogleDriveEmbed;