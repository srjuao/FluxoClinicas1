import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Building2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import type { Clinic } from '@/types/database.types';

interface EditClinicModalProps {
  clinic: Clinic;
  onClose: () => void;
  onSuccess: () => void;
}

const EditClinicModal: React.FC<EditClinicModalProps> = ({ clinic, onClose, onSuccess }) => {
  const [name, setName] = useState(clinic.name);
  const [cnpj, setCnpj] = useState(clinic.cnpj || '');
  const [maxUsers, setMaxUsers] = useState(clinic.max_users?.toString() || '');
  const [isActive, setIsActive] = useState(clinic.is_active ?? true);
  const [loading, setLoading] = useState(false);
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    const fetchUserCount = async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinic.id);
      
      if (!error && count !== null) {
        setUserCount(count);
      }
    };
    fetchUserCount();
  }, [clinic.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('clinics')
      .update({ 
        name, 
        cnpj,
        is_active: isActive,
        max_users: maxUsers ? parseInt(maxUsers) : null
      })
      .eq('id', clinic.id);
    
    if (error) {
      toast({
        title: "Erro ao atualizar clínica",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Clínica atualizada com sucesso! ✓",
        description: `${name} foi atualizada`,
      });
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-effect rounded-2xl p-6 w-full max-w-md"
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Editar Clínica</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info de usuários */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center space-x-3">
          <Users className="w-5 h-5 text-blue-600" />
          <span className="text-sm text-blue-700">
            <strong>{userCount}</strong> usuário(s) cadastrado(s) nesta clínica
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome da Clínica
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
              CNPJ
            </label>
            <input
              type="text"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none"
              placeholder="00.000.000/0000-00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Limite de Usuários (deixe vazio para ilimitado)
            </label>
            <input
              type="number"
              value={maxUsers}
              onChange={(e) => setMaxUsers(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none"
              placeholder="Ex: 10"
              min="1"
            />
            {maxUsers && userCount > parseInt(maxUsers) && (
              <p className="text-xs text-amber-600 mt-1">
                ⚠️ A clínica já possui mais usuários que o novo limite
              </p>
            )}
          </div>

          <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <div>
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer">
                Clínica Ativa
              </label>
              <p className="text-xs text-gray-500">
                {isActive 
                  ? 'Usuários podem fazer login normalmente' 
                  : 'Usuários não conseguirão acessar o sistema'}
              </p>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button type="button" onClick={onClose} variant="outline" className="flex-1" disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 gradient-primary text-white" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default EditClinicModal;

