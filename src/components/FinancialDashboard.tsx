import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  Users,
  CreditCard,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type {
  Appointment,
  DoctorWithProfileName,
  InsurancePlan,
} from "@/types/database.types";

interface FinancialDashboardProps {
  clinicId: string;
}

interface FinancialStats {
  totalRevenue: number;
  clinicCommission: number;
  doctorRevenue: number;
  totalAppointments: number;
  insuranceAppointments: number;
  particularAppointments: number;
}

interface RevenueByPeriod {
  date: string;
  revenue: number;
  clinicCommission: number;
}

interface RevenueByDoctor {
  doctorName: string;
  revenue: number;
  appointments: number;
}

interface RevenueByInsurance {
  name: string;
  value: number;
  count: number;
}

const COLORS = [
  "#8b5cf6",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#06b6d4",
];

const FinancialDashboard: React.FC<FinancialDashboardProps> = ({
  clinicId,
}) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<FinancialStats>({
    totalRevenue: 0,
    clinicCommission: 0,
    doctorRevenue: 0,
    totalAppointments: 0,
    insuranceAppointments: 0,
    particularAppointments: 0,
  });
  const [revenueByPeriod, setRevenueByPeriod] = useState<RevenueByPeriod[]>([]);
  const [revenueByDoctor, setRevenueByDoctor] = useState<RevenueByDoctor[]>([]);
  const [revenueByInsurance, setRevenueByInsurance] = useState<
    RevenueByInsurance[]
  >([]);
  const [recentAppointments, setRecentAppointments] = useState<
    (Appointment & { doctor?: any; insurance_plan?: InsurancePlan })[]
  >([]);
  const [period, setPeriod] = useState<"today" | "week" | "month" | "year">(
    "month"
  );

  const loadFinancialData = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);

    try {
      // Calcular datas do período
      const now = new Date();
      let startDate: Date;
      switch (period) {
        case "today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "week":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }

      // Buscar agendamentos concluídos com dados financeiros
      const { data: appointments, error: appointmentsError } = await supabase
        .from("appointments")
        .select("*")
        .eq("clinic_id", clinicId)
        .eq("status", "COMPLETED")
        .gte("scheduled_start", startDate.toISOString())
        .lte("scheduled_start", now.toISOString())
        .order("scheduled_start", { ascending: false });

      if (appointmentsError) throw appointmentsError;

      const completedAppointments = (appointments || []) as Appointment[];

      // Buscar dados dos médicos e convênios separadamente
      const doctorIds = [
        ...new Set(completedAppointments.map((apt) => apt.doctor_id)),
      ];
      const insurancePlanIds = [
        ...new Set(
          completedAppointments
            .filter((apt) => apt.insurance_plan_id)
            .map((apt) => apt.insurance_plan_id!)
        ),
      ];

      // Buscar médicos
      const { data: doctorsData } = await supabase
        .from("doctors")
        .select("id, user_id, profile:profiles(name)")
        .in("id", doctorIds);

      // Buscar convênios
      const { data: insurancePlansData } = await supabase
        .from("insurance_plans")
        .select("id, name")
        .in("id", insurancePlanIds);

      // Mapear dados
      const doctorsMap = new Map(
        (doctorsData || []).map((d: any) => [
          d.id,
          { ...d, profile: d.profile || { name: "Médico" } },
        ])
      );
      const insurancePlansMap = new Map(
        (insurancePlansData || []).map((p: any) => [p.id, p])
      );

      const completedAppointmentsWithData = completedAppointments.map(
        (apt) => ({
          ...apt,
          doctor: doctorsMap.get(apt.doctor_id),
          insurance_plan: apt.insurance_plan_id
            ? insurancePlansMap.get(apt.insurance_plan_id)
            : null,
        })
      );

      // Calcular estatísticas gerais
      const totalRevenue = completedAppointmentsWithData.reduce(
        (sum, apt) => sum + (apt.final_value || 0),
        0
      );
      const clinicCommission = completedAppointmentsWithData.reduce(
        (sum, apt) => sum + (apt.clinic_commission_amount || 0),
        0
      );
      const doctorRevenue = completedAppointmentsWithData.reduce(
        (sum, apt) => sum + (apt.doctor_amount || 0),
        0
      );
      const insuranceAppointments = completedAppointmentsWithData.filter(
        (apt) => apt.is_insurance
      ).length;
      const particularAppointments =
        completedAppointmentsWithData.length - insuranceAppointments;

      setStats({
        totalRevenue,
        clinicCommission,
        doctorRevenue,
        totalAppointments: completedAppointments.length,
        insuranceAppointments,
        particularAppointments,
      });

      // Agrupar receitas por período
      const periodData: { [key: string]: RevenueByPeriod } = {};
      completedAppointmentsWithData.forEach((apt) => {
        const date = new Date(apt.scheduled_start);
        let key: string;
        if (period === "today") {
          key = date.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          });
        } else if (period === "week" || period === "month") {
          key = date.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          });
        } else {
          key = date.toLocaleDateString("pt-BR", {
            month: "2-digit",
            year: "numeric",
          });
        }

        if (!periodData[key]) {
          periodData[key] = {
            date: key,
            revenue: 0,
            clinicCommission: 0,
          };
        }
        periodData[key].revenue += apt.final_value || 0;
        periodData[key].clinicCommission += apt.clinic_commission_amount || 0;
      });

      setRevenueByPeriod(
        Object.values(periodData).sort((a, b) => a.date.localeCompare(b.date))
      );

      // Agrupar receitas por médico
      const doctorData: {
        [key: string]: { doctorName: string; revenue: number; appointments: number };
      } = {};
      completedAppointmentsWithData.forEach((apt) => {
        const doctorId = apt.doctor_id;
        const doctorName =
          (apt as any).doctor?.profile?.name || `Médico ${doctorId.slice(0, 8)}`;

        if (!doctorData[doctorId]) {
          doctorData[doctorId] = {
            doctorName,
            revenue: 0,
            appointments: 0,
          };
        }
        doctorData[doctorId].revenue += apt.final_value || 0;
        doctorData[doctorId].appointments += 1;
      });

      setRevenueByDoctor(
        Object.values(doctorData).sort((a, b) => b.revenue - a.revenue)
      );

      // Agrupar receitas por convênio
      const insuranceData: { [key: string]: RevenueByInsurance } = {};
      completedAppointmentsWithData
        .filter((apt) => apt.is_insurance && apt.insurance_plan_id)
        .forEach((apt) => {
          const planName =
            (apt as any).insurance_plan?.name || "Convênio Desconhecido";
          if (!insuranceData[planName]) {
            insuranceData[planName] = {
              name: planName,
              value: 0,
              count: 0,
            };
          }
          insuranceData[planName].value += apt.final_value || 0;
          insuranceData[planName].count += 1;
        });

      // Adicionar "Particular" se houver
      const particularRevenue = completedAppointmentsWithData
        .filter((apt) => !apt.is_insurance)
        .reduce((sum, apt) => sum + (apt.final_value || 0), 0);
      if (particularRevenue > 0) {
        insuranceData["Particular"] = {
          name: "Particular",
          value: particularRevenue,
          count: particularAppointments,
        };
      }

      setRevenueByInsurance(
        Object.values(insuranceData).sort((a, b) => b.value - a.value)
      );

      // Últimos agendamentos
      setRecentAppointments(completedAppointmentsWithData.slice(0, 10) as any);
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
  }, [clinicId, period]);

  useEffect(() => {
    loadFinancialData();
  }, [loadFinancialData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        Carregando dashboard financeiro...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros de Período */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Financeiro</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => setPeriod("today")}
            variant={period === "today" ? "default" : "outline"}
            size="sm"
            className={period === "today" ? "gradient-primary text-white" : ""}
          >
            Hoje
          </Button>
          <Button
            onClick={() => setPeriod("week")}
            variant={period === "week" ? "default" : "outline"}
            size="sm"
            className={period === "week" ? "gradient-primary text-white" : ""}
          >
            Semana
          </Button>
          <Button
            onClick={() => setPeriod("month")}
            variant={period === "month" ? "default" : "outline"}
            size="sm"
            className={period === "month" ? "gradient-primary text-white" : ""}
          >
            Mês
          </Button>
          <Button
            onClick={() => setPeriod("year")}
            variant={period === "year" ? "default" : "outline"}
            size="sm"
            className={period === "year" ? "gradient-primary text-white" : ""}
          >
            Ano
          </Button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-effect rounded-xl p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Receita Total</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(stats.totalRevenue)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-effect rounded-xl p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Comissão da Clínica</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(stats.clinicCommission)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-effect rounded-xl p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Receita dos Médicos</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.doctorRevenue)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-effect rounded-xl p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total de Consultas</p>
              <p className="text-2xl font-bold text-orange-600">
                {stats.totalAppointments}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.insuranceAppointments} convênio • {stats.particularAppointments}{" "}
                particular
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Receitas por Período */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-effect rounded-xl p-6"
        >
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Receitas por Período
          </h3>
          {revenueByPeriod.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueByPeriod}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  name="Receita Total"
                />
                <Line
                  type="monotone"
                  dataKey="clinicCommission"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Comissão Clínica"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              Nenhum dado disponível para o período selecionado
            </div>
          )}
        </motion.div>

        {/* Gráfico de Receitas por Médico */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-effect rounded-xl p-6"
        >
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Receitas por Médico
          </h3>
          {revenueByDoctor.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByDoctor}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="doctorName"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#8b5cf6" name="Receita" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              Nenhum dado disponível
            </div>
          )}
        </motion.div>
      </div>

      {/* Gráfico de Pizza - Receitas por Convênio */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-effect rounded-xl p-6"
      >
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Receitas por Tipo de Pagamento
        </h3>
        {revenueByInsurance.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={revenueByInsurance}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {revenueByInsurance.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {revenueByInsurance.map((item, index) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{
                        backgroundColor: COLORS[index % COLORS.length],
                      }}
                    />
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        {item.count} consulta{item.count !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <p className="font-bold text-gray-900">
                    {formatCurrency(item.value)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-500">
            Nenhum dado disponível
          </div>
        )}
      </motion.div>

      {/* Tabela de Agendamentos Recentes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-effect rounded-xl p-6"
      >
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Consultas Recentes
        </h3>
        {recentAppointments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Data
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Médico
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Tipo
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                    Valor
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                    Desconto
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                    Final
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentAppointments.map((apt) => {
                  const doctorName =
                    (apt as any).doctor?.profile?.name || "Médico";
                  const insuranceName =
                    apt.is_insurance && (apt as any).insurance_plan?.name
                      ? (apt as any).insurance_plan.name
                      : "Particular";
                  const date = new Date(apt.scheduled_start);

                  return (
                    <tr
                      key={apt.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {date.toLocaleDateString("pt-BR")} {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {doctorName}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            apt.is_insurance
                              ? "bg-blue-100 text-blue-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {insuranceName}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 text-right">
                        {apt.consultation_value
                          ? formatCurrency(apt.consultation_value)
                          : "-"}
                      </td>
                      <td className="py-3 px-4 text-sm text-green-600 text-right">
                        {apt.discount_amount
                          ? formatCurrency(apt.discount_amount)
                          : "-"}
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold text-purple-600 text-right">
                        {apt.final_value
                          ? formatCurrency(apt.final_value)
                          : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Nenhuma consulta concluída no período selecionado
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default FinancialDashboard;

