export const loadMemedScript = (apiKey: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (document.getElementById('memed-script')) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.id = 'memed-script';
        // Utilizando o ambiente de Sandbox (Testes) oficial da Memed
        script.src = `https://sandbox.memed.com.br/modulos/plataforma.sinapse-prescricao/build/sinapse-prescricao.min.js`;
        script.setAttribute('data-color', '#4f46e5'); // Cor original do sistema (Indigo 600)
        script.setAttribute('data-token', apiKey);

        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Erro ao carregar o script da Memed. Verifique sua conexão ou adblocker.'));

        document.head.appendChild(script);
    });
};

export const initMemed = (patientData: {
    nome: string;
    cpf?: string;
    telefone?: string;
    id_externo?: string;
}) => {
    if (typeof window.MdSinapsePrescricao === 'undefined') {
        throw new Error('O módulo do Memed não foi carregado corretamente.');
    }

    window.MdHub.command.send('plataforma.prescricao', 'setPaciente', {
        nome: patientData.nome,
        cpf: patientData.cpf?.replace(/\D/g, '') || '',
        telefone: patientData.telefone || '',
        id_externo: patientData.id_externo || '',
    });

    window.MdHub.command.send('plataforma.prescricao', 'show');
};
