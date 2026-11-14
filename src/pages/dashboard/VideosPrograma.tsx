import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useLanguage } from '../../context/LanguageContext'
import { PlayCircle, Video, ExternalLink } from 'lucide-react'

interface VideoTutorial {
    id: string
    titulo: string
    descripcion: string
    url: string
    fecha_creacion: string
}

export const VideosPrograma = () => {
    const { t } = useLanguage()
    const [loading, setLoading] = useState(true)
    const [videos, setVideos] = useState<VideoTutorial[]>([])

    useEffect(() => {
        fetchVideos()
    }, [])

    const fetchVideos = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('videos_tutoriales')
                .select('*')
                .order('fecha_creacion', { ascending: false })

            if (error) throw error
            setVideos(data || [])
        } catch (err) {
            console.error('Error fetching videos:', err)
        } finally {
            setLoading(false)
        }
    }

    // Convertir URL de Google Drive de "view" a "preview" para que el iframe funcione
    const getEmbedUrl = (url: string) => {
        if (url.includes('drive.google.com')) {
            return url.replace(/\/view.*$/, '/preview')
        }
        if (url.includes('youtube.com/watch?v=')) {
            const videoId = new URL(url).searchParams.get('v')
            return `https://www.youtube.com/embed/${videoId}`
        }
        if (url.includes('youtu.be/')) {
            const videoId = url.split('youtu.be/')[1].split('?')[0]
            return `https://www.youtube.com/embed/${videoId}`
        }
        return url
    }

    if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div></div>

    return (
        <div className="max-w-7xl mx-auto space-y-8 p-4">
            <header className="mb-8">
                <h2 className="text-3xl font-black text-brand-black uppercase tracking-tighter italic flex items-center gap-3">
                    <PlayCircle className="text-brand-blue" size={32} /> {t('modules.videos.title')}
                </h2>
                <p className="text-brand-gray font-medium">{t('modules.videos.subtitle')}</p>
            </header>

            {videos.length === 0 ? (
                <div className="bg-white p-12 rounded-semi shadow-xl border border-brand-gray/10 flex flex-col items-center justify-center text-center">
                    <div className="bg-brand-lightGray p-6 rounded-full mb-4">
                        <Video size={48} className="text-brand-gray opacity-50" />
                    </div>
                    <h3 className="text-xl font-black text-brand-black uppercase tracking-widest mb-2">Aún no hay videos</h3>
                    <p className="text-brand-gray font-medium">El administrador pronto subirá tutoriales para ayudarte a usar el sistema.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                    {videos.map(video => {
                        const embedUrl = getEmbedUrl(video.url)
                        return (
                            <div key={video.id} className="bg-white rounded-semi shadow-xl border border-brand-gray/10 overflow-hidden flex flex-col hover:shadow-2xl transition-all duration-300">
                                <div className="relative pt-[56.25%] bg-black">
                                    {/* 16:9 Aspect Ratio Container */}
                                    <iframe
                                        src={embedUrl}
                                        className="absolute top-0 left-0 w-full h-full border-0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    ></iframe>
                                </div>
                                <div className="p-6 flex flex-col flex-1">
                                    <h3 className="text-xl font-black text-brand-black uppercase leading-tight mb-2">{video.titulo}</h3>
                                    <p className="text-brand-gray text-sm mb-6 flex-1">{video.descripcion}</p>

                                    <a
                                        href={video.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-center gap-2 w-full py-3 bg-brand-lightGray text-brand-black font-bold uppercase text-xs rounded hover:bg-brand-gray/10 transition-colors"
                                    >
                                        Abrir en otra pestaña <ExternalLink size={14} />
                                    </a>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
