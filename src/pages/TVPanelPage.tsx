import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Tv } from "lucide-react";
import { supabase } from "@/lib/customSupabaseClient";

interface PatientCall {
    id: string;
    patient_name: string;
    room: string;
    called_at: string;
    doctor_name?: string;
}

interface TVPanelPageProps {
    clinicId: string;
}

const TVPanelPage: React.FC<TVPanelPageProps> = ({ clinicId }) => {
    const [currentCall, setCurrentCall] = useState<PatientCall | null>(null);
    const [recentCalls, setRecentCalls] = useState<PatientCall[]>([]);
    const [clinicName, setClinicName] = useState<string>("");
    const [hasStarted, setHasStarted] = useState<boolean>(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const currentCallRef = useRef<PatientCall | null>(null);

    useEffect(() => {
        currentCallRef.current = currentCall;
    }, [currentCall]);

    const playAudio = async () => {
        if (audioRef.current) {
            try {
                audioRef.current.currentTime = 0;
                audioRef.current.volume = 1.0;
                await audioRef.current.play();

                // Play again after 1.5 seconds for greater impact
                setTimeout(async () => {
                    if (audioRef.current) {
                        audioRef.current.currentTime = 0;
                        await audioRef.current.play();
                    }
                }, 1500);
            } catch (error) {
                console.error("Erro ao reproduzir áudio:", error);
            }
        }
    };

    // Fetch clinic name
    useEffect(() => {
        const fetchClinic = async () => {
            const { data } = await supabase
                .from("clinics")
                .select("name")
                .eq("id", clinicId)
                .single();
            if (data) {
                setClinicName(data.name);
            }
        };
        fetchClinic();
    }, [clinicId]);

    // Fetch recent calls
    useEffect(() => {
        const fetchCalls = async () => {
            const { data } = await supabase
                .from("patient_calls")
                .select("*")
                .eq("clinic_id", clinicId)
                .eq("is_active", true)
                .order("called_at", { ascending: false })
                .limit(5);

            if (data && data.length > 0) {
                setCurrentCall(data[0]);
                setRecentCalls(data.slice(1));
            }
        };
        fetchCalls();

        // Subscribe to realtime changes
        const channel = supabase
            .channel(`patient_calls_${clinicId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "patient_calls",
                    filter: `clinic_id=eq.${clinicId}`,
                },
                (payload) => {
                    const newCall = payload.new as PatientCall;
                    const prevCall = currentCallRef.current;
                    setRecentCalls((prev) => [prevCall!, ...prev].filter(Boolean).slice(0, 4));
                    setCurrentCall(newCall);

                    // Play audio alert
                    playAudio();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [clinicId]);

    // Auto-dismiss after 30 seconds
    useEffect(() => {
        if (!currentCall) return;

        const timer = setTimeout(async () => {
            // Mark as inactive
            await supabase
                .from("patient_calls")
                .update({ is_active: false })
                .eq("id", currentCall.id);

            // Move to next call or clear
            if (recentCalls.length > 0) {
                setCurrentCall(recentCalls[0]);
                setRecentCalls((prev) => prev.slice(1));
            } else {
                setCurrentCall(null);
            }
        }, 30000);

        return () => clearTimeout(timer);
    }, [currentCall, recentCalls]);

    return (
        <>
            <Helmet>
                <title>Painel de Chamada - {clinicName || "Clínica"}</title>
            </Helmet>

            {/* Audio alert - using a clearer and louder doorbell sound */}
            <audio ref={audioRef} preload="auto">
                <source
                    src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
                    type="audio/mpeg"
                />
            </audio>

            {!hasStarted ? (
                <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-24 h-24 mb-8 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-2xl">
                        <Tv className="w-12 h-12 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-4">{clinicName || "Painel de Chamada"}</h1>
                    <p className="text-purple-200 text-xl mb-12 max-w-md">
                        Para o correto funcionamento dos alertas sonoros, é necessário iniciar o painel.
                    </p>
                    <button
                        onClick={() => {
                            if (audioRef.current) {
                                // Toca um som mudo primeiro para desbloquear a política de autoplay
                                audioRef.current.volume = 0;
                                audioRef.current.play().then(() => {
                                    audioRef.current!.pause();
                                    audioRef.current!.currentTime = 0;
                                    audioRef.current!.volume = 1;
                                }).catch(e => console.error(e));
                            }
                            setHasStarted(true);
                        }}
                        className="px-10 py-5 bg-white text-indigo-900 hover:bg-gray-100 rounded-2xl text-2xl font-extrabold shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all hover:scale-105 active:scale-95 flex items-center gap-4"
                    >
                        <Bell className="w-8 h-8" />
                        Iniciar Painel
                    </button>
                </div>
            ) : (
                <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 flex flex-col">
                    {/* Header */}
                    <header className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between max-w-6xl mx-auto">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                                <Tv className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">{clinicName}</h1>
                                <p className="text-purple-300 text-sm">Painel de Chamada de Pacientes</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-8">
                            {/* Test Volume Button */}
                            <button
                                onClick={playAudio}
                                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-all text-sm border border-white/5"
                                title="Testar Volume"
                            >
                                <Bell className="w-4 h-4" />
                                Testar Som
                            </button>
                            <div className="text-right">
                                <p className="text-white/60 text-sm">
                                    {new Date().toLocaleDateString("pt-BR", {
                                        weekday: "long",
                                        day: "numeric",
                                        month: "long",
                                    })}
                                </p>
                                <p className="text-3xl font-bold text-white">
                                    {new Date().toLocaleTimeString("pt-BR", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 flex items-center justify-center p-8">
                    <AnimatePresence mode="wait">
                        {currentCall ? (
                            <motion.div
                                key={currentCall.id}
                                initial={{ opacity: 0, scale: 0.8, y: 50 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: -50 }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className="text-center max-w-4xl"
                            >
                                {/* Bell Icon Animated */}
                                <motion.div
                                    animate={{ rotate: [0, 20, -20, 20, -20, 0] }}
                                    transition={{ duration: 0.8, repeat: 2, repeatDelay: 0.2 }}
                                    className="mb-8"
                                >
                                    <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-[0_0_50px_rgba(234,179,8,0.3)]">
                                        <Bell className="w-16 h-16 text-white" />
                                    </div>
                                </motion.div>

                                {/* Patient Name */}
                                <motion.h2
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="text-8xl font-extrabold text-white mb-8 tracking-tight drop-shadow-2xl"
                                >
                                    {currentCall.patient_name}
                                </motion.h2>

                                {/* Room */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                    className="inline-block"
                                >
                                    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-16 py-8 rounded-3xl shadow-[0_20px_50px_rgba(16,185,129,0.3)] border border-emerald-400/20">
                                        <p className="text-white/80 text-2xl mb-2">Dirigir-se à</p>
                                        <p className="text-6xl font-black text-white">{currentCall.room}</p>
                                    </div>
                                </motion.div>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center"
                            >
                                <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-white/10 flex items-center justify-center">
                                    <Tv className="w-16 h-16 text-white/40" />
                                </div>
                                <h2 className="text-4xl font-bold text-white/60 mb-4">
                                    Aguardando chamadas...
                                </h2>
                                <p className="text-xl text-white/40">
                                    Os pacientes serão chamados aqui
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>

                {/* Recent Calls Footer */}
                {recentCalls.length > 0 && (
                    <footer className="p-6 border-t border-white/10">
                        <div className="max-w-6xl mx-auto">
                            <p className="text-white/60 text-sm mb-3 font-medium uppercase tracking-wider">Chamadas anteriores:</p>
                            <div className="flex gap-4">
                                {recentCalls.map((call) => (
                                    <div
                                        key={call.id}
                                        className="bg-white/5 border border-white/10 rounded-2xl px-8 py-4 text-white hover:bg-white/10 transition-colors"
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-bold text-lg">{call.patient_name}</span>
                                            <span className="text-emerald-400 font-semibold">{call.room}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </footer>
                )}
            </div>
            )}
        </>
    );
};

export default TVPanelPage;
