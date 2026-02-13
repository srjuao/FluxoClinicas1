import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { X, Search, User, Phone, Loader2, MessageSquarePlus, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/customSupabaseClient";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { whatsappClient } from "@/lib/whatsappClient";
import { formatPhoneDisplay } from "@/lib/whatsappUtils";
import type { Patient } from "@/types/database.types";

type Tab = "patients" | "whatsapp";

interface WhatsAppContact {
  jid: string;
  name?: string;
  notify?: string;
  phone?: string;
}

interface NewChatModalProps {
  onSelectContact: (phone: string, name?: string) => void;
  onClose: () => void;
}

export function NewChatModal({ onSelectContact, onClose }: NewChatModalProps) {
  const { profile } = useAuth();
  const clinicId = profile?.clinic_id;

  const [tab, setTab] = useState<Tab>("patients");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [waContacts, setWaContacts] = useState<WhatsAppContact[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [searching, setSearching] = useState(false);
  const [manualPhone, setManualPhone] = useState("");
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load recent patients
  const loadPatients = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .eq("clinic_id", clinicId)
      .not("telefone", "is", null)
      .order("name")
      .limit(50);

    if (!error) {
      setPatients(data || []);
    }
    setLoading(false);
  }, [clinicId]);

  // Load WhatsApp contacts
  const loadWaContacts = useCallback(async () => {
    setLoadingContacts(true);
    try {
      const { contacts } = await whatsappClient.getContacts();
      setWaContacts(contacts || []);
    } catch {
      setWaContacts([]);
    }
    setLoadingContacts(false);
  }, []);

  // Debounced patient search
  const searchPatients = useCallback(
    async (term: string) => {
      if (!clinicId) return;

      if (!term || term.length < 2) {
        loadPatients();
        setSearching(false);
        return;
      }

      setSearching(true);
      const cleaned = term.replace(/\D/g, "");
      const isNumeric = cleaned.length >= 3;

      let query = supabase
        .from("patients")
        .select("*")
        .eq("clinic_id", clinicId);

      if (isNumeric) {
        query = query.or(
          `telefone.ilike.%${cleaned}%,name.ilike.%${term}%`
        );
      } else {
        query = query.ilike("name", `%${term}%`);
      }

      const { data, error } = await query.order("name").limit(50);

      if (!error) {
        setPatients(data || []);
      }
      setSearching(false);
    },
    [clinicId, loadPatients]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value);
      if (tab === "patients") {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(() => {
          searchPatients(value);
        }, 300);
      }
    },
    [searchPatients, tab]
  );

  // Filter WhatsApp contacts client-side
  const filteredWaContacts = useMemo(() => {
    if (!searchTerm.trim()) return waContacts;
    const q = searchTerm.toLowerCase();
    return waContacts.filter((c) => {
      const name = (c.name || c.notify || "").toLowerCase();
      const phone = c.phone || "";
      return name.includes(q) || phone.includes(q);
    });
  }, [waContacts, searchTerm]);

  useEffect(() => {
    loadPatients();
    loadWaContacts();
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [loadPatients, loadWaContacts]);

  const handleSelectPatient = (patient: Patient) => {
    if (!patient.telefone) return;
    const cleaned = patient.telefone.replace(/\D/g, "");
    onSelectContact(cleaned, patient.name);
  };

  const handleSelectWaContact = (contact: WhatsAppContact) => {
    const phone = contact.phone || contact.jid.split("@")[0];
    const name = contact.name || contact.notify;
    onSelectContact(phone, name);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPhone.trim()) return;
    onSelectContact(manualPhone.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Nova Conversa
            </h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Manual phone input */}
        <div className="p-3 border-b bg-gray-50">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Digitar número (ex: 11999998888)"
                value={manualPhone}
                onChange={(e) => setManualPhone(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={!manualPhone.trim()}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              Iniciar
            </Button>
          </form>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setTab("patients")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
              tab === "patients"
                ? "text-green-600 border-b-2 border-green-500"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <User className="w-4 h-4" />
            Pacientes
          </button>
          <button
            onClick={() => setTab("whatsapp")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
              tab === "whatsapp"
                ? "text-green-600 border-b-2 border-green-500"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
            {waContacts.length > 0 && (
              <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                {waContacts.length}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={
                tab === "patients"
                  ? "Buscar paciente por nome ou telefone..."
                  : "Buscar contato por nome ou número..."
              }
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-9 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            {searching && tab === "patients" && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 animate-spin" />
            )}
          </div>
        </div>

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto">
          {tab === "patients" ? (
            // Patients tab
            loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-green-500" />
              </div>
            ) : patients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500 px-4">
                <User className="w-10 h-10 mb-2 text-gray-300" />
                <p className="text-sm text-center">
                  {searchTerm
                    ? "Nenhum paciente encontrado"
                    : "Nenhum paciente com telefone cadastrado"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {patients.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => handleSelectPatient(patient)}
                    disabled={!patient.telefone}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm truncate">
                        {patient.name}
                      </div>
                      {patient.telefone ? (
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {formatPhoneDisplay(patient.telefone)}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 italic">
                          Sem telefone
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : (
            // WhatsApp contacts tab
            loadingContacts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-green-500" />
              </div>
            ) : filteredWaContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500 px-4">
                <MessageCircle className="w-10 h-10 mb-2 text-gray-300" />
                <p className="text-sm text-center">
                  {searchTerm
                    ? "Nenhum contato encontrado"
                    : "Nenhum contato do WhatsApp disponível"}
                </p>
                <p className="text-xs text-center mt-1 text-gray-400">
                  Contatos são sincronizados ao conectar o WhatsApp
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredWaContacts.map((contact) => (
                  <button
                    key={contact.jid}
                    onClick={() => handleSelectWaContact(contact)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm truncate">
                        {contact.name || contact.notify || formatPhoneDisplay(contact.phone || "")}
                      </div>
                      {contact.phone && (
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {formatPhoneDisplay(contact.phone)}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
