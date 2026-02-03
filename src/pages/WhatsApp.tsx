import { useState, useEffect, useCallback } from "react";
import { MessageCircle, QrCode, Loader2, CheckCircle2, XCircle, RefreshCw, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { whatsappClient, type WhatsAppStatus } from "@/lib/whatsappClient";
import { WhatsAppChatInterface } from "@/components/whatsapp/WhatsAppChatInterface";

const WhatsApp = () => {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await whatsappClient.getStatus();
      setStatus(data);
      
      // Auto-reconnect if there's a saved session
      if (data.status === "disconnected" && data.canReconnect && !connecting) {
        console.log("Auto-reconnecting with saved session...");
        setConnecting(true);
        try {
          const connectData = await whatsappClient.connect();
          setStatus(connectData);
        } catch (err) {
          console.error("Auto-reconnect failed:", err);
        } finally {
          setConnecting(false);
        }
      }
    } catch (error) {
      console.error("Error fetching status:", error);
      setStatus({ status: "disconnected" });
    } finally {
      setLoading(false);
    }
  }, [connecting]);

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (status?.status === "qr_pending" || status?.status === "connecting") {
      const interval = setInterval(fetchStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [status?.status, fetchStatus]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const data = await whatsappClient.connect();
      setStatus(data);
      if (data.status === "connected") {
        toast({ title: "WhatsApp conectado com sucesso!" });
      }
    } catch (error) {
      toast({
        title: "Erro ao conectar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await whatsappClient.disconnect();
      setStatus({ status: "disconnected" });
      toast({ title: "WhatsApp desconectado" });
    } catch (error) {
      toast({
        title: "Erro ao desconectar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    const confirmed = window.confirm(
      "Isso irá desconectar e remover a sessão do WhatsApp. Você precisará escanear o QR code novamente. Continuar?"
    );
    if (!confirmed) return;

    try {
      await whatsappClient.logout();
      setStatus({ status: "disconnected" });
      toast({ title: "Sessão do WhatsApp removida" });
    } catch (error) {
      toast({
        title: "Erro ao fazer logout",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const renderStatusBadge = () => {
    if (!status) return null;

    const badges = {
      connected: {
        color: "bg-green-100 text-green-700 border-green-200",
        icon: CheckCircle2,
        text: "Conectado",
      },
      disconnected: {
        color: "bg-gray-100 text-gray-700 border-gray-200",
        icon: XCircle,
        text: "Desconectado",
      },
      connecting: {
        color: "bg-yellow-100 text-yellow-700 border-yellow-200",
        icon: Loader2,
        text: "Conectando...",
      },
      qr_pending: {
        color: "bg-blue-100 text-blue-700 border-blue-200",
        icon: QrCode,
        text: "Aguardando QR Code",
      },
    };

    const badge = badges[status.status];
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${badge.color}`}>
        <Icon className={`w-4 h-4 ${status.status === "connecting" ? "animate-spin" : ""}`} />
        {badge.text}
        {status.phone && ` • ${status.phone}`}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  // Show connection screen if not connected
  if (status?.status !== "connected") {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">WhatsApp</h1>
                  <p className="text-sm text-gray-600">Gerenciamento de mensagens</p>
                </div>
              </div>
              {renderStatusBadge()}
            </div>
          </div>
        </div>

        {/* Connection Content */}
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
            {/* QR Code Section */}
            {status?.status === "qr_pending" && status.qr && (
              <div className="flex flex-col items-center gap-6">
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Conectar WhatsApp
                  </h2>
                  <p className="text-gray-600">
                    Escaneie o QR Code com o WhatsApp do seu celular
                  </p>
                </div>
                <div className="bg-gray-50 p-6 rounded-xl">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(status.qr)}`}
                    alt="QR Code WhatsApp"
                    className="w-72 h-72"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={fetchStatus}
                    className="gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Atualizar QR Code
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDisconnect}
                    className="gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Disconnected State */}
            {status?.status === "disconnected" && (
              <div className="flex flex-col items-center gap-6 py-8">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                  <MessageCircle className="w-10 h-10 text-gray-400" />
                </div>
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    WhatsApp Desconectado
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Conecte sua conta do WhatsApp para começar a enviar e receber mensagens
                  </p>
                </div>
                <Button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="bg-green-500 hover:bg-green-600 text-white gap-2 px-8 py-6 text-lg"
                  size="lg"
                >
                  {connecting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <QrCode className="w-5 h-5" />
                  )}
                  {connecting ? "Conectando..." : "Conectar WhatsApp"}
                </Button>
              </div>
            )}

            {/* Connecting State */}
            {status?.status === "connecting" && (
              <div className="flex flex-col items-center gap-6 py-8">
                <Loader2 className="w-16 h-16 animate-spin text-green-500" />
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Conectando...
                  </h2>
                  <p className="text-gray-600">
                    Aguarde enquanto estabelecemos a conexão
                  </p>
                </div>
              </div>
            )}

            {/* Logout Option */}
            {status?.status !== "disconnected" && (
              <div className="pt-6 border-t">
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="w-full gap-2 text-red-600 border-red-200 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  Remover Sessão
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show full chat interface when connected
  return (
    <div className="flex flex-col bg-gray-50 h-full">
      {/* Header */}
      <div className="bg-white border-b flex-shrink-0">
        <div className="px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">WhatsApp</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {renderStatusBadge()}
              <Button
                onClick={handleDisconnect}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <XCircle className="w-4 h-4" />
                Desconectar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <WhatsAppChatInterface />
      </div>
    </div>
  );
};

export default WhatsApp;
