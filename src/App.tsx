import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  BarChart3,
  Bell,
  Building2,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Download,
  FileText,
  Flame,
  Gauge,
  LoaderCircle,
  LogOut,
  Plus,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import i18n from "./i18n";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ApiError,
  invoke,
  isSupabaseConfigured,
  supabase,
} from "./services/supabase";
import { toWebp } from "./utils/imageCompressor";
import { createQrSheet, downloadDataUrl } from "./utils/qrSheet";
import {
  ConfirmDialog,
  InfoDialog,
  ImageLightbox,
  MenuButton,
  OverflowMenu,
  ToastProvider,
  useToast,
} from "./components/ui";
import { managementContact } from "./config";
import type {
  Category,
  Company,
  Location,
  MeterReading,
  Notification,
  Role,
  Ticket,
  TicketStatus,
} from "./types";
import teknoTakipLogo from "../images/mt_logo.png";

const field = "field";
const tx = (key: string) => String(i18n.t(key));
const formatDateTime = (value: string) => new Date(value).toLocaleString(i18n.resolvedLanguage === "en" ? "en-US" : "tr-TR");
const categoryLabel = (category: Pick<Category, "code" | "name">) =>
  i18n.exists(`categories.${category.code}`) ? tx(`categories.${category.code}`) : category.name;
const panel = "panel";
const primary = "btn-primary";
const statusLabels: Record<TicketStatus, string> = {
  get new() { return tx("ticket.new"); },
  get under_review() { return tx("ticket.underReview"); },
  get in_progress() { return tx("ticket.inProgress"); },
  get resolved() { return tx("ticket.resolved"); },
  get archived() { return tx("ticket.archived"); },
};
const err = (value: unknown) =>
  value instanceof Error ? value.message : tx("errors.unexpected");
const notifyChanged = () => dispatchEvent(new Event("notifications-changed"));
function useRoute() {
  const [route, setRoute] = useState(location.pathname + location.search);
  useEffect(() => {
    const listener = () => setRoute(location.pathname + location.search);
    addEventListener("popstate", listener);
    return () => removeEventListener("popstate", listener);
  }, []);
  return {
    path: route.split("?")[0],
    search: new URLSearchParams(route.split("?")[1] ?? ""),
    go: (next: string) => {
      history.pushState({}, "", next);
      setRoute(next);
      scrollTo(0, 0);
    },
  };
}

export default function App() {
  return (
    <ToastProvider>
      <AppCore />
    </ToastProvider>
  );
}
function AppCore() {
  useTranslation();
  const { path, search, go } = useRoute();
  const [role, setRole] = useState<Role>("guest");
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const classify = async (current: Session | null) => {
      if (!current) {
        setRole("guest");
        setCompany(null);
        setLoading(false);
        return;
      }
      const [{ data: admin }, { data: firm }] = await Promise.all([
        supabase
          .from("admin_users")
          .select("user_id,is_active")
          .eq("user_id", current.user.id)
          .maybeSingle(),
        supabase
          .from("companies")
          .select("*")
          .eq("auth_user_id", current.user.id)
          .maybeSingle(),
      ]);
      if (admin?.is_active) setRole("admin");
      else if (firm?.is_active && !firm.removed_at) {
        setRole("company");
        setCompany(firm as Company);
      } else {
        await supabase.auth.signOut();
        setRole("guest");
        setCompany(null);
      }
      setLoading(false);
    };
    void supabase.auth.getSession().then(({ data }) => classify(data.session));
    const { data } = supabase.auth.onAuthStateChange(
      (_event, current) => void classify(current),
    );
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (loading) return;
    if (path === "/" || (path === "/giris" && role !== "guest"))
      go(
        role === "admin"
          ? "/admin/dashboard"
          : role === "company"
            ? "/firma"
            : "/giris",
      );
    else if (path.startsWith("/admin") && role !== "admin") go("/giris");
    else if (path.startsWith("/firma") && role !== "company") go("/giris");
  }, [loading, path, role]);
  if (!isSupabaseConfigured)
    return (
      <Shell>
        <Empty text={tx("common.notConfigured")} />
      </Shell>
    );
  if (loading)
    return (
      <Shell>
        <Empty text={tx("common.sessionChecking")} />
      </Shell>
    );
  if (path.startsWith("/tekniker"))
    return (
      <Shell>
        <Technician />
      </Shell>
    );
  if (path === "/sifre-yenile")
    return (
      <Shell>
        <PasswordRecovery authorized={role === "admin"} go={go} />
      </Shell>
    );
  if (role === "guest")
    return (
      <Shell>
        <Login go={go} />
      </Shell>
    );
  return (
    <Shell
      role={role}
      go={go}
      onLogout={() => void supabase.auth.signOut().then(() => go("/giris"))}
    >
      {role === "company" && company ? (
        <CompanyArea path={path} search={search} go={go} company={company} />
      ) : null}
      {role === "admin" ? (
        <AdminArea path={path} search={search} go={go} />
      ) : null}
    </Shell>
  );
}

function Shell({
  children,
  role,
  go,
  onLogout,
}: {
  children: ReactNode;
  role?: Role;
  go?: (path: string) => void;
  onLogout?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [unread, setUnread] = useState(0);
  const load = () => {
    if (!role) return;
    void supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("audience", role)
      .is("read_at", null)
      .then(({ count }) => setUnread(count ?? 0));
  };
  useEffect(() => {
    load();
    addEventListener("notifications-changed", load);
    return () => removeEventListener("notifications-changed", load);
  }, [role]);
  const nav =
    role === "company"
      ? [
          ["/firma", t("nav.home")],
          ["/firma/ariza-bildir", t("nav.createTicket")],
          ["/firma/talepler", t("nav.myTickets")],
        ]
      : [
          ["/admin/dashboard", t("nav.dashboard")],
          ["/admin/talepler", t("nav.tickets")],
          ["/admin/sayaclar", t("nav.meters")],
          ["/admin/firmalar", t("nav.companies")],
          ["/admin/kategoriler", t("nav.categories")],
        ];
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto grid min-h-16 max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4">
          <button
            className="flex items-center gap-3 text-left"
            onClick={() =>
              go?.(role === "admin" ? "/admin/dashboard" : "/firma")
            }
          >
            <img
              src={teknoTakipLogo}
              alt="TeknoTakip"
              className="h-11 w-11 rounded-xl object-contain"
            />
            <span className="hidden sm:block">
              <b className="text-xl text-navy">TeknoTakip</b>
              <small className="block text-slate-500">
                Medeniyet Teknopark
              </small>
            </span>
          </button>
          {role && go ? (
            <nav className="flex justify-center gap-1 overflow-x-auto text-sm">
              {nav.map(([href, label]) => (
                <button
                  className="nav-button"
                  key={href}
                  onClick={() => go(href)}
                >
                  {label}
                </button>
              ))}
            </nav>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5" aria-label={t("language.select")}>
              {(["tr", "en"] as const).map((language) => (
                <button
                  type="button"
                  key={language}
                  className={`rounded-md px-2 py-1 text-xs font-bold ${i18n.resolvedLanguage === language ? "bg-navy text-white" : "text-slate-500"}`}
                  onClick={() => void i18n.changeLanguage(language)}
                >
                  {t(`language.${language}`)}
                </button>
              ))}
            </div>
          {role && go ? (
            <>
              <button
                aria-label={t("nav.notifications")}
                className="icon-button relative"
                onClick={() =>
                  go(
                    role === "admin"
                      ? "/admin/bildirimler"
                      : "/firma/bildirimler",
                  )
                }
              >
                <Bell size={20} />
                {unread ? (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                    {unread > 99 ? "99+" : unread}
                  </span>
                ) : null}
              </button>
              <button
                aria-label={t("nav.logout")}
                className="icon-button"
                onClick={onLogout}
              >
                <LogOut size={19} />
              </button>
            </>
          ) : null}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className={`${panel} mx-auto max-w-xl text-center text-slate-500`}>
      {text}
    </div>
  );
}
function ErrorMessage({ text }: { text: string }) {
  return text ? (
    <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {text}
    </p>
  ) : null;
}
function PageTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-3">
      <h1 className="text-2xl font-bold text-navy sm:text-3xl">{title}</h1>
      {action}
    </div>
  );
}

function Login({ go }: { go: (path: string) => void }) {
  const { t } = useTranslation();
  const [reset, setReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [companyResetDialog, setCompanyResetDialog] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      if (reset) {
        const result = await invoke<{
          accountType: "company" | "admin" | "unknown";
          message: string;
        }>(
          "company-credentials",
          {
            body: {
              action: "request-reset",
              username: form.get("username"),
            },
          },
        );
        if (result.accountType === "company") setCompanyResetDialog(true);
        else setMessage(result.message);
      } else {
        const result = await invoke<{
          role: "admin" | "company";
          session: Session;
        }>("company-credentials", {
          body: {
            action: "login",
            username: form.get("username"),
            password: form.get("password"),
          },
        });
        await supabase.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token,
        });
        go(result.role === "admin" ? "/admin/dashboard" : "/firma");
      }
    } catch (cause) {
      setError(err(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mx-auto max-w-md pt-6">
      <form className={`${panel} space-y-4`} onSubmit={submit}>
        <div>
          <p className="text-sm font-semibold text-blue-700">TeknoTakip</p>
          <h1 className="text-2xl font-bold text-navy">
            {reset ? t("auth.forgotTitle") : t("auth.title")}
          </h1>
        </div>
        <input
          className={field}
          name="username"
          autoComplete="username"
          placeholder={t("auth.username")}
          required
        />
        {!reset ? (
          <input
            className={field}
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder={t("auth.password")}
            required
          />
        ) : null}
        <ErrorMessage text={error} />
        {message ? (
          <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
            {message}
          </p>
        ) : null}
        <button className={`${primary} w-full`} disabled={busy}>
          {busy
            ? t("auth.processing")
            : reset
              ? t("auth.resetRequest")
              : t("auth.login")}
        </button>
        <button
          type="button"
          className="w-full text-sm text-blue-700 hover:underline"
          onClick={() => {
            setReset((x) => !x);
            setError("");
            setMessage("");
          }}
        >
          {reset ? t("auth.backToLogin") : t("auth.forgot")}
        </button>
      </form>
      <InfoDialog
        open={companyResetDialog}
        title={t("auth.resetDialog")}
        onClose={() => setCompanyResetDialog(false)}
      >
        <p>
          {t("auth.companyResetHelp")}
        </p>
        <dl className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4">
          <div>
            <dt className="font-semibold text-slate-800">{t("auth.managementOffice")}</dt>
            <dd>{managementContact.address}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-800">{t("auth.phone")}</dt>
            <dd>
              <a
                className="text-blue-700 hover:underline"
                href={`tel:${managementContact.phone.replace(/\s/g, "")}`}
              >
                {managementContact.phone}
              </a>
            </dd>
          </div>
        </dl>
      </InfoDialog>
    </div>
  );
}

function PasswordRecovery({
  authorized,
  go,
}: {
  authorized: boolean;
  go: (path: string) => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (password !== confirmation) {
      setError(t("errors.passwordMismatch"));
      return;
    }
    if (
      password.length < 12 ||
      !/[a-z]/.test(password) ||
      !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      setError(
        t("errors.passwordStrength"),
      );
      return;
    }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setBusy(false);
      return;
    }
    await supabase.auth.signOut();
    toast.show(t("auth.passwordUpdated"));
    go("/giris");
  };
  if (!authorized)
    return (
      <div className={`${panel} mx-auto max-w-md text-center`}>
        <h1 className="text-2xl font-bold text-navy">
          {t("auth.invalidRecovery")}
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          {t("auth.requestNewLink")}
        </p>
        <button className={`${primary} mt-5`} onClick={() => go("/giris")}>
          {t("auth.backToLogin")}
        </button>
      </div>
    );
  return (
    <form className={`${panel} mx-auto max-w-md space-y-4`} onSubmit={submit}>
      <h1 className="text-2xl font-bold text-navy">{t("auth.newPassword")}</h1>
      <p className="text-sm text-slate-500">
        {t("auth.passwordHint")}
      </p>
      <input
        className={field}
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder={t("auth.newPassword")}
        minLength={12}
        required
      />
      <input
        className={field}
        name="confirmation"
        type="password"
        autoComplete="new-password"
        placeholder={t("auth.newPasswordAgain")}
        minLength={12}
        required
      />
      <ErrorMessage text={error} />
      <button className={`${primary} w-full`} disabled={busy}>
        {busy ? t("common.saving") : t("auth.updatePassword")}
      </button>
    </form>
  );
}

function CompanyArea({
  path,
  search,
  go,
  company,
}: {
  path: string;
  search: URLSearchParams;
  go: (path: string) => void;
  company: Company;
}) {
  if (path === "/firma/ariza-bildir")
    return (
      <TicketCreate company={company} onDone={() => go("/firma/talepler")} />
    );
  if (path === "/firma/bildirimler")
    return <Notifications audience="company" go={go} />;
  if (path === "/firma/talepler")
    return (
      <>
        <PageTitle title={tx("nav.myTickets")} />
        <TicketList companyId={company.id} initialId={search.get("ticket")} />
      </>
    );
  return <CompanyHome company={company} go={go} />;
}
function CompanyHome({
  company,
  go,
}: {
  company: Company;
  go: (path: string) => void;
}) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  useEffect(() => {
    void supabase
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setTickets((data as Ticket[]) ?? []));
  }, []);
  const values = useMemo(
    () => ({
      [tx("company.open")]: tickets.filter((x) => ["new", "under_review"].includes(x.status))
        .length,
      [tx("company.inProgress")]: tickets.filter((x) => x.status === "in_progress").length,
      [tx("company.resolved")]: tickets.filter((x) => x.status === "resolved").length,
    }),
    [tickets],
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <p className="font-semibold text-blue-700">{tx("company.panel")}</p>
          <h1 className="text-3xl font-bold text-navy">{company.name}</h1>
          <p className="text-slate-500">
            {[company.block, company.floor, company.office_code]
              .filter(Boolean)
              .join(" / ")}
          </p>
        </div>
        <button className={primary} onClick={() => go("/firma/ariza-bildir")}>
          <Plus className="mr-2 inline" size={18} />
          {tx("nav.createTicket")}
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {Object.entries(values).map(([label, value]) => (
          <div className={panel} key={label}>
            <p className="text-slate-500">{label}</p>
            <b className="text-3xl text-navy">{value}</b>
          </div>
        ))}
      </div>
      <TicketList companyId={company.id} limit={5} />
    </div>
  );
}
function TicketCreate({
  company,
  onDone,
}: {
  company: Company;
  onDone: () => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    void supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setCategories((data as Category[]) ?? []));
  }, []);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const id = crypto.randomUUID();
    let path: string | null = null;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error(tx("errors.sessionMissing"));
      const photo = form.get("photo");
      if (photo instanceof File && photo.size) {
        const webp = await toWebp(photo);
        path = `${company.id}/${id}/${webp.name}`;
        const { error } = await supabase.storage
          .from("ticket-photos")
          .upload(path, webp, { contentType: webp.type });
        if (error) throw error;
      }
      const { error } = await supabase
        .from("tickets")
        .insert({
          id,
          company_id: company.id,
          category_id: form.get("categoryId"),
          title: form.get("title"),
          description: form.get("description"),
          photo_path: path,
          created_by: user.id,
        });
      if (error) throw error;
      onDone();
    } catch (cause) {
      if (path) await supabase.storage.from("ticket-photos").remove([path]);
      setError(err(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className={`${panel} mx-auto max-w-2xl space-y-4`} onSubmit={submit}>
      <PageTitle title={tx("ticket.newReport")} />
      <select className={field} name="categoryId" required defaultValue="">
        <option value="" disabled>
          {tx("ticket.chooseCategory")}
        </option>
        {categories.map((x) => (
          <option key={x.id} value={x.id}>
            {categoryLabel(x)}
          </option>
        ))}
      </select>
      <input
        className={field}
        name="title"
        minLength={3}
        maxLength={160}
        placeholder={tx("ticket.title")}
        required
      />
      <textarea
        className={field}
        name="description"
        minLength={10}
        maxLength={5000}
        rows={6}
        placeholder={tx("ticket.description")}
        required
      />
      <label className="block text-sm font-medium">
        {tx("ticket.photo")}
        <input
          className={`${field} mt-2`}
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        />
      </label>
      <ErrorMessage text={error} />
      <button className={primary} disabled={busy}>
        {busy ? tx("ticket.sending") : tx("ticket.create")}
      </button>
    </form>
  );
}
function SignedPhoto({
  bucket,
  path,
  alt,
}: {
  bucket: "ticket-photos" | "meter-photos";
  path: string;
  alt: string;
}) {
  const [url, setUrl] = useState("");
  const [lightbox, setLightbox] = useState(false);
  useEffect(() => {
    void supabase.storage
      .from(bucket)
      .createSignedUrl(path, 300)
      .then(({ data }) => setUrl(data?.signedUrl ?? ""));
  }, [bucket, path]);
  return url ? (
    <>
      <button
        type="button"
        className="mt-4 block overflow-hidden rounded-xl border border-slate-200"
        onClick={() => setLightbox(true)}
      >
        <img src={url} alt={alt} className="max-h-80 w-full object-contain" />
      </button>
      {lightbox ? (
        <ImageLightbox url={url} alt={alt} onClose={() => setLightbox(false)} />
      ) : null}
    </>
  ) : (
    <p className="mt-3 text-sm text-slate-400">{tx("photo.loading")}</p>
  );
}
function TicketList({
  companyId,
  limit,
  initialId,
}: {
  companyId?: string;
  limit?: number;
  initialId?: string | null;
}) {
  const [rows, setRows] = useState<Ticket[]>([]);
  const [open, setOpen] = useState<string | null>(initialId ?? null);
  const [error, setError] = useState("");
  useEffect(() => {
    let query = supabase
      .from("tickets")
      .select("*,categories(code,name),companies(name,block,floor,office_code)")
      .order("created_at", { ascending: false });
    if (companyId) query = query.eq("company_id", companyId);
    if (limit) query = query.limit(limit);
    void query.then(({ data, error }) => {
      setRows((data as Ticket[]) ?? []);
      if (error) setError(error.message);
    });
  }, [companyId, limit]);
  useEffect(() => {
    if (initialId && rows.length)
      setTimeout(
        () =>
          document
            .getElementById(`ticket-${initialId}`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" }),
        50,
      );
  }, [initialId, rows]);
  return (
    <div className="space-y-3">
      <ErrorMessage text={error} />
      {rows.map((ticket) => {
        const expanded = open === ticket.id;
        return (
          <article id={`ticket-${ticket.id}`} className={panel} key={ticket.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-blue-700">
                  {ticket.categories ? categoryLabel(ticket.categories) : ""}
                  {ticket.companies?.name ? ` · ${ticket.companies.name}` : ""}
                </p>
                <h3 className="mt-1 font-bold text-navy">{ticket.title}</h3>
                {!expanded ? (
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                    {ticket.description}
                  </p>
                ) : null}
              </div>
              <span className="status-pill">{statusLabels[ticket.status]}</span>
            </div>
            {expanded ? (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="whitespace-pre-wrap text-sm text-slate-700">
                  {ticket.description}
                </p>
                {ticket.photo_path ? (
                  <SignedPhoto
                    bucket="ticket-photos"
                    path={ticket.photo_path}
                    alt={ticket.title}
                  />
                ) : null}
                {ticket.admin_public_note ? (
                  <p className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
                    <b>{tx("ticket.managementNote")}</b> {ticket.admin_public_note}
                  </p>
                ) : null}
                <p className="mt-3 text-xs text-slate-400">
                  {formatDateTime(ticket.created_at)}
                </p>
              </div>
            ) : null}
            <button
              className="mt-4 flex items-center gap-1 text-sm font-semibold text-blue-700"
              onClick={() => setOpen(expanded ? null : ticket.id)}
            >
              {expanded ? tx("common.close") : tx("common.details")}
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </article>
        );
      })}
      {!rows.length ? <Empty text={tx("common.noRecords")} /> : null}
    </div>
  );
}

function Notifications({
  audience,
  go,
}: {
  audience: "admin" | "company";
  go: (path: string) => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const [rows, setRows] = useState<Notification[]>([]);
  const load = () =>
    void supabase
      .from("notifications")
      .select("*,companies(name)")
      .eq("audience", audience)
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data as Notification[]) ?? []));
  useEffect(load, [audience]);
  const rpc = async (name: string, id?: string) => {
    const { error } = await supabase.rpc(
      name,
      id ? { notification_id: id } : undefined,
    );
    if (error) {
      toast.show(error.message, "error");
      return;
    }
    if (name === "mark_all_notifications_read") toast.show(t("notifications.allRead"));
    if (name === "clear_notifications") toast.show(t("notifications.cleared"));
    load();
    notifyChanged();
  };
  const target = (item: Notification) => {
    if (item.ticket_id)
      go(
        `${audience === "admin" ? "/admin" : "/firma"}/talepler?ticket=${item.ticket_id}`,
      );
    else if (item.meter_reading_id)
      go(`/admin/sayaclar?meter=${item.meter_reading_id}`);
    else if (item.company_id) go(`/admin/firmalar?company=${item.company_id}`);
  };
  const notificationText = (item: Notification) => {
    if (item.translation_key === "notifications.ticketUpdated") {
      const status = item.translation_params?.status ?? "updated";
      return { title: t("notifications.ticketUpdated.title"), message: t(`notifications.ticketUpdated.message.${status}`) };
    }
    if (item.translation_key === "notifications.passwordRequest") {
      return { title: t("notifications.passwordRequest.title"), message: t("notifications.passwordRequest.message") };
    }
    if (item.translation_key === "notifications.meterCreated") {
      const meterType = item.translation_params?.meterType ?? "natural_gas";
      return { title: t("notifications.meterCreated.title"), message: t(`notifications.meterCreated.message.${meterType}`) };
    }
    return { title: item.title, message: item.message };
  };
  return (
    <div>
      <PageTitle
        title={t("notifications.title")}
        action={
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-secondary"
              onClick={() => void rpc("mark_all_notifications_read")}
            >
              {t("notifications.markAll")}
            </button>
            <button
              className="btn-danger"
              onClick={() => void rpc("clear_notifications")}
            >
              {t("notifications.clearAll")}
            </button>
          </div>
        }
      />
      <div className="space-y-3">
        {rows.map((item) => {
          const text = notificationText(item);
          return (
          <article
            className={`${panel} ${item.read_at ? "opacity-65" : ""}`}
            key={item.id}
          >
            <div className="flex gap-3">
              <button
                className="min-w-0 flex-1 text-left"
                onClick={() => target(item)}
              >
                <b className="text-navy">{text.title}</b>
                {item.companies?.name ? (
                  <span className="ml-2 text-sm text-blue-700">
                    {item.companies.name}
                  </span>
                ) : null}
                <p className="text-sm text-slate-600">{text.message}</p>
                <small className="text-slate-400">
                  {formatDateTime(item.created_at)}
                </small>
              </button>
              <button
                aria-label={t("notifications.remove")}
                className="icon-button"
                onClick={() => void rpc("remove_notification", item.id)}
              >
                <X size={18} />
              </button>
            </div>
            {!item.read_at ? (
              <button
                className="mt-3 text-sm font-semibold text-blue-700"
                onClick={() => void rpc("mark_notification_read", item.id)}
              >
                {t("notifications.markRead")}
              </button>
            ) : null}
          </article>
          );
        })}
        {!rows.length ? <Empty text={t("notifications.none")} /> : null}
      </div>
    </div>
  );
}

function AdminArea({
  path,
  search,
  go,
}: {
  path: string;
  search: URLSearchParams;
  go: (path: string) => void;
}) {
  if (path === "/admin/talepler")
    return <AdminTickets initialId={search.get("ticket")} />;
  if (path === "/admin/sayaclar")
    return <AdminMeters initialId={search.get("meter")} />;
  if (path === "/admin/firmalar")
    return <AdminCompanies initialId={search.get("company")} />;
  if (path === "/admin/kategoriler") return <AdminCategories />;
  if (path === "/admin/bildirimler")
    return <Notifications audience="admin" go={go} />;
  return <AdminDashboard go={go} />;
}
function AdminDashboard({ go }: { go: (path: string) => void }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [companies, setCompanies] = useState(0);
  const [meters, setMeters] = useState(0);
  useEffect(() => {
    void Promise.all([
      supabase.from("tickets").select("*"),
      supabase
        .from("companies")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true)
        .is("removed_at", null),
      supabase
        .from("meter_readings")
        .select("*", { count: "exact", head: true }),
    ]).then(([t, c, m]) => {
      setTickets((t.data as Ticket[]) ?? []);
      setCompanies(c.count ?? 0);
      setMeters(m.count ?? 0);
    });
  }, []);
  const data = Object.entries(statusLabels).map(([status, label]) => ({
    status: label,
    adet: tickets.filter((x) => x.status === status).length,
  }));
  const metrics: [typeof FileText, string, number, string][] = [
    [FileText, tx("nav.tickets"), tickets.length, "/admin/talepler"],
    [Building2, tx("admin.activeCompanies"), companies, "/admin/firmalar"],
    [Gauge, tx("nav.meters"), meters, "/admin/sayaclar"],
  ];
  return (
    <div className="space-y-6">
      <PageTitle title={tx("admin.title")} />
      <div className="grid gap-3 sm:grid-cols-3">
        {metrics.map(([Icon, label, value, path]) => (
          <button
            className={`${panel} text-left`}
            key={label}
            onClick={() => go(path)}
          >
            <Icon className="text-blue-700" />
            <p className="mt-3 text-slate-500">{label}</p>
            <b className="text-3xl text-navy">{value}</b>
          </button>
        ))}
      </div>
      <div className={panel}>
        <h2 className="mb-4 flex items-center gap-2 font-bold text-navy">
          <BarChart3 />
          {tx("admin.ticketStatuses")}
        </h2>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="status" stroke="#64748b" />
              <YAxis allowDecimals={false} stroke="#64748b" />
              <Tooltip />
              <Bar dataKey="adet" fill="#173968" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function AdminTickets({ initialId }: { initialId: string | null }) {
  const toast = useToast();
  const [rows, setRows] = useState<Ticket[]>([]);
  const [filters, setFilters] = useState({
    status: "",
    company: "",
    category: "",
    date: "",
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(initialId);
  const load = () => {
    let query = supabase
      .from("tickets")
      .select("*,categories(code,name),companies(name,block,floor,office_code)")
      .order("created_at", { ascending: false });
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.company) query = query.eq("company_id", filters.company);
    if (filters.category) query = query.eq("category_id", filters.category);
    if (filters.date)
      query = query
        .gte("created_at", `${filters.date}T00:00:00`)
        .lt("created_at", `${filters.date}T23:59:59.999`);
    void query.then(({ data }) => setRows((data as Ticket[]) ?? []));
  };
  useEffect(load, [filters]);
  useEffect(() => {
    void Promise.all([
      supabase.from("companies").select("*").order("name"),
      supabase.from("categories").select("*").order("sort_order"),
    ]).then(([c, k]) => {
      setCompanies((c.data as Company[]) ?? []);
      setCategories((k.data as Category[]) ?? []);
    });
  }, []);
  useEffect(() => {
    if (initialId && rows.length)
      setTimeout(
        () =>
          document
            .getElementById(`admin-ticket-${initialId}`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" }),
        50,
      );
  }, [initialId, rows]);
  const update = async (event: FormEvent<HTMLFormElement>, id: string) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = String(data.get("status")) as TicketStatus;
    const { error } = await supabase
      .from("tickets")
      .update({
        status: next,
        admin_public_note: String(data.get("note") ?? "") || null,
        resolved_at: next === "resolved" ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (error) toast.show(error.message, "error");
    else {
      toast.show(tx("ticket.saved"));
      load();
    }
  };
  const exportCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      [tx("csv.company"), tx("csv.category"), tx("csv.title"), tx("csv.status"), tx("csv.date")],
      ...rows.map((x) => [
        x.companies?.name,
        x.categories ? categoryLabel(x.categories) : "",
        x.title,
        statusLabels[x.status],
        x.created_at,
      ]),
    ]
      .map((r) => r.map(esc).join(","))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
    );
    downloadDataUrl(
      url,
      `teknotakip-talepler-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    URL.revokeObjectURL(url);
  };
  return (
    <div>
      <PageTitle
        title={tx("nav.tickets")}
        action={
          <button className={primary} onClick={exportCsv}>
            {tx("ticket.exportCsv")}
          </button>
        }
      />
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        {(["company", "category", "status"] as const).map((key) => (
          <select
            className={field}
            key={key}
            value={filters[key]}
            onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
          >
            <option value="">
              {key === "company"
                ? tx("ticket.allCompanies")
                : key === "category"
                  ? tx("ticket.allCategories")
                  : tx("ticket.allStatuses")}
            </option>
            {key === "company"
              ? companies.map((x) => (
                  <option value={x.id} key={x.id}>
                    {x.name}
                  </option>
                ))
              : key === "category"
                ? categories.map((x) => (
                    <option value={x.id} key={x.id}>
                      {categoryLabel(x)}
                    </option>
                  ))
                : Object.entries(statusLabels).map(([v, l]) => (
                    <option value={v} key={v}>
                      {l}
                    </option>
                  ))}
          </select>
        ))}
        <input
          className={field}
          type="date"
          value={filters.date}
          onChange={(e) => setFilters({ ...filters, date: e.target.value })}
        />
      </div>
      <div className="space-y-3">
        {rows.map((ticket) => {
          const expanded = open === ticket.id;
          return (
            <form
              id={`admin-ticket-${ticket.id}`}
              className={panel}
              key={ticket.id}
              onSubmit={(e) => void update(e, ticket.id)}
            >
              <button
                type="button"
                className="flex w-full items-start justify-between gap-3 text-left"
                onClick={() => setOpen(expanded ? null : ticket.id)}
              >
                <div>
                  <p className="text-xs font-semibold text-blue-700">
                    {ticket.companies?.name} · {ticket.categories ? categoryLabel(ticket.categories) : ""}
                  </p>
                  <h2 className="font-bold text-navy">{ticket.title}</h2>
                  {!expanded ? (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                      {ticket.description}
                    </p>
                  ) : null}
                </div>
                {expanded ? <ChevronUp /> : <ChevronDown />}
              </button>
              {expanded ? (
                <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                  <p className="whitespace-pre-wrap text-sm text-slate-700">
                    {ticket.description}
                  </p>
                  {ticket.photo_path ? (
                    <SignedPhoto
                      bucket="ticket-photos"
                      path={ticket.photo_path}
                      alt={ticket.title}
                    />
                  ) : null}
                  <div className="grid gap-3 md:grid-cols-[220px_1fr_auto]">
                    <select
                      className={field}
                      name="status"
                      defaultValue={ticket.status}
                    >
                      {Object.entries(statusLabels).map(([v, l]) => (
                        <option value={v} key={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                    <input
                      className={field}
                      name="note"
                      defaultValue={ticket.admin_public_note ?? ""}
                      placeholder={tx("ticket.visibleNote")}
                      maxLength={3000}
                    />
                    <button className={primary}>{tx("ticket.update")}</button>
                  </div>
                </div>
              ) : null}
            </form>
          );
        })}
      </div>
    </div>
  );
}

function AdminCategories() {
  const toast = useToast();
  const [rows, setRows] = useState<Category[]>([]);
  const [confirm, setConfirm] = useState<Category | null>(null);
  const load = () =>
    void supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setRows((data as Category[]) ?? []));
  useEffect(load, []);
  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get("name") ?? "");
    const { error } = await supabase.rpc("admin_create_category", {
      category_name: name,
    });
    if (error) toast.show(error.message, "error");
    else {
      form.reset();
      toast.show(tx("category.created"));
      load();
    }
  };
  const remove = async () => {
    if (!confirm) return;
    const { error } = await supabase.rpc("admin_remove_category", {
      category_id: confirm.id,
    });
    setConfirm(null);
    if (error) toast.show(error.message, "error");
    else {
      toast.show(tx("category.removed"));
      load();
    }
  };
  return (
    <div>
      <PageTitle title={tx("category.title")} />
      <form
        className={`${panel} mb-6 flex flex-col gap-3 sm:flex-row`}
        onSubmit={create}
      >
        <input
          className={field}
          name="name"
          minLength={2}
          maxLength={80}
          placeholder={tx("category.name")}
          required
        />
        <button className={primary}>{tx("category.add")}</button>
      </form>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((x) => (
          <div
            className={`${panel} flex min-h-32 items-center justify-between gap-3`}
            key={x.id}
          >
            <b className="text-navy">{categoryLabel(x)}</b>
            <button
              className="icon-button text-red-700"
              aria-label={`${tx("category.remove")}: ${categoryLabel(x)}`}
              onClick={() => setConfirm(x)}
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
      <ConfirmDialog
        open={!!confirm}
        title={tx("category.remove")}
        message={String(i18n.t("category.confirmRemove", { name: confirm?.name ?? "" }))}
        danger
        confirmLabel={tx("common.remove")}
        onClose={() => setConfirm(null)}
        onConfirm={() => void remove()}
      />
    </div>
  );
}

function LocationPicker({
  locations,
  value,
  onChange,
  currentCompanyId,
}: {
  locations: Location[];
  value: string;
  onChange: (id: string) => void;
  currentCompanyId?: string;
}) {
  const { t } = useTranslation();
  const current = locations.find((x) => x.id === value);
  const [block, setBlock] = useState(current?.block ?? "");
  const [floor, setFloor] = useState(current?.floor ?? "");
  useEffect(() => {
    const item = locations.find((x) => x.id === value);
    if (item) {
      setBlock(item.block);
      setFloor(item.floor);
    }
  }, [value, locations]);
  const blocks = [...new Set(locations.map((x) => x.block))];
  const floors = [
    ...new Set(locations.filter((x) => x.block === block).map((x) => x.floor)),
  ];
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <select
        className={field}
        value={block}
        onChange={(e) => {
          setBlock(e.target.value);
          setFloor("");
          onChange("");
        }}
        required
      >
        <option value="">{t("location.block")}</option>
        {blocks.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
      <select
        className={field}
        value={floor}
        onChange={(e) => {
          setFloor(e.target.value);
          onChange("");
        }}
        required
        disabled={!block}
      >
        <option value="">{t("location.floor")}</option>
        {floors.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
      <select
        className={field}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        disabled={!floor}
      >
        <option value="">{t("location.office")}</option>
        {locations
          .filter((x) => x.block === block && x.floor === floor)
          .map((x) => {
            const occupants = (x.companies ?? []).filter((c) => !c.removed_at);
            const disabled =
              occupants.some((c) => c.id !== currentCompanyId) &&
              x.id !== value;
            return (
              <option value={x.id} key={x.id} disabled={disabled}>
                {x.office_code}
                {occupants.length
                  ? ` — ${occupants.map((c) => c.name).join(", ")}`
                  : ""}
              </option>
            );
          })}
      </select>
    </div>
  );
}

function AdminCompanies({ initialId }: { initialId: string | null }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [rows, setRows] = useState<Company[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [newLocation, setNewLocation] = useState("");
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Company | null>(null);
  const [confirm, setConfirm] = useState<{
    company: Company;
    action: "reset" | "deactivate" | "remove";
  } | null>(null);
  const load = async () => {
    const [c, l] = await Promise.all([
      supabase
        .from("companies")
        .select("*")
        .is("removed_at", null)
        .order("name"),
      supabase
        .from("locations")
        .select("*,companies(id,name,is_active,removed_at)")
        .eq("is_active", true)
        .order("block")
        .order("floor")
        .order("office_code"),
    ]);
    setRows((c.data as Company[]) ?? []);
    setLocations((l.data as Location[]) ?? []);
  };
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (initialId && rows.length)
      setTimeout(
        () =>
          document
            .getElementById(`company-${initialId}`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" }),
        50,
      );
  }, [initialId, rows]);
  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const result = await invoke<{
        company: { id: string };
        password: string;
      }>("company-credentials", {
        body: {
          action: "create",
          name: new FormData(form).get("name"),
          locationId: newLocation,
        },
      });
      setPasswords((x) => ({ ...x, [result.company.id]: result.password }));
      form.reset();
      setNewLocation("");
      toast.show(t("company.created"));
      await load();
    } catch (cause) {
      toast.show(err(cause), "error");
    }
  };
  const execute = async () => {
    if (!confirm) return;
    const { company, action } = confirm;
    setConfirm(null);
    try {
      if (action === "reset") {
        const result = await invoke<{ password: string }>(
          "company-credentials",
          { body: { action: "reset", companyId: company.id } },
        );
        setPasswords((x) => ({ ...x, [company.id]: result.password }));
        toast.show(t("company.passwordCreated"));
      } else if (action === "deactivate") {
        await invoke("company-credentials", {
          body: {
            action: "set-active",
            companyId: company.id,
            isActive: false,
          },
        });
        toast.show(t("company.deactivated"));
        await load();
      } else {
        await invoke("company-credentials", {
          body: { action: "remove", companyId: company.id },
        });
        toast.show(t("company.removed"));
        await load();
      }
    } catch (cause) {
      toast.show(err(cause), "error");
    }
  };
  const activate = async (company: Company) => {
    try {
      await invoke("company-credentials", {
        body: { action: "set-active", companyId: company.id, isActive: true },
      });
      toast.show(t("company.activated"));
      await load();
    } catch (cause) {
      toast.show(err(cause), "error");
    }
  };
  const update = async (
    event: FormEvent<HTMLFormElement>,
    company: Company,
    locationId: string,
  ) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const location = locations.find((x) => x.id === locationId);
    if (!location) {
      toast.show(t("location.required"), "error");
      return;
    }
    try {
      const name = String(data.get("name")).trim();
      await invoke("company-credentials", {
        body: {
          action: "update",
          companyId: company.id,
          name,
          locationId: location.id,
          logoPath: company.logo_path,
        },
      });
      setEditing(null);
      toast.show(t("company.updated"));
      await load();
    } catch (cause) {
      toast.show(err(cause), "error");
    }
  };
  return (
    <div>
      <PageTitle title={t("company.title")} />
      <div className="space-y-6">
        <form className={`${panel} grid gap-3 md:grid-cols-[1fr_2fr_auto] md:items-end`} onSubmit={create}>
          <label className="text-sm font-semibold text-slate-700">
            {t("company.name")}
          <input
            className={`${field} mt-1`}
            name="name"
            placeholder={t("company.name")}
            required
          />
          </label>
          <LocationPicker
            locations={locations}
            value={newLocation}
            onChange={setNewLocation}
          />
          <button className={primary}>{t("company.createButton")}</button>
        </form>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              locations={locations}
              password={passwords[company.id]}
              onEdit={() => setEditing(company)}
              onConfirm={(action) => setConfirm({ company, action })}
              onActivate={() => void activate(company)}
              toast={toast.show}
            />
          ))}
        </div>
      </div>
      <EditCompanyDialog
        company={editing}
        locations={locations}
        onClose={() => setEditing(null)}
        onSave={update}
      />
      <ConfirmDialog
        open={!!confirm}
        title={t("company.confirmTitle")}
        message={
          confirm?.action === "reset"
            ? t("company.confirmReset", { name: confirm.company.name })
            : confirm?.action === "deactivate"
              ? t("company.confirmDeactivate", { name: confirm?.company.name })
              : t("company.confirmRemove", { name: confirm?.company.name })
        }
        danger={confirm?.action !== "reset"}
        confirmLabel={
          confirm?.action === "reset"
            ? t("company.resetPassword")
            : confirm?.action === "deactivate"
              ? t("company.deactivate")
              : t("company.remove")
        }
        onClose={() => setConfirm(null)}
        onConfirm={() => void execute()}
      />
    </div>
  );
}

function CompanyCard({
  company,
  password,
  onEdit,
  onConfirm,
  onActivate,
  toast,
}: {
  company: Company;
  password?: string;
  locations: Location[];
  onEdit: () => void;
  onConfirm: (a: "reset" | "deactivate" | "remove") => void;
  onActivate: () => void;
  toast: (m: string, k?: "success" | "error" | "info") => void;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const location = [company.block, company.floor, company.office_code].filter(Boolean).join(" / ");
  return (
    <article
      id={`company-${company.id}`}
      className={`${panel} flex min-h-40 flex-col justify-between gap-4 p-4`}
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 flex-1 truncate font-bold text-navy" title={company.name}>{company.name}</h2>
        <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${company.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
          {company.is_active ? t("common.active") : t("common.inactive")}
        </span>
        <OverflowMenu>
          <MenuButton onClick={onEdit}>{t("common.edit")}</MenuButton>
          {company.is_active ? (
            <>
              <MenuButton onClick={() => onConfirm("reset")}>
                {t("company.resetPassword")}
              </MenuButton>
              <MenuButton onClick={() => onConfirm("deactivate")} danger>
                {t("company.deactivate")}
              </MenuButton>
            </>
          ) : (
            <>
              <MenuButton onClick={onActivate}>{t("company.activate")}</MenuButton>
              <MenuButton onClick={() => onConfirm("reset")}>
                {t("company.resetPassword")}
              </MenuButton>
              <MenuButton onClick={() => onConfirm("remove")} danger>
                {t("company.remove")}
              </MenuButton>
            </>
          )}
        </OverflowMenu>
      </div>
      <p className="text-sm text-slate-500">{location || "—"}</p>
      {password ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <div>
            <small className="text-emerald-700">
              {t("company.passwordOneTime")}
            </small>
            <p className="font-mono text-2xl font-bold tracking-wider text-emerald-900">
              {password}
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={() =>
              void navigator.clipboard
                .writeText(password)
                .then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1600);
                })
            }
          >
              {copied ? <span className="text-xs font-bold">{t("clipboard.copied")}</span> : <Clipboard />}
            </button>
          </div>
        ) : null}
    </article>
  );
}

function EditCompanyDialog({
  company,
  locations,
  onClose,
  onSave,
}: {
  company: Company | null;
  locations: Location[];
  onClose: () => void;
  onSave: (e: FormEvent<HTMLFormElement>, c: Company, l: string) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [locationId, setLocationId] = useState("");
  useEffect(() => {
    setName(company?.name ?? "");
    setLocationId(company?.location_id ?? "");
  }, [company]);
  if (!company) return null;
  const dirty = name.trim() !== company.name || locationId !== (company.location_id ?? "");
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/55 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl" onSubmit={(e) => void onSave(e, company, locationId)}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-navy">{t("company.edit")}</h2>
          <button type="button" className="icon-button" aria-label={t("common.close")} onClick={onClose}><X size={18} /></button>
        </div>
        <label className="block text-sm font-semibold text-slate-700">
          {t("company.name")}
          <input className={`${field} mt-1`} name="name" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={160} required />
        </label>
        <LocationPicker locations={locations} value={locationId} onChange={setLocationId} currentCompanyId={company.id} />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>{t("common.cancel")}</button>
          <button className={primary} disabled={!dirty || !name.trim() || !locationId}>{t("common.save")}</button>
        </div>
      </form>
    </div>
  );
}

function AdminMeters({ initialId }: { initialId: string | null }) {
  const [rows, setRows] = useState<MeterReading[]>([]);
  const [open, setOpen] = useState(initialId);
  useEffect(() => {
    void supabase
      .from("meter_readings")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data as MeterReading[]) ?? []));
  }, []);
  useEffect(() => {
    if (initialId && rows.length)
      setTimeout(
        () =>
          document
            .getElementById(`meter-${initialId}`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" }),
        50,
      );
  }, [initialId, rows]);
  return (
    <div>
      <PageTitle title={tx("meter.records")} action={<TechnicianAccessPanel />} />
      <div className="space-y-3">
        {rows.map((x) => {
          const expanded = open === x.id;
          return (
            <article id={`meter-${x.id}`} className={panel} key={x.id}>
              <button
                className="flex w-full items-center justify-between gap-3 text-left"
                onClick={() => setOpen(expanded ? null : x.id)}
              >
                <div>
                  <b className="text-navy">
                    {x.meter_type === "electricity" ? tx("meter.electricity") : tx("meter.gas")}
                  </b>
                  <p className="text-sm text-slate-500">
                    {formatDateTime(x.created_at)}
                    {x.reading_value !== null ? ` · ${x.reading_value}` : ""}
                  </p>
                </div>
                {expanded ? <ChevronUp /> : <ChevronDown />}
              </button>
              {expanded ? (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <SignedPhoto
                    bucket="meter-photos"
                    path={x.photo_path}
                    alt={tx("meter.photoAlt")}
                  />
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-slate-400">{tx("meter.value")}</dt>
                      <dd>{x.reading_value ?? tx("meter.notEntered")}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">{tx("meter.note")}</dt>
                      <dd>{x.notes || tx("meter.noNote")}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">{tx("meter.access")}</dt>
                      <dd>{x.access_method.toUpperCase()}</dd>
                    </div>
                  </dl>
                </div>
              ) : null}
            </article>
          );
        })}
        {!rows.length ? <Empty text={tx("meter.none")} /> : null}
      </div>
    </div>
  );
}

function TechnicianAccessPanel() {
  const { t } = useTranslation();
  const [confirm, setConfirm] = useState<"qr" | "pin" | null>(null);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<{
    status: "rotating" | "rendering" | "ready" | "error";
    target: "qr" | "pin";
    url?: string;
    pin?: string;
    image?: string;
    error?: string;
  } | null>(null);

  const renderQr = async (url: string, pin: string) => {
    setResult({ status: "rendering", target: "qr", url, pin });
    try {
      const image = await createQrSheet(url, pin, {
        title: t("qr.sheetTitle"),
        help: t("qr.sheetHelp"),
        warning: t("qr.sheetWarning"),
      });
      setResult({ status: "ready", target: "qr", url, pin, image });
    } catch {
      setResult({ status: "error", target: "qr", url, pin, error: t("qr.renderFailed") });
    }
  };

  const rotate = async () => {
    if (!confirm) return;
    const target = confirm;
    setConfirm(null);
    setResult({ status: "rotating", target });
    try {
      const data = await invoke<{ rawToken: string | null; pin: string }>(
        "technician-access",
        { body: { action: "rotate", target, pinLength: 6 } },
      );
      if (target === "qr" && data.rawToken) {
        await renderQr(`${location.origin}/tekniker#token=${data.rawToken}`, data.pin);
      } else {
        setResult({ status: "ready", target, pin: data.pin });
      }
    } catch (cause) {
      setResult({ status: "error", target, error: err(cause) });
    }
  };

  const loading = result?.status === "rotating" || result?.status === "rendering";
  return (
    <>
      <OverflowMenu label={t("qr.menu")}>
        <MenuButton onClick={() => setConfirm("qr")}>{t("qr.refresh")}</MenuButton>
        <MenuButton onClick={() => setConfirm("pin")}>{t("qr.refreshPin")}</MenuButton>
      </OverflowMenu>
      <ConfirmDialog
        open={!!confirm}
        title={confirm === "qr" ? t("qr.confirmTitle") : t("qr.refreshPin")}
        message={confirm === "qr" ? t("qr.confirmMessage") : t("qr.pinConfirmMessage")}
        confirmLabel={confirm === "qr" ? t("qr.refresh") : t("qr.refreshPin")}
        onClose={() => setConfirm(null)}
        onConfirm={() => void rotate()}
      />
      {result ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/55 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex justify-between gap-3">
              <h2 className="text-xl font-bold text-navy">{t("qr.ready")}</h2>
              <button className="icon-button" disabled={loading} aria-label={t("common.close")} onClick={() => setResult(null)}><X /></button>
            </div>
            {loading ? (
              <div className="grid min-h-72 place-items-center text-center">
                <div>
                  <LoaderCircle className="mx-auto animate-spin text-blue-700" size={48} />
                  <p className="mt-4 font-semibold text-slate-600">{result.status === "rotating" ? t("qr.rotating") : t("qr.preparing")}</p>
                </div>
              </div>
            ) : null}
            {result.status === "ready" ? <p className="mt-2 text-sm text-amber-700">{t("qr.replacePhysical")}</p> : null}
            {result.error ? <div className="mt-4"><ErrorMessage text={result.error} /></div> : null}
            {result.status === "error" && result.url && result.pin ? (
              <button className={`${primary} mt-4`} onClick={() => void renderQr(result.url!, result.pin!)}>{t("common.retry")}</button>
            ) : null}
            {result.image ? (
              <div className="group relative mt-4">
                <img src={result.image} alt={t("qr.ready")} className="mx-auto max-h-[55vh]" />
                <button aria-label={t("qr.download")} className="icon-button absolute right-2 top-2 bg-white opacity-100 shadow transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100" onClick={() => downloadDataUrl(result.image!, "teknotakip-tekniker-qr.png")}><Download /></button>
              </div>
            ) : null}
            {result.url ? <p className="mt-3 break-all rounded-lg bg-slate-100 p-2 text-xs">{result.url}</p> : null}
            {result.pin ? (
              <div className="mt-3 flex items-center justify-between rounded-xl bg-blue-50 p-4">
                <span className="font-mono text-2xl font-bold text-navy">{result.pin}</span>
                <button className="icon-button" onClick={() => void navigator.clipboard.writeText(result.pin!).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); })}>
                  {copied ? <span className="text-xs font-bold">{t("clipboard.copied")}</span> : <Clipboard />}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

const TECH_SESSION = "teknotakip-technician-grant";
function Technician() {
  const token = new URLSearchParams(location.hash.slice(1)).get("token");
  const stored = (() => {
    try {
      const value = JSON.parse(sessionStorage.getItem(TECH_SESSION) ?? "null");
      return value?.expiresAt > Date.now() ? value : null;
    } catch {
      return null;
    }
  })();
  const [grant, setGrant] = useState(stored?.grant ?? "");
  const [expiresAt, setExpiresAt] = useState(stored?.expiresAt ?? 0);
  const [busy, setBusy] = useState(Boolean(token));
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const saveGrant = (value: { grant: string; expiresAt: number }) => {
    setGrant(value.grant);
    setExpiresAt(value.expiresAt);
    sessionStorage.setItem(TECH_SESSION, JSON.stringify(value));
  };
  const clearGrant = () => {
    setGrant("");
    setExpiresAt(0);
    sessionStorage.removeItem(TECH_SESSION);
  };
  useEffect(() => {
    if (!token) return;
    void invoke<{ grant: string; expiresAt: number }>("technician-access", {
      body: { action: "validate", qrToken: token },
    })
      .then((value) => {
        saveGrant(value);
        history.replaceState({}, "", "/tekniker");
      })
      .catch((cause) => setError(err(cause)))
      .finally(() => setBusy(false));
  }, [token]);
  useEffect(() => {
    if (!expiresAt) return;
    const timer = setTimeout(clearGrant, Math.max(0, expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [expiresAt]);
  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = new FormData(event.currentTarget);
      saveGrant(
        await invoke<{ grant: string; expiresAt: number }>(
          "technician-access",
          { body: { action: "validate", pin: data.get("pin") } },
        ),
      );
    } catch (cause) {
      setError(err(cause));
    } finally {
      setBusy(false);
    }
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = new FormData(event.currentTarget);
      const source = data.get("photo");
      if (!(source instanceof File) || !source.size)
        throw new Error(tx("meter.photoRequired"));
      data.set("photo", await toWebp(source));
      data.set("grant", grant);
      await invoke("technician-access", { body: data });
      setDone(true);
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "grant_expired")
        clearGrant();
      setError(err(cause));
    } finally {
      setBusy(false);
    }
  };
  if (busy && !grant) return <Empty text={tx("technician.verifying")} />;
  if (done)
    return (
      <div className={`${panel} mx-auto max-w-lg text-center`}>
        <Gauge className="mx-auto mb-3 text-emerald-600" size={48} />
        <h1 className="text-2xl font-bold text-navy">{tx("technician.success")}</h1>
        <p className="mt-2 text-slate-500">
          {tx("technician.accessDuration")}
        </p>
        <button
          className={`${primary} mt-5`}
          onClick={() => {
            setDone(false);
            setError("");
          }}
        >
          {tx("technician.newUpload")}
        </button>
      </div>
    );
  if (!grant)
    return (
      <form className={`${panel} mx-auto max-w-md space-y-4`} onSubmit={login}>
        <h1 className="text-2xl font-bold text-navy">{tx("technician.login")}</h1>
        <p className="text-sm text-slate-500">
          {tx("technician.pinHelp")}
        </p>
        <input
          className={field}
          name="pin"
          type="password"
          inputMode="numeric"
          pattern="[0-9]{4,6}"
          minLength={4}
          maxLength={6}
          required
          placeholder={tx("technician.pinPlaceholder")}
        />
        <ErrorMessage text={error} />
        <button className={`${primary} w-full`} disabled={busy}>
          {tx("common.continue")}
        </button>
      </form>
    );
  return <TechnicianForm onSubmit={submit} busy={busy} error={error} />;
}
function TechnicianForm({
  onSubmit,
  busy,
  error,
}: {
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  busy: boolean;
  error: string;
}) {
  const [type, setType] = useState<"electricity" | "natural_gas" | "">("");
  return (
    <form className={`${panel} mx-auto max-w-xl space-y-5`} onSubmit={onSubmit}>
      <PageTitle title={tx("technician.upload")} />
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className={`meter-choice electricity ${type === "electricity" ? "selected" : ""}`}
          onClick={() => setType("electricity")}
        >
          <Zap size={30} />
          {tx("meter.electricity").toUpperCase()}
        </button>
        <button
          type="button"
          className={`meter-choice gas ${type === "natural_gas" ? "selected" : ""}`}
          onClick={() => setType("natural_gas")}
        >
          <Flame size={30} />
          {tx("meter.gas").toUpperCase()}
        </button>
      </div>
      <input type="hidden" name="meterType" value={type} />
      <label className="block text-sm font-semibold">
        {tx("meter.photoRequired")}
        <input
          className={`${field} mt-2`}
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          capture="environment"
          required
        />
      </label>
      <input
        className={field}
        name="readingValue"
        type="number"
        inputMode="decimal"
        min="0"
        step="0.001"
        placeholder={tx("meter.valuePlaceholder")}
      />
      <textarea
        className={field}
        name="notes"
        maxLength={2000}
        rows={4}
        placeholder={tx("meter.notePlaceholder")}
      />
      <ErrorMessage text={error} />
      <button className={`${primary} w-full`} disabled={busy || !type}>
        {busy ? tx("ticket.sending") : tx("meter.submit")}
      </button>
    </form>
  );
}
