import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, FileText, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const CreateReportModal = ({ doctorId, clinicId, defaultPatient, onClose, onSuccess }) => {
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(defaultPatient || null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const lastSavedPatientId = useRef(null); // para controlar troca de paciente

  // 🔹 Carregar pacientes
  const loadPatients = useCallback(async () => {
    if (!clinicId) return;
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('clinic_id', clinicId);
    if (!error) setPatients(data);
  }, [clinicId]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // 🔹 Restaurar rascunho ao abrir
  useEffect(() => {
    const saved = localStorage.getItem(`reportDraft-${selectedPatient?.id}`);
    if (saved) {
      const { patient, title, content } = JSON.parse(saved);
      if (patient) {
        setSelectedPatient(patient);
        lastSavedPatientId.current = patient.id;
      }
      if (title) setTitle(title);
      if (content) setContent(content);
    }
  }, []);

  // 🔹 Salvar rascunho e apagar ao trocar de paciente
  useEffect(() => {
    if (!selectedPatient) return;

    // se mudou de paciente, limpa o rascunho antigo
    if (lastSavedPatientId.current && lastSavedPatientId.current !== selectedPatient.id) {
      localStorage.removeItem(`reportDraft-${lastSavedPatientId.current}`);
    }

    localStorage.setItem(
      `reportDraft-${selectedPatient.id}`,
      JSON.stringify({
        patient: selectedPatient,
        title,
        content,
      })
    );

    lastSavedPatientId.current = selectedPatient.id;
  }, [selectedPatient, title, content]);

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.cpf && p.cpf.includes(searchTerm))
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient)
      return toast({ title: 'Selecione um paciente!', variant: 'destructive' });
    if (!title || !content)
      return toast({ title: 'Preencha todos os campos!', variant: 'destructive' });

    setLoading(true);
    const { error } = await supabase.from('medical_reports').insert({
      doctor_id: doctorId,
      clinic_id: clinicId,
      patient_id: selectedPatient.id,
      title,
      content,
    });
    setLoading(false);

    if (error)
      return toast({
        title: 'Erro ao salvar anamnese!',
        description: error.message,
        variant: 'destructive',
      });

    toast({ title: 'Anamnese registrada com sucesso! 🎉' });

    // limpa rascunho depois de salvar
    localStorage.removeItem(`reportDraft-${selectedPatient.id}`);
    onSuccess?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-bold">Nova Anamnese</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!selectedPatient ? (
            <>
              <div>
                <label className="text-sm font-medium">Buscar Paciente</label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    className="w-full pl-10 pr-3 py-2 border rounded-lg"
                    placeholder="Nome ou CPF"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {searchTerm && (
                <div className="border rounded-lg max-h-48 overflow-auto">
                  {filteredPatients.map((p) => (
                    <div
                      key={p.id}
                      className="p-2 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedPatient(p)}
                    >
                      {p.name} — {p.cpf}
                    </div>
                  ))}
                  {filteredPatients.length === 0 && (
                    <p className="p-2 text-gray-500 text-sm text-center">
                      Nenhum paciente encontrado
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="p-3 border rounded-lg bg-gray-50">
              <p className="font-semibold">{selectedPatient.name}</p>
              <p className="text-sm text-gray-600">CPF: {selectedPatient.cpf}</p>
              <button
                onClick={() => setSelectedPatient(null)}
                type="button"
                className="text-xs text-blue-600 mt-1"
              >
                Trocar paciente
              </button>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Título</label>
            <input
              className="w-full border rounded-lg p-2 mt-1"
              placeholder="Ex: Consulta inicial"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Anamnese</label>
            <textarea
              className="w-full border rounded-lg p-2 h-40 mt-1"
              placeholder="Digite a anamnese..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Anamnese'}
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default CreateReportModal;
