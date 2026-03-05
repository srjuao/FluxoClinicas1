import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Landmark, Moon, CheckCircle2, BrainCircuit } from "lucide-react";

const CURRENT_VERSION = "2.3.0"; // Incrementar esta versão para forçar o popup a aparecer novamente

export const ReleaseNotesModal = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const lastSeenVersion = localStorage.getItem("lastSeenReleaseNotes");
        if (lastSeenVersion !== CURRENT_VERSION) {
            // Pequeno delay para não sobrepor o carregamento inicial do dashboard
            const timer = setTimeout(() => {
                setIsOpen(true);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        localStorage.setItem("lastSeenReleaseNotes", CURRENT_VERSION);
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[500px] border-none glass-effect shadow-2xl">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="gradient-primary p-2 rounded-lg">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xs font-bold text-primary uppercase tracking-widest">Atualização de Sistema</span>
                    </div>
                    <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                        Novidades da Versão {CURRENT_VERSION}
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 dark:text-slate-400">
                        Confira as novas funcionalidades que acabamos de liberar para facilitar o seu dia a dia na clínica.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-6">
                    {/* Item 1: IA Assistente */}
                    <div className="flex gap-4">
                        <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-xl h-fit">
                            <BrainCircuit className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-200">Novo: Assistente Diagnóstico IA</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Receba sugestões inteligentes de hipóteses diagnósticas e prescrições baseadas no histórico do paciente.</p>
                        </div>
                    </div>

                    {/* Item 2: IA Copilot */}
                    <div className="flex gap-4">
                        <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-xl h-fit">
                            <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-200">Copilot de Segurança Prescritiva</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Analise interações medicamentosas e alergias em tempo real na hora de prescrever.</p>
                        </div>
                    </div>

                    {/* Item 2: Portal CFM */}
                    <div className="flex gap-4">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-xl h-fit">
                            <Landmark className="w-6 h-6 text-[#1351b4] dark:text-blue-400" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-200">Receita Digital Oficial (Portal CFM)</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Emita receitas de Tarja Preta e Antibióticos integradas à Anvisa e ICP-Brasil de forma 100% gratuita.</p>
                        </div>
                    </div>

                    {/* Item 3: Dark Mode Inputs */}
                    <div className="flex gap-4">
                        <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-xl h-fit">
                            <Moon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-200">Modo Dark Aperfeiçoado</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Todas as caixas de texto agora seguem o padrão visual escuro para maior conforto visual.</p>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={handleClose} className="w-full gradient-primary text-white py-6 rounded-xl font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        Entendi, ótimo trabalho!
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
