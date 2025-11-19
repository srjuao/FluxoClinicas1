import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Building2, Users, Calendar, LogOut, UserPlus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import CreateUserModal from '@/components/CreateUserModal';
import ManageWorkHoursModal from '@/components/ManageWorkHoursModal';
import ClinicCalendar from '@/components/ClinicCalendar';

const ClinicAdminDashboard = () => {
      const { signOut, profile } = useAuth();
      const [users, setUsers] = useState([]);
      const [doctors, setDoctors] = useState([]);
      const [showCreateUser, setShowCreateUser] = useState(false);
      const [selectedUser, setSelectedUser] = useState(null);
      const [showWorkHours, setShowWorkHours] = useState(false);
      const [selectedDoctor, setSelectedDoctor] = useState(null);

      const clinicId = profile?.clinic_id;

      const loadData = useCallback(async () => {
            if (!clinicId) return;

            const { data: usersData, error: usersError } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('clinic_id', clinicId);

            if (usersError) {
                  toast({ title: 'Erro ao carregar usuários', description: usersError.message, variant: 'destructive' });
            } else {
                  setUsers(usersData);
            }

            const { data: doctorsData, error: doctorsError } = await supabase
                  .from('doctors')
                  .select('*, profile:profiles(name)')
                  .eq('clinic_id', clinicId);

            if (doctorsError) {
                  toast({ title: 'Erro ao carregar médicos', description: doctorsError.message, variant: 'destructive' });
            } else {
                  setDoctors(doctorsData);
            }
      }, [clinicId]);

      useEffect(() => {
            loadData();
      }, [loadData]);

      const handleManageWorkHours = (doctor) => {
            setSelectedDoctor(doctor);
            setShowWorkHours(true);
      };

      const handleDeleteUser = async (user) => {
            const confirmDelete = window.confirm(`Tem certeza que deseja excluir ${user.name}?`);
            if (!confirmDelete) return;

            try {
                  if (user.role === 'DOCTOR') {
                        const { error: doctorError } = await supabase
                              .from('doctors')
                              .delete()
                              .eq('user_id', user.id);
                        if (doctorError) throw doctorError;
                  }

                  const { error: userError } = await supabase
                        .from('profiles')
                        .delete()
                        .eq('id', user.id);
                  if (userError) throw userError;

                  toast({ title: 'Usuário excluído com sucesso!' });
                  loadData();
            } catch (error) {
                  toast({ title: 'Erro ao excluir usuário', description: error.message, variant: 'destructive' });
            }
      };

      return (
            <>
                  <Helmet>
                        <title>Admin - {profile?.clinic?.name}</title>
                        <meta name="description" content="Painel administrativo da clínica" />
                  </Helmet>

                  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50">
                        <nav className="glass-effect border-b border-white/20">
                              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                    <div className="flex justify-between items-center h-16">
                                          <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
                                                      <Building2 className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                      <h1 className="text-lg font-bold text-gray-900">{profile?.clinic?.name}</h1>
                                                      <p className="text-xs text-gray-600">{profile?.name} - Admin</p>
                                                </div>
                                          </div>

                                          <Button
                                                onClick={signOut}
                                                variant="outline"
                                                className="flex items-center space-x-2"
                                          >
                                                <LogOut className="w-4 h-4" />
                                                <span>Sair</span>
                                          </Button>
                                    </div>
                              </div>
                        </nav>

                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                              <Tabs defaultValue="calendar" className="space-y-6">
                                    <TabsList className="glass-effect p-1">
                                          <TabsTrigger value="calendar" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
                                                <Calendar className="w-4 h-4 mr-2" />
                                                Calendário
                                          </TabsTrigger>
                                          <TabsTrigger value="users" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
                                                <Users className="w-4 h-4 mr-2" />
                                                Usuários
                                          </TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="calendar">
                                          <ClinicCalendar clinicId={clinicId} />
                                    </TabsContent>

                                    <TabsContent value="users">
                                          <div className="space-y-6">
                                                <div className="flex justify-between items-center">
                                                      <h2 className="text-2xl font-bold text-gray-900">Equipe da Clínica</h2>
                                                      <Button
                                                            onClick={() => {
                                                                  setSelectedUser(null);
                                                                  setShowCreateUser(true);
                                                            }}
                                                            className="gradient-primary text-white"
                                                      >
                                                            <UserPlus className="w-4 h-4 mr-2" />
                                                            Novo Usuário
                                                      </Button>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                      {users.map((u, index) => {
                                                            const doctor = doctors.find(d => d.user_id === u.id);

                                                            return (
                                                                  <motion.div
                                                                        key={u.id}
                                                                        initial={{ opacity: 0, y: 20 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        transition={{ delay: index * 0.1 }}
                                                                        className="glass-effect rounded-xl p-4"
                                                                  >
                                                                        <div className="flex items-start justify-between mb-3">
                                                                              <div>
                                                                                    <h3 className="font-semibold text-gray-900">{u.name}</h3>
                                                                                    <p className="text-sm text-gray-600">{u.email}</p>
                                                                              </div>
                                                                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${u.role === 'DOCTOR' ? 'bg-blue-100 text-blue-700' :
                                                                                    u.role === 'RECEPTIONIST' ? 'bg-green-100 text-green-700' :
                                                                                          'bg-purple-100 text-purple-700'
                                                                                    }`}>
                                                                                    {u.role === 'DOCTOR' ? 'Médico' :
                                                                                          u.role === 'RECEPTIONIST' ? 'Recepção' : 'Admin'}
                                                                              </span>
                                                                        </div>

                                                                        {doctor && (
                                                                              <p className="text-xs text-gray-600 mb-2">CRM: {doctor.crm}</p>
                                                                        )}

                                                                        <div className="flex space-x-2 mt-2">
                                                                              {doctor && (
                                                                                    <Button
                                                                                          onClick={() => handleManageWorkHours(doctor)}
                                                                                          variant="outline"
                                                                                          size="sm"
                                                                                          className="flex-1"
                                                                                    >
                                                                                          <Clock className="w-3 h-3 mr-2" />
                                                                                          Horários
                                                                                    </Button>
                                                                              )}

                                                                              <Button
                                                                                    onClick={() => {
                                                                                          setSelectedUser(u);
                                                                                          setShowCreateUser(true);
                                                                                    }}
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    className="flex-1"
                                                                              >
                                                                                    Editar
                                                                              </Button>

                                                                              <Button
                                                                                    onClick={() => handleDeleteUser(u)}
                                                                                    variant="destructive"
                                                                                    size="sm"
                                                                                    className="flex-1"
                                                                              >
                                                                                    Excluir
                                                                              </Button>
                                                                        </div>
                                                                  </motion.div>
                                                            );
                                                      })}
                                                </div>
                                          </div>
                                    </TabsContent>
                              </Tabs>
                        </div>
                  </div>

                  {showCreateUser && (
                        <CreateUserModal
                              clinicId={clinicId}
                              userToEdit={selectedUser}
                              onClose={() => {
                                    setShowCreateUser(false);
                                    setSelectedUser(null);
                              }}
                              onSuccess={() => {
                                    loadData();
                                    setShowCreateUser(false);
                                    setSelectedUser(null);
                              }}
                        />
                  )}

                  {showWorkHours && selectedDoctor && (
                        <ManageWorkHoursModal
                              doctor={selectedDoctor}
                              clinicId={clinicId}
                              onClose={() => {
                                    setShowWorkHours(false);
                                    setSelectedDoctor(null);
                              }}
                        />
                  )}
            </>
      );
};

export default ClinicAdminDashboard;
