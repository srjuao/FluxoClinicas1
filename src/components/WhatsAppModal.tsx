import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  MessageCircle,
  QrCode,
  Phone,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { whatsappClient, type WhatsAppStatus } from "@/lib/whatsappClient";

interface WhatsAppModalProps {
  onClose: () => void;
}

const WhatsAppModal = ({ onClose }: WhatsAppModalProps) => {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [messageText, setMessageText] = useState("");

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

  const handleSendMessage = async () => {
    if (!phoneNumber.trim() || !messageText.trim()) {
      toast({
        title: "Preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    const cleanNumber = phoneNumber.replace(/\D/g, "");
    if (cleanNumber.length < 10 || cleanNumber.length > 13) {
      toast({
        title: "Número inválido",
        description: "Digite um número válido com DDD (ex: 11999999999)",
        variant: "destructive",
      });
      return;
    }

    setSendingMessage(true);
    try {
      await whatsappClient.sendTextMessage({
        to: cleanNumber,
        text: messageText,
      });
      toast({ title: "Mensagem enviada com sucesso!" });
      setPhoneNumber("");
      setMessageText("");
    } catch (error) {
      toast({
        title: "Erro ao enviar mensagem",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    }
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-green-500 to-green-600">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">WhatsApp</h2>
                <p className="text-green-100 text-sm">Gerenciar conexão</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-green-500" />
              </div>
            ) : (
              <>
                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Status da conexão:</span>
                  {renderStatusBadge()}
                </div>

                {/* QR Code Section */}
                {status?.status === "qr_pending" && status.qr && (
                  <div className="flex flex-col items-center gap-4 p-6 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-600 text-center">
                      Escaneie o QR Code com o WhatsApp do seu celular
                    </p>
                    <div className="bg-white p-4 rounded-xl shadow-inner">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(status.qr)}`}
                        alt="QR Code WhatsApp"
                        className="w-48 h-48"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchStatus}
                      className="gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Atualizar QR Code
                    </Button>
                  </div>
                )}

                {/* Connection Actions */}
                {status?.status === "disconnected" && (
                  <Button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="w-full bg-green-500 hover:bg-green-600 text-white gap-2"
                  >
                    {connecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <QrCode className="w-4 h-4" />
                    )}
                    {connecting ? "Conectando..." : "Conectar WhatsApp"}
                  </Button>
                )}

                {status?.status === "connected" && (
                  <>
                    {/* Send Message Form */}
                    <div className="space-y-4 p-4 bg-green-50 rounded-xl border border-green-100">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Send className="w-4 h-4 text-green-600" />
                        Enviar Mensagem
                      </h3>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Número de telefone
                          </label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                              placeholder="(11) 99999-9999"
                              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              maxLength={16}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mensagem
                          </label>
                          <textarea
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            placeholder="Digite sua mensagem..."
                            rows={3}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                          />
                        </div>

                        <Button
                          onClick={handleSendMessage}
                          disabled={sendingMessage || !phoneNumber || !messageText}
                          className="w-full bg-green-500 hover:bg-green-600 text-white gap-2"
                        >
                          {sendingMessage ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                          {sendingMessage ? "Enviando..." : "Enviar Mensagem"}
                        </Button>
                      </div>
                    </div>

                    {/* Disconnect Actions */}
                    <div className="flex gap-2">
                      <Button
                        onClick={handleDisconnect}
                        variant="outline"
                        className="flex-1 gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Desconectar
                      </Button>
                      <Button
                        onClick={handleLogout}
                        variant="outline"
                        className="flex-1 gap-2 text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4" />
                        Remover Sessão
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WhatsAppModal;
