import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard,
    CreditCard,
    Building2,
    XCircle,
    Clock,
    Users,
    Receipt,
    FileBarChart,
    Menu,
    X,
    ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import FinancialOverview from "./financial/FinancialOverview";
import ParticularPayments from "./financial/ParticularPayments";
import InsuranceBilling from "./financial/InsuranceBilling";
import DenialManagement from "./financial/DenialManagement";
import AccountsReceivable from "./financial/AccountsReceivable";
import DoctorPayroll from "./financial/DoctorPayroll";
import ExpenseManagement from "./financial/ExpenseManagement";
import FinancialReports from "./financial/FinancialReports";



export const financialMenuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "particular", label: "Particular", icon: CreditCard },
    { id: "insurance", label: "Convênios", icon: Building2 },
    { id: "denials", label: "Glosas", icon: XCircle },
    { id: "receivable", label: "A Receber", icon: Clock },
    { id: "payroll", label: "Repasse Médico", icon: Users },
    { id: "expenses", label: "Despesas", icon: Receipt },
    { id: "reports", label: "Relatórios", icon: FileBarChart },
];

interface FinancialModuleProps {
    clinicId: string;
    activeTab?: string;
    isRestricted?: boolean;
}

const FinancialModule: React.FC<FinancialModuleProps> = ({ clinicId, activeTab = "dashboard", isRestricted = false }) => {
    // Determine which component to render
    const renderContent = () => {
        const commonProps = { clinicId, isRestricted };
        switch (activeTab) {
            case "dashboard": return <FinancialOverview {...commonProps} />;
            case "particular": return <ParticularPayments {...commonProps} />;
            case "insurance": return <InsuranceBilling {...commonProps} />;
            case "denials": return <DenialManagement {...commonProps} />;
            case "receivable": return <AccountsReceivable {...commonProps} />;
            case "payroll": return <DoctorPayroll {...commonProps} />;
            case "expenses": return <ExpenseManagement {...commonProps} />;
            case "reports": return <FinancialReports {...commonProps} />;
            default: return <FinancialOverview {...commonProps} />;
        }
    };

    return (
        <div className="h-full">
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="h-full"
            >
                {renderContent()}
            </motion.div>
        </div>
    );
};

export default FinancialModule;
