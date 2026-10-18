import React, { useEffect, useRef, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import axios from "axios";
import Select from "react-select";
import ReactModal from "react-modal";
import ReCAPTCHA from "react-google-recaptcha";
import { formatDistanceToNow, parseISO } from "date-fns";
import { faHeart } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import useProfile from "../../hooks/useProfile";
import useAuth from "../../hooks/useAuth";
import { useAuthOptions } from "../../hooks/useAuthOptions";
import { SupporterBadge } from "../user/UserName";
import { PatreonModal } from "../store/support/PatreonModal";

const LANGUAGES = ["English", "French", "Spanish", "Portuguese", "Italian", "German", "Chinese"];

const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const timezoneOptions = (() => {
  try {
    return (Intl as any).supportedValuesOf("timeZone") as string[];
  } catch {
    return [browserTimezone];
  }
})().map((tz) => ({ value: tz, label: tz.replace(/_/g, " ") }));

const primaryButton =
  "px-3 py-1 rounded bg-blue-700 hover:bg-blue-600 text-white text-sm font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed";
const secondaryButton =
  "px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed";
const dangerButton =
  "px-3 py-1 rounded border border-red-700 text-red-400 hover:bg-red-700 hover:text-white text-sm font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed";
const inputClass =
  "w-full bg-gray-800 border border-gray-600 focus:border-gray-400 rounded px-3 py-1 text-sm text-white outline-none";

const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    backgroundColor: "#1f2937",
    borderColor: state.isFocused ? "#9ca3af" : "#4b5563",
    boxShadow: "none",
    minHeight: 32,
    "&:hover": { borderColor: "#9ca3af" },
  }),
  valueContainer: (base: any) => ({ ...base, padding: "0 12px" }),
  singleValue: (base: any) => ({ ...base, color: "white", fontSize: "0.875rem" }),
  input: (base: any) => ({ ...base, color: "white", fontSize: "0.875rem" }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base: any) => ({ ...base, padding: 4 }),
  menu: (base: any) => ({ ...base, backgroundColor: "#1f2937", border: "1px solid #4b5563", zIndex: 20 }),
  option: (base: any, state: any) => ({
    ...base,
    fontSize: "0.875rem",
    color: "white",
    backgroundColor: state.isSelected ? "#1d4ed8" : state.isFocused ? "#374151" : "transparent",
  }),
};

const formatDate = (date: Date, timeZone?: string) => {
  try {
    return date.toLocaleDateString(undefined, { timeZone, dateStyle: "long" });
  } catch (e) {
    return date.toLocaleDateString(undefined, { dateStyle: "long" });
  }
};

const tierName = (level: number | null | undefined) => {
  if (!level) return null;
  if (level >= 10) return "Gold Supporter";
  if (level >= 5) return "Silver Supporter";
  if (level >= 3) return "Bronze Supporter";
  return "Supporter";
};

type Status = { kind: "info" | "success" | "error"; message: string } | null;

const StatusText: React.FC<{ status: Status }> = ({ status }) => {
  if (!status) return null;
  const color = status.kind === "error" ? "text-red-400" : status.kind === "success" ? "text-green-400" : "text-gray-400";
  return <span className={`text-sm ${color}`} role="status">{status.message}</span>;
};

const Section: React.FC<{ title: string; danger?: boolean; children: React.ReactNode }> = ({ title, danger, children }) => (
  <section className="mb-10">
    <h2 className={`text-lg font-semibold pb-2 mb-4 border-b ${danger ? "text-red-400 border-red-900" : "text-white border-gray-700"}`}>
      {title}
    </h2>
    {children}
  </section>
);

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-2">
    <div className="sm:w-40 flex-shrink-0 text-sm text-gray-400">{label}</div>
    <div className="flex-1 min-w-0 text-sm text-gray-100">{children}</div>
  </div>
);

const AccountSection: React.FC<{ user: any }> = ({ user }) => {
  const authOptions = useAuthOptions();
  const recaptchaRef = useRef<any>(null);
  const [status, setStatus] = useState<Status>(null);
  const insertedDate = parseISO(user.inserted_at);
  const verified = user.email_confirmed_at != null;

  const verify = async () => {
    setStatus({ kind: "info", message: "Verifying…" });
    try {
      const token = await recaptchaRef.current.executeAsync();
      await axios.post("/be/api/v1/recaptcha/verify", { token }, authOptions);
      user.doFetchHash(Date.now());
      setStatus({ kind: "success", message: "Account verified." });
    } catch (e) {
      setStatus({ kind: "error", message: "Verification failed. Please try again." });
    }
  };

  return (
    <Section title="Account">
      <Row label="Alias">
        <SupporterBadge level={user.supporter_level} />
        {user.alias}
      </Row>
      <Row label="Email">
        <div className="flex items-center flex-wrap gap-2">
          <span className="truncate">{user.email}</span>
          {verified ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-900 text-green-300">Verified</span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900 text-yellow-300">Not verified</span>
          )}
        </div>
      </Row>
      {!verified && (
        <Row label="">
          <div className="flex items-center flex-wrap gap-3">
            <button type="button" className={primaryButton} onClick={verify} disabled={status?.kind === "info"}>
              Verify account
            </button>
            <StatusText status={status} />
          </div>
          <ReCAPTCHA ref={recaptchaRef} sitekey="6LeTSD4oAAAAAPXnFo2EqTAWWJS6qUE7Yf4RuRgU" size="invisible" />
        </Row>
      )}
      <Row label="Member since">
        {formatDate(insertedDate, user.timezone || undefined)}
        <span className="text-gray-400"> ({formatDistanceToNow(insertedDate, { addSuffix: true })})</span>
      </Row>
    </Section>
  );
};

const SupporterSection: React.FC<{ user: any }> = ({ user }) => {
  const authOptions = useAuthOptions();
  const authOptionsRef = useRef(authOptions);
  authOptionsRef.current = authOptions;
  const history = useHistory();
  const location = useLocation();
  const [showPatreon, setShowPatreon] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const requested = useRef(false);
  const tier = tierName(user.supporter_level);

  const patreonHref =
    "https://www.patreon.com/oauth2/authorize?response_type=code" +
    `&client_id=${process.env.REACT_APP_PATREON_CLIENT_ID}` +
    "&scope=identity%20identity.memberships" +
    `&redirect_uri=${process.env.REACT_APP_PATREON_REDIRECT_URI}`;

  // Patreon redirects back to /auth/patreon?code=... after the user approves
  useEffect(() => {
    if (requested.current || !location.pathname.startsWith("/auth/patreon")) return;
    const code = new URLSearchParams(location.search).get("code");
    if (!code) return;
    requested.current = true;
    (async () => {
      setStatus({ kind: "info", message: "Linking your Patreon account…" });
      // Kept from the original flow: gives the auth token time to renew after
      // returning from Patreon before the request below uses it.
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const res = await axios.get("/be/api/patreon/" + code, authOptionsRef.current);
        if (!res?.data?.success) throw new Error("link failed");
        user.doFetchHash(Date.now());
        setStatus({ kind: "success", message: "Patreon account linked." });
      } catch (e) {
        setStatus({
          kind: "error",
          message: "Couldn't link your Patreon account. Please try again. If this keeps happening, email dragncards@gmail.com with your DragnCards email, Patreon email (if different), and Patreon tier.",
        });
      }
      // Drop the one-time code from the address bar
      history.replace("/profile");
    })();
  }, [location.pathname]);

  return (
    <Section title="Supporter">
      <Row label="Status">
        {tier ? (
          <span className="font-medium">
            <SupporterBadge level={user.supporter_level} />
            {tier}
          </span>
        ) : (
          <div className="flex items-center flex-wrap gap-3">
            <span className="text-gray-300">Not a supporter</span>
            <button type="button" className={secondaryButton} onClick={() => setShowPatreon(true)}>
              <FontAwesomeIcon icon={faHeart} className="text-pink-400 mr-2" />
              Become a supporter
            </button>
          </div>
        )}
      </Row>
      <Row label="Patreon">
        <div className="flex items-center flex-wrap gap-3">
          <span className={user.patreon_member_id ? "text-gray-100" : "text-gray-400"}>
            {user.patreon_member_id ? "Linked" : "Not linked"}
          </span>
          <button type="button" className={secondaryButton} onClick={() => { window.location.href = patreonHref; }}>
            <img className="inline-block mr-2 align-middle" style={{ height: 14 }} src="https://upload.wikimedia.org/wikipedia/commons/9/94/Patreon_logo.svg" alt="" />
            {user.patreon_member_id ? "Re-sync Patreon" : "Link Patreon"}
          </button>
        </div>
      </Row>
      {status && (
        <Row label="">
          <StatusText status={status} />
        </Row>
      )}
      {user.supporter_level > 0 && !user.patreon_member_id && (
        <div className="mt-2 rounded border border-yellow-700 bg-yellow-900 bg-opacity-30 px-3 py-2 text-sm text-yellow-200">
          Please link your Patreon account to keep your supporter benefits.
        </div>
      )}
      <PatreonModal isOpen={showPatreon} isLoggedIn={true} closeModal={() => setShowPatreon(false)} />
    </Section>
  );
};

const PreferencesSection: React.FC<{ user: any }> = ({ user }) => {
  const authOptions = useAuthOptions();
  const savedLanguage = user.language || "English";
  const savedTimezone = user.timezone || browserTimezone;
  const [language, setLanguage] = useState(savedLanguage);
  const [timezone, setTimezone] = useState(savedTimezone);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const dirty = language !== savedLanguage || timezone !== savedTimezone;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      await axios.post("/be/api/v1/profile/update", { user: { language, timezone } }, authOptions);
      user.setData({ user_profile: { ...user, language, timezone } });
      setStatus({ kind: "success", message: "Saved" });
    } catch (e) {
      setStatus({ kind: "error", message: "Couldn't save. Please try again." });
    }
    setSaving(false);
  };

  return (
    <Section title="Preferences">
      <form onSubmit={save} className="space-y-4 max-w-md">
        <div>
          <label htmlFor="language" className="block text-sm text-gray-300 mb-1">Language</label>
          <select
            id="language"
            value={language}
            onChange={(e) => { setLanguage(e.target.value); setStatus(null); }}
            className={inputClass}
          >
            {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <p className="mt-1 text-xs text-gray-500">Used for site text and, where a plugin supports it, card images.</p>
        </div>
        <div>
          <label htmlFor="timezone" className="block text-sm text-gray-300 mb-1">Timezone</label>
          <Select
            inputId="timezone"
            options={timezoneOptions}
            value={timezoneOptions.find((o) => o.value === timezone) || { value: timezone, label: timezone }}
            onChange={(option: any) => { if (option) { setTimezone(option.value); setStatus(null); } }}
            styles={selectStyles}
          />
          <p className="mt-1 text-xs text-gray-500">Used to show times on the site.</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" className={primaryButton} disabled={!dirty || saving}>
            {saving ? "Saving…" : "Save preferences"}
          </button>
          <StatusText status={status} />
        </div>
      </form>
    </Section>
  );
};

const DangerSection: React.FC = () => {
  const authOptions = useAuthOptions();
  const history = useHistory();
  const { logOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(false);

  const close = () => {
    if (deleting) return;
    setOpen(false);
    setConfirmText("");
    setError(false);
  };

  const deleteAccount = async () => {
    setDeleting(true);
    setError(false);
    try {
      await axios.delete("/be/api/v1/profile", authOptions);
      logOut();
      history.push("/");
    } catch (e) {
      setError(true);
      setDeleting(false);
    }
  };

  return (
    <Section title="Danger zone" danger>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-red-900 px-4 py-3">
        <div className="flex-1">
          <div className="text-sm font-medium text-white">Delete account</div>
          <div className="text-sm text-gray-400">
            Permanently delete your account, saved games, decks and custom content. This can't be undone.
          </div>
        </div>
        <button type="button" className={dangerButton} onClick={() => setOpen(true)}>
          Delete account
        </button>
      </div>

      <ReactModal
        isOpen={open}
        onRequestClose={close}
        contentLabel="Delete account"
        overlayClassName="fixed inset-0 bg-black-50 z-50 flex items-start justify-center p-4"
        className="mt-24 w-full max-w-md bg-gray-800 border border-gray-600 rounded-lg p-5 text-white outline-none"
      >
        <h3 className="text-lg font-semibold mb-2">Delete your account?</h3>
        <p className="text-sm text-gray-300 mb-4">
          This permanently deletes your account, saved games, decks and custom content. It can't be undone.
        </p>
        <label htmlFor="confirm-delete" className="block text-sm text-gray-300 mb-1">
          Type <span className="font-mono font-semibold text-white">DELETE</span> to confirm
        </label>
        <input
          id="confirm-delete"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className={inputClass}
          autoComplete="off"
          autoFocus
        />
        {error && <p className="mt-2 text-sm text-red-400">Couldn't delete your account. Please try again.</p>}
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" className={secondaryButton} onClick={close} disabled={deleting}>
            Cancel
          </button>
          <button
            type="button"
            className="px-3 py-1 rounded bg-red-700 hover:bg-red-600 text-white text-sm font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={deleteAccount}
            disabled={confirmText !== "DELETE" || deleting}
          >
            {deleting ? "Deleting…" : "Delete my account"}
          </button>
        </div>
      </ReactModal>
    </Section>
  );
};

export const Profile: React.FC = () => {
  const user: any = useProfile();
  if (user == null) {
    return null;
  }

  return (
    <div className="text-white mx-auto w-full p-4 overflow-y-auto" style={{ maxWidth: "720px" }}>
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>
      <AccountSection user={user} />
      <SupporterSection user={user} />
      <PreferencesSection user={user} />
      <DangerSection />
    </div>
  );
};
export default Profile;
