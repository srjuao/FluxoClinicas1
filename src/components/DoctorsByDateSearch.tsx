import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Calendar, Users, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/customSupabaseClient";

interface DoctorAvailability {
    doctorId: string;
    doctorName: string;
    crm: string;
    totalSlots: number;
    bookedSlots: number;
    availableSlots: number;
    status: "available" | "full" | "not_working";
    workStart?: string;
    workEnd?: string;
}

interface DoctorData {
    id: string;
    user_id: string;
    crm: string;
}

interface ProfileData {
    id: string;
    name: string;
}

interface WorkHourData {
    doctor_id: string;
    weekday: number | null;
    specific_date: string | null;
    start_time: string;
    end_time: string;
    slot_minutes: number;
    lunch_start: string | null;
    lunch_end: string | null;
}

interface AppointmentData {
    doctor_id: string;
    scheduled_start: string;
}

interface DoctorsByDateSearchProps {
    clinicId: string;
    onSelectDoctor: (doctorId: string) => void;
}

const DoctorsByDateSearch: React.FC<DoctorsByDateSearchProps> = ({
    clinicId,
    onSelectDoctor,
}) => {
    const [dateInput, setDateInput] = useState("");
    const [searchDate, setSearchDate] = useState<string | null>(null);
    const [doctors, setDoctors] = useState<DoctorAvailability[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // Format date input as DD/MM/YYYY
    const formatDateInput = (value: string) => {
        const digits = value.replace(/\D/g, "");
        if (digits.length <= 2) return digits;
        if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
        return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatDateInput(e.target.value);
        setDateInput(formatted);

        // Auto-search when date is complete (DD/MM/YYYY = 10 chars)
        if (formatted.length === 10) {
            const [day, month, year] = formatted.split("/").map(Number);
            if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2020) {
                const isoDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                setSearchDate(isoDate);
            }
        }
    };

    const searchDoctors = useCallback(async () => {
        if (!clinicId || !searchDate) return;

        setLoading(true);
        setHasSearched(true);

        try {
            // 1. Get all doctors from clinic
            const { data: doctorsData } = await supabase
                .from("doctors")
                .select("id, user_id, crm")
                .eq("clinic_id", clinicId);

            if (!doctorsData || doctorsData.length === 0) {
                setDoctors([]);
                return;
            }

            // 2. Get doctor names from profiles
            const userIds = doctorsData.map((d: DoctorData) => d.user_id);
            const { data: profilesData } = await supabase
                .from("profiles")
                .select("id, name")
                .in("id", userIds);

            // 3. Get work hours for all doctors
            const doctorIds = doctorsData.map((d: DoctorData) => d.id);
            const { data: workHoursData } = await supabase
                .from("doctor_work_hours")
                .select("*")
                .in("doctor_id", doctorIds);

            // 4. Get appointments for the selected date
            const { data: appointmentsData } = await supabase
                .from("appointments")
                .select("doctor_id, scheduled_start")
                .in("doctor_id", doctorIds)
                .gte("scheduled_start", `${searchDate}T00:00:00`)
                .lte("scheduled_start", `${searchDate}T23:59:59`)
                .neq("status", "CANCELLED");

            // 5. Calculate availability for each doctor
            const dateObj = new Date(searchDate + "T12:00:00"); // Add time to avoid timezone issues
            const dayOfWeek = dateObj.getDay();

            const availability: DoctorAvailability[] = doctorsData.map((doctor: DoctorData) => {
                const profile = profilesData?.find((p: ProfileData) => p.id === doctor.user_id);
                const doctorName = profile?.name || "Sem nome";

                // Find work hours for this doctor on this day
                const workHour = (workHoursData as WorkHourData[] | null)?.find(
                    (wh: WorkHourData) =>
                        wh.doctor_id === doctor.id &&
                        (wh.specific_date === searchDate || wh.weekday === dayOfWeek)
                );

                // Prioritize specific date over weekday
                const specificWorkHour = (workHoursData as WorkHourData[] | null)?.find(
                    (wh: WorkHourData) => wh.doctor_id === doctor.id && wh.specific_date === searchDate
                );
                const finalWorkHour = specificWorkHour || workHour;

                if (!finalWorkHour) {
                    return {
                        doctorId: doctor.id,
                        doctorName,
                        crm: doctor.crm,
                        totalSlots: 0,
                        bookedSlots: 0,
                        availableSlots: 0,
                        status: "not_working" as const,
                    };
                }

                // Calculate total slots
                const [startH, startM] = finalWorkHour.start_time.split(":").map(Number);
                const [endH, endM] = finalWorkHour.end_time.split(":").map(Number);
                const slotMinutes = finalWorkHour.slot_minutes || 30;

                let lunchSlots = 0;
                if (finalWorkHour.lunch_start && finalWorkHour.lunch_end) {
                    const [lsh, lsm] = finalWorkHour.lunch_start.split(":").map(Number);
                    const [leh, lem] = finalWorkHour.lunch_end.split(":").map(Number);
                    const lunchMinutes = (leh * 60 + lem) - (lsh * 60 + lsm);
                    lunchSlots = Math.floor(lunchMinutes / slotMinutes);
                }

                const totalWorkMinutes = (endH * 60 + endM) - (startH * 60 + startM);
                const totalSlots = Math.floor(totalWorkMinutes / slotMinutes) - lunchSlots;

                // Count booked appointments
                const bookedSlots = (appointmentsData as AppointmentData[] | null)?.filter(
                    (apt: AppointmentData) => apt.doctor_id === doctor.id
                ).length || 0;

                const availableSlots = Math.max(0, totalSlots - bookedSlots);

                return {
                    doctorId: doctor.id,
                    doctorName,
                    crm: doctor.crm,
                    totalSlots,
                    bookedSlots,
                    availableSlots,
                    status: availableSlots === 0 ? "full" : "available",
                    workStart: finalWorkHour.start_time.substring(0, 5),
                    workEnd: finalWorkHour.end_time.substring(0, 5),
                };
            });

            // Sort: available first, then full, then not working
            availability.sort((a, b) => {
                const order = { available: 0, full: 1, not_working: 2 };
                if (order[a.status] !== order[b.status]) {
                    return order[a.status] - order[b.status];
                }
                // Within same status, sort by available slots (desc) then name
                if (a.status === "available" && b.status === "available") {
                    return b.availableSlots - a.availableSlots;
                }
                return a.doctorName.localeCompare(b.doctorName, "pt-BR");
            });

            setDoctors(availability);
        } catch (error) {
            console.error("Erro ao buscar disponibilidade:", error);
        } finally {
            setLoading(false);
        }
    }, [clinicId, searchDate]);

    useEffect(() => {
        if (searchDate) {
            searchDoctors();
        }
    }, [searchDate, searchDoctors]);

    const getStatusBadge = (status: DoctorAvailability["status"]) => {
        switch (status) {
            case "available":
                return (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                        🟢 Disponível
                    </span>
                );
            case "full":
                return (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">
                        🟣 Esgotado
                    </span>
                );
            case "not_working":
                return (
                    <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded-full">
                        ⚫ Não atende
                    </span>
                );
        }
    };

    const formatDisplayDate = (isoDate: string) => {
        const [year, month, day] = isoDate.split("-");
        return `${day}/${month}/${year}`;
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Search className="w-4 h-4 text-white" />
                </div>
                <div>
                    <h3 className="font-semibold text-gray-900">Busca por Data</h3>
                    <p className="text-xs text-gray-500">Veja todos os médicos que atendem em um dia específico</p>
                </div>
            </div>

            {/* Date Input */}
            <div className="flex gap-2 mb-4">
                <div className="relative flex-1 max-w-[200px]">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={dateInput}
                        onChange={handleDateChange}
                        placeholder="DD/MM/AAAA"
                        maxLength={10}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                </div>
                <Button
                    onClick={() => {
                        if (dateInput.length === 10) {
                            const [day, month, year] = dateInput.split("/").map(Number);
                            const isoDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                            setSearchDate(isoDate);
                        }
                    }}
                    disabled={dateInput.length !== 10 || loading}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                    {loading ? "Buscando..." : "Buscar"}
                </Button>
            </div>

            {/* Results */}
            {hasSearched && (
                <div className="space-y-2">
                    {searchDate && (
                        <p className="text-sm text-gray-600 mb-3">
                            Médicos em <strong>{formatDisplayDate(searchDate)}</strong>:
                        </p>
                    )}

                    {doctors.length === 0 ? (
                        <p className="text-sm text-gray-500 py-4 text-center">
                            Nenhum médico encontrado para esta data.
                        </p>
                    ) : (
                        <div className="grid gap-2 max-h-[300px] overflow-y-auto">
                            {doctors.map((doctor, index) => (
                                <motion.div
                                    key={doctor.doctorId}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer hover:shadow-md ${doctor.status === "available"
                                        ? "border-green-200 bg-green-50/50 hover:bg-green-50"
                                        : doctor.status === "full"
                                            ? "border-purple-200 bg-purple-50/50 hover:bg-purple-50"
                                            : "border-gray-200 bg-gray-50/50 hover:bg-gray-50"
                                        }`}
                                    onClick={() => doctor.status !== "not_working" && onSelectDoctor(doctor.doctorId)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${doctor.status === "available"
                                            ? "bg-green-500"
                                            : doctor.status === "full"
                                                ? "bg-purple-500"
                                                : "bg-gray-400"
                                            }`}>
                                            <Users className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{doctor.doctorName}</p>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span>CRM: {doctor.crm}</span>
                                                {doctor.workStart && (
                                                    <>
                                                        <span>•</span>
                                                        <Clock className="w-3 h-3" />
                                                        <span>{doctor.workStart} - {doctor.workEnd}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {doctor.status !== "not_working" && (
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-gray-900">
                                                    {doctor.availableSlots}/{doctor.totalSlots}
                                                </p>
                                                <p className="text-xs text-gray-500">vagas livres</p>
                                            </div>
                                        )}
                                        {getStatusBadge(doctor.status)}
                                        {doctor.status !== "not_working" && (
                                            <ChevronRight className="w-5 h-5 text-gray-400" />
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DoctorsByDateSearch;
