import React, { useState, useEffect, FormEvent } from "react";
import { motion } from "framer-motion";
import { X, UserPlus } from "lucide-react";
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
  const { createProfile } = useAuth();
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userToEdit) {
      setName(userToEdit.name || "");
      setEmail(userToEdit.email || "");
      setRole(userToEdit.role || "RECEPTIONIST");
      setCrm(doctorData?.crm || "");
      setSpecialties(doctorData?.specialties?.join(", ") || "");
      setCanPrescribeExams(doctorData?.can_prescribe_exams || false);
      setCanPrescribeLenses(doctorData?.can_prescribe_lenses || false);
    }
  }, [userToEdit]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    if (isEdit) {
      // Atualizar usuário existente
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ name, email, role })
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

      if (role === "DOCTOR") {
        const { error: doctorError } = await supabase.from("doctors").upsert(
          {
            user_id: userToEdit.id,
            clinic_id: clinicId,
            crm,
            specialties: specialties.split(",").map((s) => s.trim()),
            can_prescribe_exams: canPrescribeExams,
            can_prescribe_lenses: canPrescribeLenses,
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
    const trimmedEmail = email.trim();
    const profileData = { name, clinic_id: clinicId, role };

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

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Permissões
                </label>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="canPrescribeExams"
                    checked={canPrescribeExams}
                    onChange={(e) => setCanPrescribeExams(e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <label
                    htmlFor="canPrescribeExams"
                    className="text-sm text-gray-700 cursor-pointer"
                  >
                    Pode prescrever exames
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="canPrescribeLenses"
                    checked={canPrescribeLenses}
                    onChange={(e) => setCanPrescribeLenses(e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <label
                    htmlFor="canPrescribeLenses"
                    className="text-sm text-gray-700 cursor-pointer"
                  >
                    Pode prescrever lentes
                  </label>
                </div>
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
              disabled={loading}
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
