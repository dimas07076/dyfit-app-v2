// client/src/components/LiteYouTubeEmbed.tsx
import { useState, useRef, useEffect } from 'react';
import { PlayCircle } from 'lucide-react';

interface LiteYouTubeEmbedProps {
  id: string;
  title: string;
}

const LiteYouTubeEmbed = ({ id, title }: LiteYouTubeEmbedProps) => {
  const [shouldLoad, setShouldLoad] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Se o componente estiver visível na tela
        if (entry.isIntersecting) {
          setShouldLoad(true);
          // Uma vez carregado, não precisa mais observar
          observer.disconnect();
        }
      },
      {
        // Começa a carregar um pouco antes de entrar na tela para uma experiência mais suave
        rootMargin: '200px', 
      }
    );

    observer.observe(ref.current);

    // Função de limpeza para desconectar o observador quando o componente for desmontado
    return () => observer.disconnect();
  }, []);

  const videoId = (() => {
    try {
        if (id.includes("youtube.com/embed/")) {
            return id.split("/embed/")[1].split("?")[0];
        }
        return id;
    } catch {
        return id;
    }
  })();
  
  const posterUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return (
    <div ref={ref} className="w-full h-full bg-black">
      {shouldLoad ? (
        <iframe
          className="w-full h-full"
          title={title}
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      ) : (
        <div className="w-full h-full relative group cursor-pointer">
            <img
                src={posterUrl}
                alt={`Thumbnail para o vídeo: ${title}`}
                className="w-full h-full object-cover"
                loading="lazy"
            />
            <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
                <PlayCircle className="w-12 h-12 text-white opacity-80 drop-shadow-lg" />
            </div>
        </div>
      )}
    </div>
  );
};

export default LiteYouTubeEmbed;