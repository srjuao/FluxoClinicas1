import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  Percent,
  Building2,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  CreditCard,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import FinancialDashboard from "@/components/FinancialDashboard";
import type {
  DoctorPricing,
  ClinicCommission,
  InsurancePlan,
  DoctorWithProfileName,
  Clinic,
} from "@/types/database.types";

interface FinancialManagementProps {
  clinicId: string;
}

const FinancialManagement: React.FC<FinancialManagementProps> = ({
  clinicId,
}) => {
  const [doctors, setDoctors] = useState<DoctorWithProfileName[]>([]);
  const [pricing, setPricing] = useState<DoctorPricing[]>([]);
  const [commissions, setCommissions] = useState<ClinicCommission[]>([]);
  const [insurancePlans, setInsurancePlans] = useState<InsurancePlan[]>([]);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);

  // Estados para edição
  const [editingPricing, setEditingPricing] = useState<string | null>(null);
  const [editingCommission, setEditingCommission] = useState<string | null>(null);
  const [editingInsurance, setEditingInsurance] = useState<string | null>(null);
  const [editingDefaultCommission, setEditingDefaultCommission] = useState(false);

  // Estados para novos valores
  const [newPricingValue, setNewPricingValue] = useState("");
  const [newCommissionValue, setNewCommissionValue] = useState("");
  const [newInsuranceName, setNewInsuranceName] = useState("");
  const [newInsuranceDiscount, setNewInsuranceDiscount] = useState("");
  const [newDefaultCommission, setNewDefaultCommission] = useState("");

  const loadData = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);

    try {
      // Carregar dados da clínica
      const { data: clinicData, error: clinicError } = await supabase
        .from("clinics")
        .select("*")
        .eq("id", clinicId)
        .single();

      if (clinicError) throw clinicError;
      setClinic(clinicData);
      setNewDefaultCommission((clinicData?.default_commission_percentage ?? 30).toString());

      // Carregar médicos
      const { data: doctorsData, error: doctorsError } = await supabase
        .from("doctors")
        .select("*, profile:profiles(name)")
        .eq("clinic_id", clinicId);

      if (doctorsError) throw doctorsError;
      setDoctors((doctorsData as DoctorWithProfileName[]) || []);

      // Carregar preços
      const { data: pricingData, error: pricingError } = await supabase
        .from("doctor_pricing")
        .select("*")
        .eq("clinic_id", clinicId);

      if (pricingError) throw pricingError;
      setPricing(pricingData || []);

      // Carregar comissões
      const { data: commissionsData, error: commissionsError } = await supabase
        .from("clinic_commission")
        .select("*")
        .eq("clinic_id", clinicId);

      if (commissionsError) throw commissionsError;
      setCommissions(commissionsData || []);

      // Carregar convênios
      const { data: insuranceData, error: insuranceError } = await supabase
        .from("insurance_plans")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("name");

      if (insuranceError) throw insuranceError;
      setInsurancePlans(insuranceData || []);
    } catch (error) {
      toast({
        title: "Erro ao carregar dados financeiros",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  // Salvar comissão padrão da clínica
  const handleSaveDefaultCommission = async () => {
    const percentage = parseFloat(newDefaultCommission);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      toast({
        title: "Porcentagem inválida",
        description: "Digite um valor entre 0 e 100",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("clinics")
        .update({ default_commission_percentage: percentage })
        .eq("id", clinicId);

      if (error) throw error;

      toast({ title: "Comissão padrão salva com sucesso!" });
      setEditingDefaultCommission(false);
      loadData();
    } catch (error) {
      toast({
        title: "Erro ao salvar comissão padrão",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };


  useEffect(() => {
    loadData();
  }, [loadData]);

  // Funções para preços
  const handleSavePricing = async (doctorId: string) => {
    const value = parseFloat(newPricingValue);
    if (isNaN(value) || value < 0) {
      toast({
        title: "Valor inválido",
        description: "Digite um valor válido",
        variant: "destructive",
      });
      return;
    }

    try {
      const existing = pricing.find((p) => p.doctor_id === doctorId);

      if (existing) {
        const { error } = await supabase
          .from("doctor_pricing")
          .update({ consultation_value: value })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("doctor_pricing").insert({
          doctor_id: doctorId,
          clinic_id: clinicId,
          consultation_value: value,
        });

        if (error) throw error;
      }

      toast({ title: "Valor salvo com sucesso!" });
      setEditingPricing(null);
      setNewPricingValue("");
      loadData();
    } catch (error) {
      toast({
        title: "Erro ao salvar valor",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  // Funções para comissões
  const handleSaveCommission = async (doctorId: string) => {
    const percentage = parseFloat(newCommissionValue);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      toast({
        title: "Porcentagem inválida",
        description: "Digite um valor entre 0 e 100",
        variant: "destructive",
      });
      return;
    }

    try {
      const existing = commissions.find((c) => c.doctor_id === doctorId);

      if (existing) {
        const { error } = await supabase
          .from("clinic_commission")
          .update({ commission_percentage: percentage })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("clinic_commission").insert({
          doctor_id: doctorId,
          clinic_id: clinicId,
          commission_percentage: percentage,
        });

        if (error) throw error;
      }

      toast({ title: "Comissão salva com sucesso!" });
      setEditingCommission(null);
      setNewCommissionValue("");
      loadData();
    } catch (error) {
      toast({
        title: "Erro ao salvar comissão",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  // Funções para convênios
  const handleSaveInsurance = async () => {
    if (!newInsuranceName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite o nome do convênio",
        variant: "destructive",
      });
      return;
    }

    const discount = parseFloat(newInsuranceDiscount);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      toast({
        title: "Desconto inválido",
        description: "Digite um valor entre 0 e 100",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingInsurance) {
        const { error } = await supabase
          .from("insurance_plans")
          .update({
            name: newInsuranceName,
            discount_percentage: discount,
          })
          .eq("id", editingInsurance);

        if (error) throw error;
        toast({ title: "Convênio atualizado com sucesso!" });
      } else {
        const { error } = await supabase.from("insurance_plans").insert({
          clinic_id: clinicId,
          name: newInsuranceName,
          discount_percentage: discount,
          is_active: true,
        });

        if (error) throw error;
        toast({ title: "Convênio criado com sucesso!" });
      }

      setEditingInsurance(null);
      setNewInsuranceName("");
      setNewInsuranceDiscount("");
      loadData();
    } catch (error) {
      toast({
        title: "Erro ao salvar convênio",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleDeleteInsurance = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este convênio?")) return;

    try {
      const { error } = await supabase
        .from("insurance_plans")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Convênio excluído com sucesso!" });
      loadData();
    } catch (error) {
      toast({
        title: "Erro ao excluir convênio",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleToggleInsurance = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("insurance_plans")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      loadData();
    } catch (error) {
      toast({
        title: "Erro ao atualizar convênio",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const getPricingForDoctor = (doctorId: string) => {
    return pricing.find((p) => p.doctor_id === doctorId);
  };

  const getCommissionForDoctor = (doctorId: string) => {
    return commissions.find((c) => c.doctor_id === doctorId);
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        Carregando dados financeiros...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="glass-effect p-1">
          <TabsTrigger
            value="dashboard"
            className="data-[state=active]:gradient-primary data-[state=active]:text-white"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger
            value="pricing"
            className="data-[state=active]:gradient-primary data-[state=active]:text-white"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Valores de Consulta
          </TabsTrigger>
          <TabsTrigger
            value="commission"
            className="data-[state=active]:gradient-primary data-[state=active]:text-white"
          >
            <Percent className="w-4 h-4 mr-2" />
            Comissões
          </TabsTrigger>
          <TabsTrigger
            value="insurance"
            className="data-[state=active]:gradient-primary data-[state=active]:text-white"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Convênios
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Financeiro */}
        <TabsContent value="dashboard">
          <FinancialDashboard clinicId={clinicId} />
        </TabsContent>

        {/* Valores de Consulta */}
        <TabsContent value="pricing">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">
                Valores de Consulta por Médico
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {doctors.map((doctor) => {
                const doctorPricing = getPricingForDoctor(doctor.id);
                const isEditing = editingPricing === doctor.id;

                return (
                  <motion.div
                    key={doctor.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-effect rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {doctor.profile.name}
                        </h4>
                        <p className="text-sm text-gray-600">CRM: {doctor.crm}</p>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={newPricingValue}
                            onChange={(e) => setNewPricingValue(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleSavePricing(doctor.id)}
                            size="sm"
                            className="flex-1 gradient-primary text-white"
                          >
                            <Save className="w-3 h-3 mr-1" />
                            Salvar
                          </Button>
                          <Button
                            onClick={() => {
                              setEditingPricing(null);
                              setNewPricingValue("");
                            }}
                            size="sm"
                            variant="outline"
                            className="flex-1"
                          >
                            <X className="w-3 h-3 mr-1" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-purple-600">
                            R$ {doctorPricing?.consultation_value.toFixed(2) || "0.00"}
                          </p>
                          {!doctorPricing && (
                            <p className="text-xs text-gray-500">
                              Valor não definido
                            </p>
                          )}
                        </div>
                        <Button
                          onClick={() => {
                            setEditingPricing(doctor.id);
                            setNewPricingValue(
                              doctorPricing?.consultation_value.toString() || ""
                            );
                          }}
                          size="sm"
                          variant="outline"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Editar
                        </Button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* Comissões */}
        <TabsContent value="commission">
          <div className="space-y-6">
            {/* Card de Comissão Padrão da Clínica */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-effect rounded-xl p-5 border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Comissão Padrão da Clínica
                    </h3>
                    <p className="text-sm text-gray-600">
                      Aplicada a todos os médicos sem configuração específica
                    </p>
                  </div>
                </div>

                {editingDefaultCommission ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={newDefaultCommission}
                      onChange={(e) => setNewDefaultCommission(e.target.value)}
                      className="w-24 px-3 py-2 rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg font-bold text-center"
                    />
                    <span className="text-lg font-bold text-indigo-600">%</span>
                    <Button
                      onClick={handleSaveDefaultCommission}
                      size="sm"
                      className="gradient-primary text-white"
                    >
                      <Save className="w-4 h-4 mr-1" />
                      Salvar
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingDefaultCommission(false);
                        setNewDefaultCommission((clinic?.default_commission_percentage ?? 30).toString());
                      }}
                      size="sm"
                      variant="outline"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <p className="text-3xl font-bold text-indigo-600">
                      {clinic?.default_commission_percentage ?? 30}%
                    </p>
                    <Button
                      onClick={() => setEditingDefaultCommission(true)}
                      size="sm"
                      variant="outline"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Título da seção de médicos */}
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">
                Comissão Personalizada por Médico
              </h3>
              <p className="text-sm text-gray-500">
                Deixe vazio para usar a comissão padrão ({clinic?.default_commission_percentage ?? 30}%)
              </p>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {doctors.map((doctor) => {
                const doctorCommission = getCommissionForDoctor(doctor.id);
                const isEditing = editingCommission === doctor.id;

                return (
                  <motion.div
                    key={doctor.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-effect rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {doctor.profile.name}
                        </h4>
                        <p className="text-sm text-gray-600">CRM: {doctor.crm}</p>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            placeholder="0.00"
                            value={newCommissionValue}
                            onChange={(e) => setNewCommissionValue(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                          <span className="text-sm text-gray-600">%</span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleSaveCommission(doctor.id)}
                            size="sm"
                            className="flex-1 gradient-primary text-white"
                          >
                            <Save className="w-3 h-3 mr-1" />
                            Salvar
                          </Button>
                          <Button
                            onClick={() => {
                              setEditingCommission(null);
                              setNewCommissionValue("");
                            }}
                            size="sm"
                            variant="outline"
                            className="flex-1"
                          >
                            <X className="w-3 h-3 mr-1" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          {doctorCommission ? (
                            <>
                              <p className="text-2xl font-bold text-blue-600">
                                {doctorCommission.commission_percentage.toFixed(2)}%
                              </p>
                              <span className="inline-block px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                                Personalizada
                              </span>
                            </>
                          ) : (
                            <>
                              <p className="text-2xl font-bold text-indigo-600">
                                {clinic?.default_commission_percentage ?? 30}%
                              </p>
                              <span className="inline-block px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
                                Padrão da Clínica
                              </span>
                            </>
                          )}
                        </div>
                        <Button
                          onClick={() => {
                            setEditingCommission(doctor.id);
                            setNewCommissionValue(
                              doctorCommission?.commission_percentage.toString() || ""
                            );
                          }}
                          size="sm"
                          variant="outline"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Editar
                        </Button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* Convênios */}
        <TabsContent value="insurance">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">
                Convênios Atendidos
              </h3>
              <Button
                onClick={() => {
                  setEditingInsurance(null);
                  setNewInsuranceName("");
                  setNewInsuranceDiscount("");
                }}
                className="gradient-primary text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Convênio
              </Button>
            </div>

            {/* Formulário de novo/editar convênio */}
            {(editingInsurance || !editingInsurance) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-effect rounded-xl p-4 mb-4"
              >
                <h4 className="font-semibold text-gray-900 mb-3">
                  {editingInsurance ? "Editar Convênio" : "Novo Convênio"}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Nome do convênio"
                    value={newInsuranceName}
                    onChange={(e) => setNewInsuranceName(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="Desconto (%)"
                      value={newInsuranceDiscount}
                      onChange={(e) => setNewInsuranceDiscount(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <span className="text-sm text-gray-600">%</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveInsurance}
                      className="flex-1 gradient-primary text-white"
                      disabled={!newInsuranceName.trim()}
                    >
                      <Save className="w-3 h-3 mr-1" />
                      Salvar
                    </Button>
                    {editingInsurance && (
                      <Button
                        onClick={() => {
                          setEditingInsurance(null);
                          setNewInsuranceName("");
                          setNewInsuranceDiscount("");
                        }}
                        variant="outline"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Lista de convênios */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {insurancePlans.map((plan) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`glass-effect rounded-xl p-4 ${!plan.is_active ? "opacity-60" : ""
                    }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">
                        {plan.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Desconto: {plan.discount_percentage.toFixed(2)}%
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${plan.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                        }`}
                    >
                      {plan.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleToggleInsurance(plan.id, plan.is_active)}
                      size="sm"
                      variant="outline"
                      className="flex-1"
                    >
                      {plan.is_active ? "Desativar" : "Ativar"}
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingInsurance(plan.id);
                        setNewInsuranceName(plan.name);
                        setNewInsuranceDiscount(plan.discount_percentage.toString());
                      }}
                      size="sm"
                      variant="outline"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteInsurance(plan.id)}
                      size="sm"
                      variant="destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>

            {insurancePlans.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Nenhum convênio cadastrado
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialManagement;

