import React, { useState, useEffect, FormEvent } from "react";
import { motion } from "framer-motion";
import { X, UserPlus, Key, AlertCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import type { UserRole } from "@/types/database.types";
import type { CreateUserModalProps } from "@/types/components.types";

const CreateUserModal: React.FC<CreateUserModalProps> = ({
  clinicId,
  onClose,
  onSuccess,
  userToEdit = null,
  doctorData = null,
}) => {
  const { createProfile, updateUserPassword } = useAuth();
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
  const [loading, setLoading] = useState(false);
  const [showPasswordEdit, setShowPasswordEdit] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [userLimitReached, setUserLimitReached] = useState(false);
  const [userLimitInfo, setUserLimitInfo] = useState<{ current: number; max: number | null } | null>(null);

  useEffect(() => {
    if (userToEdit) {
      setName(userToEdit.name || "");
      setEmail(userToEdit.email || "");
      setRole(userToEdit.role || "RECEPTIONIST");
      setIsAdmin(userToEdit.is_admin || false);
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

  // Verificar limite de usuários da clínica
  useEffect(() => {
    const checkUserLimit = async () => {
      if (isEdit || !clinicId) return;

      // Buscar dados da clínica
      const { data: clinic } = await supabase
        .from("clinics")
        .select("max_users")
        .eq("id", clinicId)
        .single();

      if (!clinic?.max_users) {
        setUserLimitReached(false);
        setUserLimitInfo(null);
        return;
      }

      // Contar usuários atuais
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("clinic_id", clinicId);

      const currentCount = count || 0;
      setUserLimitInfo({ current: currentCount, max: clinic.max_users });
      setUserLimitReached(currentCount >= clinic.max_users);
    };

    checkUserLimit();
  }, [clinicId, isEdit]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    if (isEdit) {
      // Atualizar usuário existente
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ name, email, role, is_admin: isAdmin })
        .eq("id", userToEdit.id);

      if (updateError) {
        toast({
          title: "Erro ao atualizar usuário",
          description: updateError.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Atualizar senha se solicitado
      if (showPasswordEdit && newPassword) {
        if (newPassword !== confirmPassword) {
          toast({
            title: "Erro ao atualizar senha",
            description: "As senhas não coincidem",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        if (newPassword.length < 6) {
          toast({
            title: "Erro ao atualizar senha",
            description: "A senha deve ter no mínimo 6 caracteres",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const { error: passwordError } = await updateUserPassword(
          userToEdit.id,
          newPassword
        );

        if (passwordError) {
          setLoading(false);
          return;
        }
      }

      if (role === "DOCTOR") {
        const { error: doctorError } = await supabase.from("doctors").upsert(
          {
            user_id: userToEdit.id,
            clinic_id: clinicId,
            crm,
            specialties: specialties.split(",").map((s) => s.trim()),
            can_prescribe_exams: canPrescribeExams,
            can_prescribe_lenses: canPrescribeLenses,
            can_prescribe_urology_exams: canPrescribeUrologyExams,
            can_prescribe_cardiology_exams: canPrescribeCardiologyExams,
            does_ultrasound_exams: doesUltrasoundExams,
            room: room || null,
          },
          { onConflict: ["user_id"] }
        );

        if (doctorError) {
          toast({
            title: "Erro ao atualizar dados do médico",
            description: doctorError.message,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      toast({ title: "Usuário atualizado com sucesso!" });
      onSuccess();
      setLoading(false);
      return;
    }

    // Criar novo usuário
    // Verificar limite novamente antes de criar
    if (userLimitReached) {
      toast({
        title: "Limite de usuários atingido",
        description: "Esta clínica atingiu o limite máximo de usuários permitidos.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const trimmedEmail = email.trim();
    const profileData = { name, clinic_id: clinicId, role, is_admin: isAdmin };

    const { user, error: signUpError } = await createProfile(
      trimmedEmail,
      password,
      profileData
    );

    if (signUpError) {
      toast({
        title: "Erro ao criar usuário",
        description: signUpError.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (user && role === "DOCTOR") {
      const { error: doctorError } = await supabase.from("doctors").insert({
        user_id: user.id,
        clinic_id: clinicId,
        crm,
        specialties: specialties.split(",").map((s) => s.trim()),
        can_prescribe_exams: canPrescribeExams,
        can_prescribe_lenses: canPrescribeLenses,
        can_prescribe_urology_exams: canPrescribeUrologyExams,
        can_prescribe_cardiology_exams: canPrescribeCardiologyExams,
        does_ultrasound_exams: doesUltrasoundExams,
        room: room || null,
      });

      if (doctorError) {
        toast({
          title: "Erro ao criar dados do médico",
          description: doctorError.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
    }

    toast({
      title: "Usuário criado com sucesso! 🎉",
      description: `${name} foi adicionado à equipe`,
    });
    onSuccess();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-effect rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {isEdit ? "Editar Usuário" : "Novo Usuário"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aviso de limite de usuários */}
        {!isEdit && userLimitReached && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700">
                Limite de usuários atingido
              </p>
              <p className="text-xs text-red-600">
                Esta clínica já possui {userLimitInfo?.current}/{userLimitInfo?.max} usuários.
                Entre em contato com o administrador para aumentar o limite.
              </p>
            </div>
          </div>
        )}

        {/* Info de limite (quando não atingido) */}
        {!isEdit && userLimitInfo && !userLimitReached && (
          <div className="mb-4 p-2 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-600 text-center">
              {userLimitInfo.current}/{userLimitInfo.max} usuários cadastrados
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome Completo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none"
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
              required
              disabled={isEdit} // não permite editar email
            />
          </div>

          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha (mínimo 6 caracteres)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none"
                required
              />
            </div>
          )}

          {isEdit && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowPasswordEdit(!showPasswordEdit)}
                className="flex items-center space-x-2 text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
              >
                <Key className="w-4 h-4" />
                <span>
                  {showPasswordEdit ? "Cancelar alteração de senha" : "Alterar senha"}
                </span>
              </button>

              {showPasswordEdit && (
                <div className="space-y-3 p-3 rounded-lg bg-purple-50 border border-purple-100">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nova Senha (mínimo 6 caracteres)
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none"
                      placeholder="Digite a nova senha"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirmar Nova Senha
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none"
                      placeholder="Confirme a nova senha"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Função
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none"
            >
              <option value="RECEPTIONIST">Recepcionista</option>
              <option value="DOCTOR">Médico</option>
            </select>
          </div>

          {/* Privilégios de Administrador */}
          <div className="p-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-all">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setIsAdmin(!isAdmin)}
            >
              <div className="flex items-center gap-3">
                <Shield className={`w-5 h-5 ${isAdmin ? "text-purple-600" : "text-gray-400"}`} />
                <div>
                  <p className="font-medium text-gray-900">Privilégios de Administrador</p>
                  <p className="text-xs text-gray-500">
                    Permite gerenciar usuários, horários e visualizar calendário da clínica
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <div
                className={`relative w-12 h-6 rounded-full transition-colors ${isAdmin
                  ? "bg-purple-600"
                  : "bg-gray-300"
                  }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isAdmin
                    ? "translate-x-7"
                    : "translate-x-1"
                    }`}
                />
              </div>
            </div>

            {isAdmin && (
              <div className="mt-2 pl-8 text-xs text-purple-600 space-y-1">
                <p>✓ Gerenciar usuários da clínica</p>
                <p>✓ Configurar horários de trabalho</p>
                <p>✓ Visualizar calendário completo</p>
                <p>✓ Editar senhas de usuários</p>
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
        </form>
      </motion.div>
    </div>
  );
};

export default CreateUserModal;
