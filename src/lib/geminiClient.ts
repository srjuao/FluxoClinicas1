import Groq from "groq-sdk";

let groqInstance: Groq | null = null;

function getGroqClient(): Groq {
    if (!groqInstance) {
        const apiKey = import.meta.env.VITE_GROQ_API_KEY;
        if (!apiKey) {
            throw new Error("Chave da API Groq não configurada. Adicione VITE_GROQ_API_KEY no arquivo .env");
        }
        groqInstance = new Groq({
            apiKey,
            dangerouslyAllowBrowser: true,
        });
    }
    return groqInstance;
}

interface LaudoResponse {
    examName: string;
    laudoText: string;
}

interface AnamnesisResponse {
    title: string;
    content: string;
}

export async function organizeAnamnesis(
    patientName: string,
    freeText: string
): Promise<AnamnesisResponse> {
    const prompt = `Você é um assistente médico especializado em organizar anamneses a partir de transcrições de consultas médicas.

ANAMNESE é uma entrevista médica que busca relembrar todos os fatos relacionados à doença e ao paciente. Quando bem conduzida, é responsável por 85% do diagnóstico.

CONTEXTO IMPORTANTE:
O médico deixou o microfone ligado durante toda a consulta, portanto a transcrição contém:
- Conversas relevantes sobre saúde e sintomas
- Conversas IRRELEVANTES como cumprimentos, despedidas, assuntos pessoais, comentários sobre clima, política, futebol, família (não relacionados a saúde), etc.

SUA TAREFA:
1. FILTRAR e IGNORAR completamente tudo que NÃO seja relacionado à consulta médica
2. EXTRAIR apenas informações clinicamente relevantes
3. ORGANIZAR essas informações no padrão correto de anamnese médica

O QUE DEVE SER IGNORADO (exemplos):
- "Bom dia", "Como vai?", "Tudo bem?", "Até logo", "Obrigado"
- Conversas sobre tempo, clima, trânsito
- Assuntos de família não relacionados a saúde (ex: "seu neto tá grande", "como foi a viagem?")
- Discussões sobre política, futebol, novela, fofocas
- Comentários sobre a clínica, decoração, funcionários
- Pausas, "hmm", "éee", ruídos
- Qualquer conversa social não relacionada à queixa médica

O QUE DEVE SER INCLUÍDO:
- Queixas e sintomas do paciente
- Histórico de doenças (pessoal e familiar relevante para saúde)
- Medicamentos, alergias
- Hábitos (tabagismo, etilismo, drogas, exercícios)
- Achados de exame físico
- Discussão sobre diagnóstico e tratamento
- Orientações médicas dadas

REGRAS IMPORTANTES:
- NÃO invente informações. Use APENAS o que foi mencionado sobre saúde.
- NUNCA escreva "Não informado", "Não informada", "Não mencionado".
- Se uma seção não tiver informações médicas relevantes, NÃO INCLUA essa seção.
- Inclua SOMENTE as seções que tiverem informações reais sobre saúde.
- Mantenha a linguagem profissional e técnica.
- Use terminologia médica adequada.

FORMATO DE SAÍDA (inclua SOMENTE as seções que tiverem informações médicas reais):

QUEIXA PRINCIPAL (QP):
[Em poucas palavras, o motivo que levou o paciente a procurar atendimento]

HISTÓRIA DA DOENÇA ATUAL (HDA):
[Descrição cronológica e detalhada dos sintomas: início, duração, localização, intensidade, fatores de melhora/piora, sintomas associados]

HISTÓRIA PATOLÓGICA PREGRESSA (HPP):
[Doenças anteriores, cirurgias, internações, traumas]

HISTÓRIA FAMILIAR:
[Doenças na família - pais, irmãos, filhos - APENAS informações sobre doenças]

HÁBITOS DE VIDA:
[Tabagismo, etilismo, drogas, atividade física, alimentação, sono]

MEDICAMENTOS EM USO:
[Nome, dose e frequência dos medicamentos]

ALERGIAS:
[Alergias a medicamentos, alimentos ou outras substâncias]

EXAME FÍSICO:
[Achados do exame físico: sinais vitais, inspeção, palpação, ausculta]

HIPÓTESE DIAGNÓSTICA:
[Possíveis diagnósticos baseados na anamnese e exame]

CONDUTA:
[Plano terapêutico, exames solicitados, orientações, retorno]

Paciente: ${patientName}
Transcrição da consulta (FILTRAR CONTEÚDO IRRELEVANTE): "${freeText}"

Responda APENAS com um JSON válido no formato abaixo, sem markdown ou texto adicional:
{
  "title": "Título curto baseado na queixa principal (ex: Consulta - Cefaleia, Retorno - Hipertensão, Avaliação - Dor Lombar)",
  "content": "O texto da anamnese organizada completa (APENAS conteúdo médico relevante)"
}`;

    try {
        const chatCompletion = await getGroqClient().chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.2,
            max_tokens: 2048,
        });

        const text = chatCompletion.choices[0]?.message?.content || "";

        // Limpar possíveis marcadores de código
        const cleanedText = text
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();

        try {
            const parsed = JSON.parse(cleanedText);
            return {
                title: parsed.title || "Consulta",
                content: parsed.content || "",
            };
        } catch {
            // Se falhar o parse JSON, tentar extrair título e conteúdo via regex
            const titleMatch = cleanedText.match(/"title"\s*:\s*"([^"]+)"/);
            const contentMatch = cleanedText.match(/"content"\s*:\s*"([\s\S]*?)"\s*\}?\s*$/);

            if (titleMatch && contentMatch) {
                return {
                    title: titleMatch[1],
                    content: contentMatch[1]
                        .replace(/\\n/g, "\n")
                        .replace(/\\"/g, '"'),
                };
            }

            // Se ainda falhar, verificar se o texto parece ser uma anamnese formatada
            // (não começa com { indicando JSON)
            if (!cleanedText.startsWith("{")) {
                return {
                    title: "Consulta",
                    content: cleanedText,
                };
            }

            // Último recurso: remover tudo que parece JSON e manter só o conteúdo útil
            const cleanContent = cleanedText
                .replace(/^\s*\{\s*/, "")
                .replace(/\s*\}\s*$/, "")
                .replace(/"title"\s*:\s*"[^"]*"\s*,?\s*/g, "")
                .replace(/"content"\s*:\s*"/g, "")
                .replace(/"\s*$/g, "")
                .replace(/\\n/g, "\n")
                .replace(/\\"/g, '"');

            return {
                title: "Consulta",
                content: cleanContent,
            };
        }
    } catch (error) {
        console.error("Erro ao organizar anamnese com IA:", error);
        throw new Error("Não foi possível organizar a anamnese. Tente novamente.");
    }
}


interface DoctorInfo {
    name: string;
    crm: string;
}

export async function generateMedicalReport(
    patientName: string,
    description: string,
    doctorInfo?: DoctorInfo
): Promise<LaudoResponse> {
    const doctorSignature = doctorInfo
        ? `Dr(a). ${doctorInfo.name}\nCRM: ${doctorInfo.crm}`
        : "[ASSINATURA DO MÉDICO]";

    const prompt = `Você é um assistente médico especializado em criar laudos profissionais de exames de imagem.
O médico irá descrever os achados de um exame em linguagem informal e você deve gerar um laudo estruturado e profissional em português brasileiro.

REGRAS IMPORTANTES:
- Use linguagem médica profissional e terminologia correta
- Seja objetivo e claro
- Estruture as informações de forma organizada
- Se o médico mencionar classificações (BI-RADS, TIRADS, ACR, etc), inclua na conclusão
- SEMPRE inclua a classificação apropriada quando aplicável
- Formate o laudo de forma clara e legível

FORMATO DO LAUDO:
1. Título do exame (ex: ULTRASSONOGRAFIA DAS MAMAS E AXILAS)
2. Técnica/Método utilizado
3. Achados detalhados por região/estrutura
4. IMPRESSÃO/CONCLUSÃO
5. Classificação (BI-RADS, TIRADS, etc) quando aplicável
6. Recomendação quando aplicável

TEMPLATES DE REFERÊNCIA PARA DIFERENTES ACHADOS:

=== ULTRASSONOGRAFIA DE MAMAS E AXILAS ===

PARA NÓDULO BENIGNO:
"Nota-se na projeção de [X] horas da mama [D/E], nódulo, ovalado, de orientação paralela à pele, margens circunscritas, hipoecogênico, sem artefatos posteriores, medindo [X] x [X] x [X] cm, com o centro da lesão distando [X] cm da pele e [X] cm da papila.
IMPRESSÃO: Nódulo em mama [D/E].
ACR BI-RADS US®: 3"

PARA NÓDULO SUSPEITO:
"Nota-se na projeção de [X] horas da mama [D/E], nódulo, arredondado/irregular, de orientação não paralela à pele, margens não circunscritas (especuladas/microlobuladas/indistintas), hipoecogênico, com atenuação posterior, medindo [X] x [X] x [X] cm, com o centro da lesão distando [X] cm da pele e [X] cm da papila.
IMPRESSÃO: Nódulo em mama [D/E].
ACR BI-RADS US®: 4/5"

PARA CISTO SIMPLES:
"Cisto simples na projeção de [X] horas da mama [D/E], medindo [X] mm.
IMPRESSÃO: Cisto simples em mama [D/E].
ACR BI-RADS US®: 2"

PARA NÓDULO COMPLEXO SÓLIDO-CÍSTICO:
"Nota-se na projeção de [X] horas da mama [D/E], cisto com paredes espessadas/septação espessa, forma ovalada, margens circunscritas, orientação paralela à pele, apresentando reforço acústico posterior, medindo [X] x [X] x [X] cm.
IMPRESSÃO: Nódulo complexo sólido-cístico na mama [D/E].
ACR BI-RADS US®: 4"

PARA MICROCISTOS AGRUPADOS:
"Observam-se microcistos agrupados na projeção de [X] horas da mama [D/E], medindo cerca de [X] x [X] mm.
IMPRESSÃO: Microcistos agrupados na mama [D/E].
ACR BI-RADS US®: 2 (se típico) / 3 (se inseguro)"

PARA ECTASIA DUCTAL:
"Nota-se dilatação ductal na região retroareolar, com diâmetro ântero-posterior de até [X] mm.
IMPRESSÃO: Ectasia ductal.
ACR BI-RADS US®: 2"

PARA PRÓTESES ÍNTEGRAS:
"Notam-se bilateralmente implantes mamários, localizados em topografia retroglandular/retropeitoral. A cápsula fibrosa está íntegra, sem sinais de contratura. As paredes dos implantes estão bem delimitadas, o interior é anecóico, sem sinais de rotura intracapsular.
IMPRESSÃO: Implantes mamários com aspectos ecográficos habituais.
ACR BI-RADS US®: 2"

PARA AXILAS NORMAIS:
"Realizada ultrassonografia da região axilar bilateral.
Pele e subcutâneo sem alterações à ecografia.
Músculos de aspecto anatômico.
Não há evidências de linfonodos de aspecto atípico no presente exame.
IMPRESSÃO: Exame ecográfico dentro dos limites da normalidade."

=== CLASSIFICAÇÃO ACR BI-RADS ===
1 - Exame negativo
2 - Achado benigno
3 - Achado provavelmente benigno - Reavaliação em 6 meses
4A/4B/4C - Achado suspeito - Considerar biópsia
5 - Altamente sugestivo de malignidade - Biópsia recomendada
6 - Malignidade confirmada por biópsia

=== RECOMENDAÇÕES PADRÃO ===
- BI-RADS 1-2: Manter rastreamento apropriado para faixa etária e risco
- BI-RADS 3: Reavaliação ultrassonográfica em 6 meses
- BI-RADS 4-5: Biópsia e estudo histopatológico
- BI-RADS 6: Seguir tratamento conforme o caso

Paciente: ${patientName}
Médico responsável: ${doctorSignature}
Descrição do médico: "${description}"

INSTRUÇÕES FINAIS:
- Gere o laudo completo seguindo os templates acima quando aplicável
- Adapte o template ao que foi descrito pelo médico
- Preencha os campos [X] com os valores mencionados ou deixe como "a definir" se não informado
- SEMPRE inclua a classificação BI-RADS para exames de mama
- Finalize com a assinatura do médico

Responda APENAS com um JSON válido no formato abaixo, sem markdown ou texto adicional:
{
  "examName": "Nome do tipo de exame (ex: Ultrassonografia das Mamas e Axilas)",
  "laudoText": "O laudo completo formatado com quebras de linha (use \\n para quebras)"
}`;

    try {
        const chatCompletion = await getGroqClient().chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.3,
            max_tokens: 3000,
        });

        const text = chatCompletion.choices[0]?.message?.content || "";

        // Limpar possíveis marcadores de código
        const cleanedText = text
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();

        const parsed = JSON.parse(cleanedText);

        return {
            examName: parsed.examName || "",
            laudoText: parsed.laudoText || "",
        };
    } catch (error) {
        console.error("Erro ao gerar laudo com IA:", error);
        throw new Error("Não foi possível gerar o laudo. Tente novamente.");
    }
}

export async function generatePatientSummary(
    patientName: string,
    reportsData: any[]
): Promise<string> {
    if (!reportsData || reportsData.length === 0) {
        return "Não há histórico suficiente para gerar um resumo.";
    }

    const compiledHistory = reportsData.map((report, index) => {
        return `Consulta ${index + 1} (${new Date(report.created_at).toLocaleDateString()}):
Título: ${report.title}
Conteúdo: ${report.content}`;
    }).join("\n\n");

    const prompt = `Você é um assistente médico especialista em compilar históricos clínicos.
    
    Abaixo está o histórico de consultas do paciente ${patientName}. 
    Sua tarefa é ler todas as anamneses e gerar um RESUMO CLÍNICO CONCISO em UM ÚNICO PARÁGRAFO.
    
    O resumo deve destacar as informações mais importantes para o médico que irá atendê-lo agora, como:
    - Principais queixas/diagnósticos passados.
    - Condições crônicas ou acompanhamentos contínuos.
    - Medicações em uso relevantes.
    - Qualquer alergia mencionada.
    
    Seja extremamente profissional, objetivo e vá direto ao ponto. Não use formatações como Markdown ou listas, escreva um texto corrido.
    Responda APENAS com o texto do resumo, sem saudações ou explicações adicionais.
    
    HISTÓRICO DO PACIENTE:
    ${compiledHistory}
    `;

    try {
        const chatCompletion = await getGroqClient().chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.2,
            max_tokens: 1024,
        });

        const summary = chatCompletion.choices[0]?.message?.content || "Não foi possível gerar o resumo.";
        return summary.trim();
    } catch (error) {
        console.error("Erro ao gerar resumo do paciente:", error);
        throw new Error("Falha ao gerar o resumo inteligente. Tente novamente.");
    }
}

export async function checkPrescriptionSafety(
    patientName: string,
    reportsData: any[],
    prescriptionText: string
): Promise<{ safe: boolean; alerts: string[] }> {
    if (!prescriptionText || prescriptionText.trim() === "") {
        return { safe: true, alerts: [] };
    }

    let historyText = "Nenhum histórico médico anterior encontrado.";
    if (reportsData && reportsData.length > 0) {
        historyText = reportsData.map((report, index) => {
            return `[Consulta ${index + 1} - ${new Date(report.created_at).toLocaleDateString()}]\nConteúdo: ${report.content}`;
        }).join("\n\n");
    }

    const prompt = `Você é um Assistente Médico Farmacêutico Especialista em Segurança do Paciente e Farmacovigilância.
    Sua função é atuar como um "Copilot" revisor de prescrições.

    Paciente: ${patientName}

    HISTÓRICO DO PACIENTE (Anamneses anteriores onde podem conter alergias crônicas, medicações em uso, doenças de base):
    ${historyText}

    NOVA PRESCRIÇÃO (Medicamentos que o médico quer receitar AGORA):
    ${prescriptionText}

    TAREFA:
    Compare a NOVA PRESCRIÇÃO com o HISTÓRICO DO PACIENTE.
    Verifique SE HÁ RISCOS GRAVES. Foque apenas em:
    1. ALERGIAS documentadas no histórico que conflitem com a nova prescrição (Ex: Histórico diz "Alergia a Dipirona", nova prescrição tem "Lisador").
    2. INTERAÇÕES MEDICAMENTOSAS GRAVES entre o que está no histórico e a nova prescrição.
    3. CONTRAINDICAÇÕES ABSOLUTAS com doenças de base do histórico (Ex: Histórico diz "Glaucoma", prescrição tem "Corticoide" sem ressalvas).

    SEGREDO DA AVALIAÇÃO:
    - Se a prescrição estiver total ou provavelmente segura e livre desses riscos CLAROS e GRAVES, você deve retornar um JSON com "safe": true e lista de alertas vazia.
    - Se houver riscos claros identificados com base no texto fornecido, retorne "safe": false e liste o(s) alerta(s) de forma concisa em tom de aviso médico (sem exagerar em riscos teóricos raros, seja prático).

    FORMATO DE SAÍDA (Obrigatório retornar APENAS este JSON exato válido):
    {
      "safe": boolean,
      "alerts": ["Lista de strings com os alertas encontrados, se houver"]
    }
    `;

    try {
        const chatCompletion = await getGroqClient().chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.1, // temperatura baixa para respostas analíticas consistentes
            max_tokens: 1024,
            response_format: { type: "json_object" }
        });

        const text = chatCompletion.choices[0]?.message?.content || "";
        const cleanedText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleanedText);

        return {
            safe: typeof parsed.safe === 'boolean' ? parsed.safe : true,
            alerts: Array.isArray(parsed.alerts) ? parsed.alerts : []
        };
    } catch (error) {
        console.error("Erro ao checar segurança da prescrição:", error);
        // Em caso de erro na IA, liberamos a prescrição mas no console fica o log
        return { safe: true, alerts: [] };
    }
}
