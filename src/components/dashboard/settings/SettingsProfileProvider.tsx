"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ProfileData = {
  full_name: string | null;
  phone: string | null;
  country: string | null;
  bio: string | null;
  avatar_url: string | null;
  kyc_status: string;
  preferred_currency: string;
  created_at: string;
};

type SettingsProfileContextValue = {
  loading: boolean;
  userId: string;
  email: string;
  fullName: string;
  setFullName: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  country: string;
  setCountry: (value: string) => void;
  bio: string;
  setBio: (value: string) => void;
  avatarUrl: string | null;
  kycStatus: string;
  memberSince: string;
  preferredCurrency: string;
  setPreferredCurrency: (value: string) => void;
  savingProfile: boolean;
  savingCurrency: boolean;
  savingAvatar: boolean;
  profileSaved: boolean;
  currencySaved: boolean;
  avatarMessage: string;
  error: string;
  setError: (value: string) => void;
  saveProfile: () => Promise<void>;
  saveCurrency: (code: string) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  removeAvatar: () => Promise<void>;
};

const SettingsProfileContext = createContext<SettingsProfileContextValue | null>(null);

export function SettingsProfileProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [kycStatus, setKycStatus] = useState("none");
  const [memberSince, setMemberSince] = useState("");
  const [preferredCurrency, setPreferredCurrency] = useState("USD");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [currencySaved, setCurrencySaved] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/login?redirect=/dashboard/settings");
        return;
      }

      setUserId(user.id);
      setEmail(user.email ?? "");
      setMemberSince(user.created_at ?? "");

      supabase
        .from("profiles")
        .select(
          "full_name, phone, country, bio, avatar_url, kyc_status, preferred_currency, created_at"
        )
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            const profile = data as ProfileData;
            setFullName(profile.full_name ?? "");
            setPhone(profile.phone ?? "");
            setCountry(profile.country ?? "");
            setBio(profile.bio ?? "");
            setAvatarUrl(profile.avatar_url ?? null);
            setKycStatus(profile.kyc_status ?? "none");
            setPreferredCurrency(profile.preferred_currency ?? "USD");
            if (profile.created_at) setMemberSince(profile.created_at);
          }
          setLoading(false);
        });
    });
  }, [router]);

  const saveProfile = useCallback(async () => {
    if (!userId) return;
    setSavingProfile(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ full_name: fullName, phone, country, bio })
        .eq("id", userId);

      if (updateError) throw updateError;
      setProfileSaved(true);
      window.setTimeout(() => setProfileSaved(false), 3000);
      router.refresh();
    } catch {
      setError("saveFailed");
    } finally {
      setSavingProfile(false);
    }
  }, [country, bio, fullName, phone, router, userId]);

  const saveCurrency = useCallback(
    async (code: string) => {
      const previous = preferredCurrency;
      setPreferredCurrency(code);
      setSavingCurrency(true);
      setError("");
      try {
        const supabase = createClient();
        const { error: rpcError } = await supabase.rpc("update_user_currency", {
          p_currency: code,
        });
        if (rpcError) throw rpcError;
        setCurrencySaved(true);
        window.setTimeout(() => setCurrencySaved(false), 3000);
        router.refresh();
      } catch {
        setPreferredCurrency(previous);
        setError("saveFailed");
      } finally {
        setSavingCurrency(false);
      }
    },
    [preferredCurrency, router]
  );

  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!userId) return;

      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (!allowed.includes(file.type)) {
        setError("avatarType");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("avatarSize");
        return;
      }

      setSavingAvatar(true);
      setError("");
      setAvatarMessage("");

      try {
        const supabase = createClient();
        const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
        const path = `${userId}/avatar.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, file, { upsert: true, contentType: file.type });

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(path);

        const url = `${publicUrl}?t=${Date.now()}`;
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ avatar_url: url })
          .eq("id", userId);

        if (profileError) throw profileError;

        setAvatarUrl(url);
        setAvatarMessage("updated");
        window.setTimeout(() => setAvatarMessage(""), 3000);
        router.refresh();
      } catch {
        setError("saveFailed");
      } finally {
        setSavingAvatar(false);
      }
    },
    [router, userId]
  );

  const removeAvatar = useCallback(async () => {
    if (!userId) return;

    setSavingAvatar(true);
    setError("");
    setAvatarMessage("");

    try {
      const supabase = createClient();
      await supabase.storage.from("avatars").remove([
        `${userId}/avatar.jpg`,
        `${userId}/avatar.png`,
        `${userId}/avatar.webp`,
      ]);

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", userId);

      if (profileError) throw profileError;

      setAvatarUrl(null);
      setAvatarMessage("removed");
      window.setTimeout(() => setAvatarMessage(""), 3000);
      router.refresh();
    } catch {
      setError("saveFailed");
    } finally {
      setSavingAvatar(false);
    }
  }, [router, userId]);

  const value = useMemo(
    () => ({
      loading,
      userId,
      email,
      fullName,
      setFullName,
      phone,
      setPhone,
      country,
      setCountry,
      bio,
      setBio,
      avatarUrl,
      kycStatus,
      memberSince,
      preferredCurrency,
      setPreferredCurrency,
      savingProfile,
      savingCurrency,
      savingAvatar,
      profileSaved,
      currencySaved,
      avatarMessage,
      error,
      setError,
      saveProfile,
      saveCurrency,
      uploadAvatar,
      removeAvatar,
    }),
    [
      avatarMessage,
      avatarUrl,
      bio,
      country,
      currencySaved,
      email,
      error,
      fullName,
      kycStatus,
      loading,
      memberSince,
      phone,
      preferredCurrency,
      profileSaved,
      removeAvatar,
      saveCurrency,
      saveProfile,
      savingAvatar,
      savingCurrency,
      savingProfile,
      uploadAvatar,
      userId,
    ]
  );

  return (
    <SettingsProfileContext.Provider value={value}>{children}</SettingsProfileContext.Provider>
  );
}

export function useSettingsProfile() {
  const context = useContext(SettingsProfileContext);
  if (!context) {
    throw new Error("useSettingsProfile must be used within SettingsProfileProvider");
  }
  return context;
}
