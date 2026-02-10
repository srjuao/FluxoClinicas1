import { useState, useEffect, useCallback, useRef } from "react";
import { whatsappClient, type WhatsAppStatus } from "@/lib/whatsappClient";
import { toast } from "@/components/ui/use-toast";

export function useWhatsAppConnection() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const connectingRef = useRef(false);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await whatsappClient.getStatus();
      setStatus(data);

      // Auto-reconnect if there's a saved session and not already connecting
      if (
        data.status === "disconnected" &&
        data.can_reconnect &&
        !connectingRef.current
      ) {
        connectingRef.current = true;
        setConnecting(true);
        try {
          const reconnectData = await whatsappClient.reconnect();
          setStatus(reconnectData);
        } catch (err) {
          console.error("Auto-reconnect failed:", err);
        } finally {
          connectingRef.current = false;
          setConnecting(false);
        }
      }
    } catch (error) {
      console.error("Error fetching status:", error);
      setStatus({ status: "disconnected" });
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll while connecting or waiting for QR scan
  useEffect(() => {
    if (status?.status === "qr_pending" || status?.status === "connecting") {
      const interval = setInterval(fetchStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [status?.status, fetchStatus]);

  const handleConnect = useCallback(async () => {
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
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    try {
      await whatsappClient.disconnect();
      setStatus({ status: "disconnected", has_saved_session: true, can_reconnect: true });
      toast({ title: "WhatsApp desconectado" });
    } catch (error) {
      toast({
        title: "Erro ao desconectar",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  }, []);

  const handleLogout = useCallback(async () => {
    const confirmed = window.confirm(
      "Isso ir\u00e1 desconectar e remover a sess\u00e3o do WhatsApp. Voc\u00ea precisar\u00e1 escanear o QR code novamente. Continuar?"
    );
    if (!confirmed) return;

    try {
      await whatsappClient.logout();
      setStatus({ status: "disconnected", has_saved_session: false, can_reconnect: false });
      toast({ title: "Sess\u00e3o do WhatsApp removida" });
    } catch (error) {
      toast({
        title: "Erro ao fazer logout",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  }, []);

  return {
    status,
    loading,
    connecting,
    fetchStatus,
    handleConnect,
    handleDisconnect,
    handleLogout,
  };
}
