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
    const audioRef = useRef<HTMLAudioElement | null>(null);

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
                    setRecentCalls((prev) => [currentCall!, ...prev].filter(Boolean).slice(0, 4));
                    setCurrentCall(newCall);

                    // Play audio alert
                    if (audioRef.current) {
                        audioRef.current.play().catch(console.error);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [clinicId, currentCall]);

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

            {/* Audio alert */}
            <audio ref={audioRef} preload="auto">
                <source
                    src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdWmwm5qWjpSYpZmem5WVn5+io6Ojo6Sjo6OjoqOjo6OjoqOjo6Ojo6OjoqOipKOjo6Ojo6Ojo6Ojo6OjoqKioaGgoaCgoJ+fnp6enZycnJubmpqamZmYl5aVlJOSkZCPjo2Mi4qJiIeGhYSDgoGAf359fHt6eXh3dnV0c3JxcG9ubWxramloZ2ZlZGNiYWBfXl1cW1pZWFdWVVRTUlFQT05NTEtKSUhHRkVEQ0JBQD8+PTw7Ojk4NzY1NDMyMTAvLi0sKyopKCcmJSQjIiEgHx4dHBsaGRgXFhUUExIREA8ODQwLCgkIBwYFBAMCAQAAAgQFBwkKDA4QEhQWGBocHiAiJCYoKiwuMDI0Njg6PD5AQkRGSEpMTlBSVFZYWlxeYGJkZmhqbG5wcnR2eHp8foGDhYeJi42PkZOVl5mbnZ+ho6Wmp6mqq6ytrrCxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+"
                    type="audio/wav"
                />
            </audio>

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
                                    animate={{ rotate: [0, 10, -10, 10, -10, 0] }}
                                    transition={{ duration: 0.5, repeat: 3 }}
                                    className="mb-8"
                                >
                                    <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-2xl">
                                        <Bell className="w-12 h-12 text-white" />
                                    </div>
                                </motion.div>

                                {/* Patient Name */}
                                <motion.h2
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="text-7xl font-extrabold text-white mb-6 tracking-tight"
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
                                    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-12 py-6 rounded-2xl shadow-2xl">
                                        <p className="text-white/80 text-xl mb-1">Dirigir-se à</p>
                                        <p className="text-5xl font-bold text-white">{currentCall.room}</p>
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
                            <p className="text-white/60 text-sm mb-3">Chamadas anteriores:</p>
                            <div className="flex gap-4">
                                {recentCalls.map((call) => (
                                    <div
                                        key={call.id}
                                        className="bg-white/10 rounded-xl px-6 py-3 text-white"
                                    >
                                        <span className="font-semibold">{call.patient_name}</span>
                                        <span className="text-white/60 mx-2">→</span>
                                        <span className="text-emerald-400">{call.room}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </footer>
                )}
            </div>
        </>
    );
};

export default TVPanelPage;
