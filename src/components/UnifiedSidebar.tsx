import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  ChevronRight,
  Menu,
  X,
  Stethoscope,
  LucideIcon,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
  brandIcon: BrandIcon = Stethoscope,
}: UnifiedSidebarProps) => {
  const [isMobile, setIsMobile] = useState(false);

  // Detect Mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <>
      {/* Mobile Toggle Button (displayed outside of this component usually, but we handle the drawer here) */}
      {/* Note: The parent should handle the header with the toggle button if it wants to be consistent with the layout, 
          but if this sidebar is meant to be self-contained in logic, it can manage the overlay. */}

      {/* Sidebar Overlay */}
      {isMobile && isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black z-40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={isMobile ? { x: isMobileMenuOpen ? 0 : -280 } : { x: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`
            fixed lg:sticky top-0 left-0 z-50 w-72 bg-white border-r border-gray-200 flex flex-col
            ${isMobile ? "shadow-2xl" : ""}
        `}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-100 hidden lg:flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white shadow-lg shadow-purple-200">
            <BrandIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-gray-900">{brandName}</h1>
            <p className="text-xs text-gray-500">Gestão Inteligente</p>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              {section.title && (
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-4">
                  {section.title}
                </h3>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = activeTab === item.id;
                  const Icon = item.icon;
                  const hasSubItems = item.subItems && item.subItems.length > 0;
                  // For subitems, we assume they map to activeSubTab

                  return (
                    <div key={item.id}>
                      <button
                        onClick={() => {
                          if (item.onClick) {
                            item.onClick();
                          } else {
                            onTabChange(item.id);
                          }
                          // If no subitems, we might close mobile menu
                          if (!hasSubItems && isMobile) {
                            setIsMobileMenuOpen(false);
                          }
                        }}
                        className={`
                              w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                              ${
                                isActive
                                  ? "bg-purple-50 text-purple-700 shadow-sm border border-purple-100"
                                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                              }
                          `}
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            className={`w-5 h-5 ${isActive ? "text-purple-600" : "text-gray-400"}`}
                          />
                          <span>{item.label}</span>
                        </div>
                        {hasSubItems ? (
                          isActive ? (
                            <ChevronDown className="w-4 h-4 text-purple-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )
                        ) : (
                          isActive && (
                            <ChevronRight className="w-4 h-4 text-purple-400" />
                          )
                        )}
                      </button>

                      {/* Submenu */}
                      <AnimatePresence>
                        {hasSubItems && isActive && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden ml-9 pt-1 space-y-1 border-l-2 border-purple-100 pl-2"
                          >
                            {item.subItems?.map((subItem) => {
                              const SubIcon = subItem.icon;
                              const isSubActive = activeSubTab === subItem.id;
                              return (
                                <button
                                  key={subItem.id}
                                  onClick={() => {
                                    if (subItem.onClick) {
                                      subItem.onClick();
                                    } else if (onSubTabChange) {
                                      onSubTabChange(subItem.id);
                                    }
                                    if (isMobile) setIsMobileMenuOpen(false);
                                  }}
                                  className={`
                                                  w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors
                                                  ${isSubActive ? "text-purple-700 bg-purple-50 font-medium" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"}
                                              `}
                                >
                                  <SubIcon
                                    className={`w-4 h-4 ${isSubActive ? "text-purple-600" : "text-gray-400"}`}
                                  />
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
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border-2 border-white shadow-sm">
              {userProfile?.name?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {userProfile?.name}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {userProfile?.email}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
            onClick={onLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </motion.aside>
    </>
  );
};

export default UnifiedSidebar;
