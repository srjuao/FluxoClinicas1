import React, { useState, useEffect, FormEvent } from "react";
import { motion } from "framer-motion";
import { X, UserPlus, Key, Shield, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { supabase } from "@/lib/customSupabaseClient";
import type { UserRole } from "@/types/database.types";
import type { CreateUserModalProps } from "@/types/components.types";

const CreateUserModal: React.FC<CreateUserModalProps> = ({
  clinicId,
  onClose,
  onSuccess,
  userToEdit = null,
  doctorData = null,
}) => {
  const { createProfile, updateProfile } = useAuth();
  const isEdit = !!userToEdit;

  const [name, setName] = useState(userToEdit?.name || "");
  const [email, setEmail] = useState(userToEdit?.email || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(userToEdit?.role || "RECEPTIONIST");
  const [crm, setCrm] = useState(doctorData?.crm || "");
  const [specialties, setSpecialties] = useState(
    doctorData?.specialties?.join(", ") || ""
  );
  const [canPrescribeExams, setCanPrescribeExams] = useState(
    doctorData?.can_prescribe_exams || false
  );
  const [canPrescribeLenses, setCanPrescribeLenses] = useState(
    doctorData?.can_prescribe_lenses || false
  );
  const [canPrescribeUrologyExams, setCanPrescribeUrologyExams] = useState(
    doctorData?.can_prescribe_urology_exams || false
  );
  const [canPrescribeCardiologyExams, setCanPrescribeCardiologyExams] = useState(
    doctorData?.can_prescribe_cardiology_exams || false
  );
  const [doesUltrasoundExams, setDoesUltrasoundExams] = useState(
    doctorData?.does_ultrasound_exams || false
  );
  const [room, setRoom] = useState(doctorData?.room || "");
  const [isAdmin, setIsAdmin] = useState(userToEdit?.is_admin || false);
  const [hasFinancialAccess, setHasFinancialAccess] = useState(userToEdit?.has_financial_access || false);
  const [loading, setLoading] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [userLimitReached, setUserLimitReached] = useState(false);

  useEffect(() => {
    if (userToEdit) {
      setName(userToEdit.name || "");
      setEmail(userToEdit.email || "");
      setRole(userToEdit.role || "RECEPTIONIST");
      setIsAdmin(userToEdit.is_admin || false);
      setHasFinancialAccess(userToEdit?.has_financial_access || false);
      setCrm(doctorData?.crm || "");
      setSpecialties(doctorData?.specialties?.join(", ") || "");
      setCanPrescribeExams(doctorData?.can_prescribe_exams || false);
      setCanPrescribeLenses(doctorData?.can_prescribe_lenses || false);
      setCanPrescribeUrologyExams(doctorData?.can_prescribe_urology_exams || false);
      setCanPrescribeCardiologyExams(doctorData?.can_prescribe_cardiology_exams || false);
      setDoesUltrasoundExams(doctorData?.does_ultrasound_exams || false);
      setRoom(doctorData?.room || "");
    }
  }, [userToEdit]);

  useEffect(() => {
    const checkUserLimit = async () => {
      if (!clinicId || isEdit) return;

      try {
        // Fetch clinic details for max_users
        const { data: clinic, error: clinicError } = await supabase
          .from("clinics")
          .select("max_users")
          .eq("id", clinicId)
          .single();

        if (clinicError) throw clinicError;

        if (clinic?.max_users) {
          // Count existing users
          const { count, error: countError } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("clinic_id", clinicId);

          if (countError) throw countError;

          if (count !== null && count >= clinic.max_users) {
            setUserLimitReached(true);
            toast({
              title: "Limite de usuários atingido",
              description: "Você atingiu o limite de usuários do seu plano.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error("Error checking user limit:", error);
      }
    };

    checkUserLimit();
  }, [clinicId, isEdit]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEdit) {
        // Atualizar usuário existente
        const { error: updateError } = await updateProfile(userToEdit.id, {
          name,
          email,
          role,
          is_admin: isAdmin,
          has_financial_access: hasFinancialAccess,
        });

        if (updateError) throw updateError;

        // Se for médico, atualizar também a tabela doctors
        if (role === "DOCTOR" && doctorData?.id) {
          const { error: doctorUpdateError } = await supabase
            .from("doctors")
            .update({
              crm,
              specialties: specialties.split(",").map((s) => s.trim()).filter(Boolean),
              can_prescribe_exams: canPrescribeExams,
              can_prescribe_lenses: canPrescribeLenses,
              can_prescribe_urology_exams: canPrescribeUrologyExams,
              can_prescribe_cardiology_exams: canPrescribeCardiologyExams,
              does_ultrasound_exams: doesUltrasoundExams,
              room: room || null,
            })
            .eq("id", doctorData.id);

          if (doctorUpdateError) {
            console.error("Error updating doctor:", doctorUpdateError);
            throw doctorUpdateError;
          }
        }
      } else {
        // Criar novo usuário
        const trimmedEmail = email.trim();
        const profileData = { name, clinic_id: clinicId, role, is_admin: isAdmin, has_financial_access: hasFinancialAccess };

        console.log("DEBUG: Creating user with profileData:", profileData);

        const { user, error: signUpError } = await createProfile(
          trimmedEmail,
          password,
          profileData
        );

        if (signUpError) throw signUpError;
      }

      toast({
        title: isEdit ? "Usuário atualizado" : "Usuário criado com sucesso!",
        className: "bg-green-50 border-green-200",
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error saving user:", error);
      toast({
        title: "Erro ao salvar usuário",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center shadow-lg shadow-purple-200">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {isEdit ? "Editar Usuário" : "Novo Usuário"}
              </h2>
              <p className="text-sm text-gray-500">
                Preencha os dados do colaborador
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5 text-gray-500" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none"
                placeholder="Nome do colaborador"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none"
                placeholder="email@clinica.com"
                required
              />
            </div>
          </div>

          {!isEdit && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none"
                    placeholder="••••••••"
                    required={!isEdit}
                  />
                  <Key className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Senha
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none"
                  placeholder="••••••••"
                  required={!isEdit}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Função / Cargo
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none appearance-none bg-white"
            >
              <option value="RECEPTIONIST">Recepcionista</option>
              <option value="DOCTOR">Médico</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>

          <div className="space-y-4">
            {/* Admin Toggle */}
            <div
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${isAdmin ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}
              onClick={() => setIsAdmin(!isAdmin)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isAdmin ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Privilégios de Administrador</p>
                    <p className="text-xs text-gray-500">Acesso total ao sistema</p>
                  </div>
                </div>
                <div className={`w-12 h-6 rounded-full relative transition-colors ${isAdmin ? 'bg-purple-600' : 'bg-gray-300'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${isAdmin ? 'translate-x-7' : 'translate-x-1'}`} />
                </div>
              </div>
            </div>

            {/* Financial Access Toggle */}
            {!isAdmin && (
              <div
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${hasFinancialAccess ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
                onClick={() => setHasFinancialAccess(!hasFinancialAccess)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${hasFinancialAccess ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Acesso Financeiro (Caixa)</p>
                      <p className="text-xs text-gray-500">Permite movimentações do dia</p>
                    </div>
                  </div>
                  <div className={`w-12 h-6 rounded-full relative transition-colors ${hasFinancialAccess ? 'bg-green-600' : 'bg-gray-300'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${hasFinancialAccess ? 'translate-x-7' : 'translate-x-1'}`} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {role === "DOCTOR" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CRM
                </label>
                <input
                  type="text"
                  value={crm}
                  onChange={(e) => setCrm(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none"
                  placeholder="12345-SP"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Especialidades (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={specialties}
                  onChange={(e) => setSpecialties(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none"
                  placeholder="Cardiologia, Clínico Geral"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sala de Atendimento
                </label>
                <input
                  type="text"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none"
                  placeholder="Ex: Sala 1, Consultório 3"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Especialidade
                </label>

                {/* Toggle Oftalmologista */}
                <div
                  className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${canPrescribeExams && canPrescribeLenses
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-200 hover:border-gray-300"
                    }`}
                  onClick={() => {
                    const newValue = !(canPrescribeExams && canPrescribeLenses);
                    setCanPrescribeExams(newValue);
                    setCanPrescribeLenses(newValue);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">👁️</span>
                    <div>
                      <p className="font-medium text-gray-900">Oftalmologista</p>
                      <p className="text-xs text-gray-500">
                        Permite prescrever exames oftalmológicos e lentes
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div
                    className={`relative w-12 h-6 rounded-full transition-colors ${canPrescribeExams && canPrescribeLenses
                      ? "bg-purple-600"
                      : "bg-gray-300"
                      }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${canPrescribeExams && canPrescribeLenses
                        ? "translate-x-7"
                        : "translate-x-1"
                        }`}
                    />
                  </div>
                </div>

                {canPrescribeExams && canPrescribeLenses && (
                  <div className="flex items-center gap-2 text-xs text-purple-600 pl-2">
                    <span>✓ Exames oftalmológicos</span>
                    <span>•</span>
                    <span>✓ Prescrição de lentes</span>
                  </div>
                )}

                {/* Toggle Urologista */}
                <div
                  className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${canPrescribeUrologyExams
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                    }`}
                  onClick={() => setCanPrescribeUrologyExams(!canPrescribeUrologyExams)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🩺</span>
                    <div>
                      <p className="font-medium text-gray-900">Urologista</p>
                      <p className="text-xs text-gray-500">
                        Permite prescrever exames urológicos
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div
                    className={`relative w-12 h-6 rounded-full transition-colors ${canPrescribeUrologyExams
                      ? "bg-blue-600"
                      : "bg-gray-300"
                      }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${canPrescribeUrologyExams
                        ? "translate-x-7"
                        : "translate-x-1"
                        }`}
                    />
                  </div>
                </div>

                {canPrescribeUrologyExams && (
                  <div className="flex items-center gap-2 text-xs text-blue-600 pl-2">
                    <span>✓ Exames laboratoriais urológicos</span>
                    <span>•</span>
                    <span>✓ Exames de imagem</span>
                  </div>
                )}

                {/* Toggle Cardiologista */}
                <div
                  className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${canPrescribeCardiologyExams
                    ? "border-red-500 bg-red-50"
                    : "border-gray-200 hover:border-gray-300"
                    }`}
                  onClick={() => setCanPrescribeCardiologyExams(!canPrescribeCardiologyExams)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">❤️</span>
                    <div>
                      <p className="font-medium text-gray-900">Cardiologista</p>
                      <p className="text-xs text-gray-500">
                        Permite prescrever exames cardiológicos
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div
                    className={`relative w-12 h-6 rounded-full transition-colors ${canPrescribeCardiologyExams
                      ? "bg-red-600"
                      : "bg-gray-300"
                      }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${canPrescribeCardiologyExams
                        ? "translate-x-7"
                        : "translate-x-1"
                        }`}
                    />
                  </div>
                </div>

                {canPrescribeCardiologyExams && (
                  <div className="flex items-center gap-2 text-xs text-red-600 pl-2">
                    <span>✓ Exames laboratoriais cardiológicos</span>
                    <span>•</span>
                    <span>✓ Perfil lipídico e metabólico</span>
                  </div>
                )}

                {/* Toggle Ultrassonografista */}
                <div
                  className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${doesUltrasoundExams
                    ? "border-teal-500 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                    }`}
                  onClick={() => setDoesUltrasoundExams(!doesUltrasoundExams)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🔬</span>
                    <div>
                      <p className="font-medium text-gray-900">Realiza Exames de Ultrassom</p>
                      <p className="text-xs text-gray-500">
                        Habilita o médico para receber agendamentos de exames
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div
                    className={`relative w-12 h-6 rounded-full transition-colors ${doesUltrasoundExams
                      ? "bg-teal-600"
                      : "bg-gray-300"
                      }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${doesUltrasoundExams
                        ? "translate-x-7"
                        : "translate-x-1"
                        }`}
                    />
                  </div>
                </div>

                {doesUltrasoundExams && (
                  <div className="flex items-center gap-2 text-xs text-teal-600 pl-2">
                    <span>✓ Exames de ultrassonografia</span>
                    <span>•</span>
                    <span>✓ Agendamentos de exames</span>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 gradient-primary text-white"
              disabled={loading || (!isEdit && userLimitReached)}
            >
              {loading
                ? isEdit
                  ? "Atualizando..."
                  : "Criando..."
                : isEdit
                  ? "Atualizar Usuário"
                  : "Criar Usuário"}
            </Button>
          </div>
        </form >
      </motion.div >
    </div >
  );
};

export default CreateUserModal;
