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

interface FinancialModuleProps {
    clinicId: string;
}

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
}

const FinancialModule: React.FC<FinancialModuleProps> = ({ clinicId, activeTab = "dashboard" }) => {
    // Determine which component to render
    const renderContent = () => {
        switch (activeTab) {
            case "dashboard": return <FinancialOverview clinicId={clinicId} />;
            case "particular": return <ParticularPayments clinicId={clinicId} />;
            case "insurance": return <InsuranceBilling clinicId={clinicId} />;
            case "denials": return <DenialManagement clinicId={clinicId} />;
            case "receivable": return <AccountsReceivable clinicId={clinicId} />;
            case "payroll": return <DoctorPayroll clinicId={clinicId} />;
            case "expenses": return <ExpenseManagement clinicId={clinicId} />;
            case "reports": return <FinancialReports clinicId={clinicId} />;
            default: return <FinancialOverview clinicId={clinicId} />;
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
