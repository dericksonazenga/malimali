import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BiometricCredential {
  workerName: string;
  credentialId: string;
  publicKey: string;
}

export const useBiometricCredentials = () => {
  const [credentials, setCredentials] = useState<BiometricCredential[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCredentials = useCallback(async () => {
    const { data } = await supabase
      .from("biometric_credentials")
      .select("worker_name, credential_id, public_key")
      .order("created_at", { ascending: true });

    if (data) {
      setCredentials(
        data.map((d) => ({
          workerName: d.worker_name,
          credentialId: d.credential_id,
          publicKey: d.public_key,
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCredentials();

    const channel = supabase
      .channel("biometric-credentials-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "biometric_credentials" }, () => fetchCredentials())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchCredentials]);

  const saveCredentials = async (workerName: string, creds: { credentialId: string; publicKey: string }[]) => {
    // Delete existing credentials for this worker
    await supabase.from("biometric_credentials").delete().eq("worker_name", workerName);

    // Insert new ones
    const rows = creds.map((c) => ({
      worker_name: workerName,
      credential_id: c.credentialId,
      public_key: c.publicKey,
    }));

    const { error } = await supabase.from("biometric_credentials").insert(rows);
    if (error) {
      console.error("Failed to save biometric credentials:", error);
      return false;
    }

    await fetchCredentials();
    return true;
  };

  const removeCredentials = async (workerName: string) => {
    const { error } = await supabase.from("biometric_credentials").delete().eq("worker_name", workerName);
    if (!error) await fetchCredentials();
    return !error;
  };

  const hasFingerprint = (workerName: string) => credentials.some((c) => c.workerName === workerName);

  const getWorkerCredentials = (workerName: string) => credentials.filter((c) => c.workerName === workerName);

  return { credentials, loading, saveCredentials, removeCredentials, hasFingerprint, getWorkerCredentials, refetch: fetchCredentials };
};
