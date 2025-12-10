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
    const prompt = `Você é um assistente médico especializado em organizar anamneses.

ANAMNESE é uma entrevista médica que busca relembrar todos os fatos relacionados à doença e ao paciente. Quando bem conduzida, é responsável por 85% do diagnóstico.

O médico ditou informações sobre um paciente de forma livre e você deve APENAS ORGANIZAR essas informações no padrão correto de anamnese médica.

REGRAS IMPORTANTES:
- NÃO invente nenhuma informação. Use APENAS o que foi dito pelo médico.
- NUNCA escreva "Não informado", "Não informada", "Não mencionado" ou similar.
- Se uma seção não tiver informações mencionadas pelo médico, NÃO INCLUA essa seção na resposta.
- Inclua SOMENTE as seções que tiverem informações reais fornecidas pelo médico.
- Organize as informações nas seções apropriadas.
- Mantenha a linguagem profissional e técnica, mas fiel ao que foi dito.
- Seja objetivo e claro.
- Use terminologia médica adequada.

FORMATO DE SAÍDA (inclua SOMENTE as seções que tiverem informações reais):

QUEIXA PRINCIPAL (QP):
[Em poucas palavras, o motivo que levou o paciente a procurar atendimento]

HISTÓRIA DA DOENÇA ATUAL (HDA):
[Descrição cronológica e detalhada dos sintomas: início, duração, localização, intensidade, fatores de melhora/piora, sintomas associados]

HISTÓRIA PATOLÓGICA PREGRESSA (HPP):
[Doenças anteriores, cirurgias, internações, traumas]

HISTÓRIA FAMILIAR:
[Doenças na família - pais, irmãos, filhos]

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
Texto do médico: "${freeText}"

Responda APENAS com um JSON válido no formato abaixo, sem markdown ou texto adicional:
{
  "title": "Título curto baseado na queixa principal (ex: Consulta - Cefaleia, Retorno - Hipertensão, Avaliação - Dor Lombar)",
  "content": "O texto da anamnese organizada completa"
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

export async function generateMedicalReport(
    patientName: string,
    description: string
): Promise<LaudoResponse> {
    const prompt = `Você é um assistente médico especializado em criar laudos profissionais de exames.
O médico irá descrever os achados de um exame em linguagem informal e você deve gerar um laudo estruturado e profissional em português brasileiro.

REGRAS IMPORTANTES:
- Use linguagem médica profissional
- Seja objetivo e claro
- Estruture as informações de forma organizada com seções claras
- Se o médico mencionar classificações (BI-RADS, TIRADS, etc), inclua na conclusão
- O laudo deve ter as seções: Método, Achados (por região/estrutura), Conclusão
- Formate o laudo de forma clara e legível

Paciente: ${patientName}
Descrição do médico: "${description}"

Responda APENAS com um JSON válido no formato abaixo, sem markdown ou texto adicional:
{
  "examName": "Nome do tipo de exame (ex: Mamografia Bilateral, Ultrassonografia Abdominal)",
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
            max_tokens: 2048,
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
