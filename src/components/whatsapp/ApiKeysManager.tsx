import { useState, useEffect, useCallback } from "react";
import { Key, Plus, Trash2, Copy, Check, ToggleLeft, ToggleRight, Loader2, AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { whatsappClient } from "@/lib/whatsappClient";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

export function ApiKeysManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    try {
      setError(null);
      const response = await whatsappClient.getApiKeys();
      setKeys(response.api_keys);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar chaves");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const response = await whatsappClient.createApiKey(newKeyName || undefined);
      setNewlyCreatedKey(response.api_key.key);
      setShowCreateForm(false);
      setNewKeyName("");
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar chave");
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    try {
      await whatsappClient.toggleApiKey(id, !currentActive);
      setKeys((prev) =>
        prev.map((k) => (k.id === id ? { ...k, is_active: !currentActive } : k))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar chave");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await whatsappClient.deleteApiKey(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao deletar chave");
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const apiBaseUrl = import.meta.env.VITE_WHATSAPP_API_URL || "http://localhost:9000";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Chaves de API</h3>
          <p className="text-sm text-gray-500 mt-1">
            Use chaves de API para integrar com n8n, Make, Zapier e outros serviços externos.
          </p>
        </div>
        {!showCreateForm && !newlyCreatedKey && (
          <Button
            onClick={() => setShowCreateForm(true)}
            className="gap-2 bg-green-500 hover:bg-green-600 whitespace-nowrap text-white"
            size="sm"
          >
            <Plus className="w-4 h-4" />
            Nova Chave
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Newly created key banner */}
      {newlyCreatedKey && (
        <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-800">Salve sua chave agora!</p>
              <p className="text-sm text-yellow-700">
                Essa chave não será exibida novamente. Copie e guarde em um local seguro.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-white border border-yellow-300 rounded text-sm font-mono break-all select-all">
              {newlyCreatedKey}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy(newlyCreatedKey)}
              className="flex-shrink-0 gap-1.5"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copiado!" : "Copiar"}
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNewlyCreatedKey(null)}
            className="w-full"
          >
            Entendido, já salvei a chave
          </Button>
        </div>
      )}

      {/* Create form */}
      {showCreateForm && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Nome da chave (opcional)
          </label>
          <Input
            placeholder="Ex: n8n Produção"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="gap-2 bg-green-500 hover:bg-green-600 text-white"
              size="sm"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
              {creating ? "Criando..." : "Criar Chave"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowCreateForm(false);
                setNewKeyName("");
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Keys list */}
      {keys.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Key className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Nenhuma chave de API</p>
          <p className="text-sm">Crie uma chave para começar a integrar com serviços externos.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => (
            <div
              key={key.id}
              className={`flex items-center gap-4 p-4 border rounded-lg transition-colors ${
                key.is_active
                  ? "bg-white border-gray-200"
                  : "bg-gray-50 border-gray-200 opacity-60"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 truncate">{key.name}</span>
                  {!key.is_active && (
                    <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                      Revogada
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                    {key.key_prefix}...
                  </code>
                  <span>Criada {formatDate(key.created_at)}</span>
                  {key.last_used_at && (
                    <span>Usado {formatDate(key.last_used_at)}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggle(key.id, key.is_active)}
                  title={key.is_active ? "Revogar chave" : "Ativar chave"}
                  className="h-8 w-8 p-0"
                >
                  {key.is_active ? (
                    <ToggleRight className="w-5 h-5 text-green-600" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-gray-400" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(key.id)}
                  title="Deletar chave"
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Usage instructions */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
        <div className="flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-blue-800 text-sm">Como usar no n8n</span>
        </div>
        <div className="text-sm text-blue-700 space-y-2">
          <p>Use um nó <strong>HTTP Request</strong> com as seguintes configurações:</p>
          <div className="bg-white/70 rounded p-3 font-mono text-xs space-y-1">
            <div><span className="text-blue-500">URL:</span> {apiBaseUrl}/api/external/send/text</div>
            <div><span className="text-blue-500">Método:</span> POST</div>
            <div><span className="text-blue-500">Header:</span> X-API-Key: flx_sua_chave_aqui</div>
            <div><span className="text-blue-500">Body (JSON):</span></div>
            <pre className="ml-2 text-gray-700">{`{
  "to": "5511999999999",
  "text": "Olá! Sua consulta é amanhã."
}`}</pre>
          </div>
          <p className="text-xs text-blue-600">
            Endpoints disponíveis: <code>/send/text</code>, <code>/send/image</code>, <code>/send/video</code>, <code>/send/audio</code>, <code>/send/document</code>, <code>/status</code>
          </p>
        </div>
      </div>
    </div>
  );
}
