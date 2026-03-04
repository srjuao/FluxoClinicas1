import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    LogOut,
    X,
    Stethoscope,
    LucideIcon,
    ChevronDown,
    ChevronRight,
    Moon,
    Sun,
} from "lucide-react";

export interface SidebarItem {
    id: string;
    label: string;
    icon: LucideIcon;
    onClick?: () => void;
    subItems?: {
        id: string;
        label: string;
        icon: LucideIcon;
        onClick?: () => void;
    }[];
}

export interface SidebarSection {
    title?: string;
    items: SidebarItem[];
}

export interface UnifiedSidebarProps {
    sections: SidebarSection[];
    activeTab: string;
    activeSubTab?: string;
    onTabChange: (tabId: string) => void;
    onSubTabChange?: (subTabId: string) => void;
    userProfile?: {
        name?: string;
        email?: string;
        role?: string;
    };
    onLogout: () => void;
    isMobileMenuOpen: boolean;
    setIsMobileMenuOpen: (isOpen: boolean) => void;
    brandName?: string;
    brandIcon?: LucideIcon;
}

const UnifiedSidebar = ({
    sections,
    activeTab,
    activeSubTab,
    onTabChange,
    onSubTabChange,
    userProfile,
    onLogout,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    brandName = "FluxoClinic",
    brandIcon: BrandIcon = Stethoscope
}: UnifiedSidebarProps) => {
    const [isMobile, setIsMobile] = useState(false);

    // Theme state
    const [isDark, setIsDark] = useState(() => {
        if (typeof window !== 'undefined') {
            return document.documentElement.classList.contains('dark');
        }
        return false;
    });

    // Handle Theme Toggle
    const toggleTheme = () => {
        const newIsDark = !isDark;
        setIsDark(newIsDark);
        if (newIsDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    // Load theme on mount
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            setIsDark(true);
            document.documentElement.classList.add('dark');
        } else {
            setIsDark(false);
            document.documentElement.classList.remove('dark');
        }
    }, []);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const renderIcon = (Icon: LucideIcon, className: string) => {
        return <Icon className={className} />;
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isMobile && isMobileMenuOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
                />
            )}

            {/* Sidebar offcanvas */}
            <motion.aside
                initial={false}
                animate={isMobile ? { x: isMobileMenuOpen ? 0 : "-100%" } : { x: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={`
                    fixed inset-y-0 left-0 z-50 w-72 lg:sticky lg:top-0 h-screen
                    glass-effect border-r border-slate-200/10 flex flex-col justify-between
                    ${isMobile ? "shadow-2xl" : ""}
                `}
            >
                <div className="flex flex-col h-full">
                    {/* Header / Brand */}
                    <div className="p-6 flex items-center justify-between lg:justify-start gap-3">
                        <div className="flex items-center gap-3">
                            <div className="gradient-primary w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                                <BrandIcon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-lg font-bold tracking-tight text-slate-800">{brandName}</span>
                                <span className="text-[10px] font-medium text-primary uppercase tracking-widest">Sistema Médico</span>
                            </div>
                        </div>
                        {isMobile && (
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="p-2 text-slate-500 hover:text-slate-800 transition-colors rounded-lg hover:bg-slate-100 lg:hidden"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {/* Navigation Groups */}
                    <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6">
                        {sections.map((section, sectionIdx) => (
                            <div key={sectionIdx}>
                                {section.title && (
                                    <h3 className="px-4 mb-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                                        {section.title}
                                    </h3>
                                )}
                                <nav className="space-y-1">
                                    {section.items.map((item) => {
                                        const isActive = activeTab === item.id;
                                        const hasSubItems = item.subItems && item.subItems.length > 0;

                                        return (
                                            <div key={item.id}>
                                                <button
                                                    onClick={() => {
                                                        if (item.onClick) item.onClick();
                                                        else onTabChange(item.id);

                                                        if (!hasSubItems && isMobile) {
                                                            setIsMobileMenuOpen(false);
                                                        }
                                                    }}
                                                    className={`
                                                      w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all duration-200 group
                                                      ${isActive
                                                            ? "gradient-primary text-white shadow-lg shadow-purple-500/30"
                                                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:translate-x-1"
                                                        }
                                                    `}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {renderIcon(item.icon, `w-5 h-5 transition-colors ${isActive ? "text-white" : "group-hover:text-purple-600"}`)}
                                                        <span className="text-sm font-semibold">{item.label}</span>
                                                    </div>

                                                    {/* Subitem Indicator */}
                                                    {hasSubItems ? (
                                                        isActive ? <ChevronDown className="w-4 h-4 opacity-80" /> : <ChevronRight className="w-4 h-4 opacity-50" />
                                                    ) : (
                                                        isActive && <ChevronRight className="w-4 h-4 opacity-80" />
                                                    )}
                                                </button>

                                                {/* Submenu */}
                                                <AnimatePresence>
                                                    {hasSubItems && isActive && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden space-y-1 mt-1 pl-[3.25rem]"
                                                        >
                                                            {item.subItems?.map((subItem) => {
                                                                const isSubActive = activeSubTab === subItem.id;
                                                                return (
                                                                    <button
                                                                        key={subItem.id}
                                                                        onClick={() => {
                                                                            if (subItem.onClick) subItem.onClick();
                                                                            else if (onSubTabChange) onSubTabChange(subItem.id);
                                                                            if (isMobile) setIsMobileMenuOpen(false);
                                                                        }}
                                                                        className={`
                                                                            w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all
                                                                            ${isSubActive
                                                                                ? "text-purple-700 bg-purple-50 font-bold"
                                                                                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                                                            }
                                                                        `}
                                                                    >
                                                                        {renderIcon(subItem.icon, `w-4 h-4 ${isSubActive ? "text-purple-600" : "text-slate-400"}`)}
                                                                        <span>{subItem.label}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    })}
                                </nav>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer / Profile */}
                <div className="p-4 border-t border-slate-200/50 dark:border-white/5 space-y-4">
                    {/* Theme Toggle */}
                    <div className="flex items-center justify-between px-2">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Tema</span>
                        <button
                            onClick={toggleTheme}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            title={isDark ? "Mudar para Claro" : "Mudar para Escuro"}
                        >
                            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 flex flex-col gap-4 border border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full border-2 border-purple-200 dark:border-purple-900/50 bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-700 dark:text-purple-300 font-bold">
                                    {userProfile?.name?.charAt(0) || "U"}
                                </div>
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{userProfile?.name || "Usuário"}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{userProfile?.role || "Cargo não definido"}</span>
                            </div>
                        </div>
                        <button
                            onClick={onLogout}
                            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors duration-200"
                        >
                            <LogOut className="w-4 h-4" />
                            Sair
                        </button>
                    </div>
                </div>
            </motion.aside>
        </>
    );
};

export default UnifiedSidebar;
