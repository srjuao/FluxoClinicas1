
import React, { useState } from 'react';
    import { motion } from 'framer-motion';
    import { X, UserPlus } from 'lucide-react';
    import { Button } from '@/components/ui/button';
    import { toast } from '@/components/ui/use-toast';
    import { useAuth } from '@/contexts/SupabaseAuthContext';

    const CreateClinicAdminModal = ({ clinic, onClose, onSuccess }) => {
      const { createProfile } = useAuth();
      const [name, setName] = useState('');
      const [email, setEmail] = useState('');
      const [password, setPassword] = useState('');
      const [loading, setLoading] = useState(false);

      const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const trimmedEmail = email.trim();
        const profileData = {
          name,
          clinic_id: clinic.id,
          role: 'CLINIC_ADMIN',
        };

        const { error } = await createProfile(trimmedEmail, password, profileData);

        if (!error) {
          toast({
            title: "Admin criado com sucesso! 🎉",
            description: `${name} agora é administrador de ${clinic.name}`,
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
                  <UserPlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Novo Admin</h2>
                  <p className="text-sm text-gray-600">{clinic.name}</p>
                </div>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
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
                />
              </div>

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

              <div className="flex space-x-3 pt-4">
                <Button type="button" onClick={onClose} variant="outline" className="flex-1" disabled={loading}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 gradient-primary text-white" disabled={loading}>
                  {loading ? 'Criando...' : 'Criar Admin'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      );
    };

    export default CreateClinicAdminModal;
