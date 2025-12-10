import Groq from "groq-sdk";

const groq = new Groq({
    apiKey: import.meta.env.VITE_GROQ_API_KEY,
    dangerouslyAllowBrowser: true,
});

interface LaudoResponse {
    examName: string;
    laudoText: string;
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
        const chatCompletion = await groq.chat.completions.create({
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
