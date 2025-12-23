import { useState, useEffect } from "react";
import { supabase } from "@/lib/customSupabaseClient";

interface DoctorWithProfile {
    user_id: string;
    crm: string;
    name: string;
    id: string;
}

interface DoctorAutocompleteProps {
    clinicId: string;
    selectedDoctor: string | null;
    setSelectedDoctor: (doctorId: string | null) => void;
}

const DoctorAutocomplete: React.FC<DoctorAutocompleteProps> = ({
    clinicId,
    selectedDoctor,
    setSelectedDoctor,
}) => {
    const [doctors, setDoctors] = useState<DoctorWithProfile[]>([]);
    const [query, setQuery] = useState("");
    const [filteredDoctors, setFilteredDoctors] = useState<DoctorWithProfile[]>(
        []
    );
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        if (!clinicId) return;

        const fetchDoctors = async () => {
            const { data: doctorsData, error: doctorsError } = await supabase
                .from("doctors")
                .select("user_id, crm, id")
                .eq("clinic_id", clinicId);

            if (doctorsError) return console.error(doctorsError);

            const userIds = doctorsData.map((d: { user_id: string }) => d.user_id);
            if (!userIds.length) return setDoctors([]);

            const { data: profilesData } = await supabase
                .from("profiles")
                .select("id, name")
                .in("id", userIds);

            const merged = doctorsData.map((d: { user_id: string; crm: string }) => {
                const profile = profilesData?.find(
                    (p: { id: string; name: string }) => p.id === d.user_id
                );
                return { ...d, name: profile?.name || "Sem nome" };
            });

            setDoctors(merged);
            setFilteredDoctors(merged);
        };

        fetchDoctors();
    }, [clinicId]);

    useEffect(() => {
        const filtered = doctors.filter((d) =>
            d.name.toLowerCase().includes(query.toLowerCase())
        );
        setFilteredDoctors(filtered);
    }, [query, doctors]);

    return (
        <div className="relative w-64">
            <input
                type="text"
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Filtrar médico"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none text-sm"
            />

            {showDropdown && (
                <ul className="absolute z-10 bg-white border border-gray-200 w-full mt-1 max-h-40 overflow-y-auto rounded-lg shadow">
                    <li
                        className="px-3 py-2 hover:bg-purple-100 cursor-pointer text-sm"
                        onClick={() => {
                            setSelectedDoctor(null);
                            setQuery("");
                            setShowDropdown(false);
                        }}
                    >
                        Todos os médicos
                    </li>
                    {filteredDoctors.map((d) => (
                        <li
                            key={d.user_id}
                            className="px-3 py-2 hover:bg-purple-100 cursor-pointer text-sm"
                            onClick={() => {
                                setSelectedDoctor(d.id);
                                setQuery(d.name);
                                setShowDropdown(false);
                            }}
                        >
                            {d.name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default DoctorAutocomplete;
