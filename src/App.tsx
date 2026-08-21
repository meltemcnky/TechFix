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
  LogOut,
  Plus,
  Trash2,
  X,
  Zap,
} from "lucide-react";
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
const panel = "panel";
const primary = "btn-primary";
const statusLabels: Record<TicketStatus, string> = {
  new: "Yeni",
  under_review: "İnceleniyor",
  in_progress: "İşlemde",
  resolved: "Çözüldü",
  archived: "Arşivlendi",
};
const err = (value: unknown) =>
  value instanceof Error ? value.message : "Beklenmeyen bir hata oluştu.";
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
        <Empty text="Supabase ortam değişkenleri tanımlanmalıdır." />
      </Shell>
    );
  if (loading)
    return (
      <Shell>
        <Empty text="Oturum kontrol ediliyor…" />
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
          ["/firma", "Ana Sayfa"],
          ["/firma/ariza-bildir", "Arıza Bildir"],
          ["/firma/talepler", "Taleplerim"],
        ]
      : [
          ["/admin/dashboard", "Dashboard"],
          ["/admin/talepler", "Talepler"],
          ["/admin/sayaclar", "Sayaçlar"],
          ["/admin/firmalar", "Firmalar"],
          ["/admin/kategoriler", "Kategoriler"],
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
          {role && go ? (
            <div className="flex items-center gap-2">
              <button
                aria-label="Bildirimler"
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
                aria-label="Çıkış"
                className="icon-button"
                onClick={onLogout}
              >
                <LogOut size={19} />
              </button>
            </div>
          ) : (
            <span />
          )}
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
            {reset ? "Şifremi Unuttum" : "Giriş Yap"}
          </h1>
        </div>
        <input
          className={field}
          name="username"
          autoComplete="username"
          placeholder="Kullanıcı adı"
          required
        />
        {!reset ? (
          <input
            className={field}
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Şifre"
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
            ? "İşleniyor…"
            : reset
              ? "Şifre Yenileme Talebi Oluştur"
              : "Giriş Yap"}
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
          {reset ? "Giriş ekranına dön" : "Şifremi unuttum"}
        </button>
      </form>
      <InfoDialog
        open={companyResetDialog}
        title="Şifre yenileme talebi oluşturuldu"
        onClose={() => setCompanyResetDialog(false)}
      >
        <p>
          Talebiniz yönetime iletildi. Yeni şifrenizi yönetim ofisinden talep
          edebilirsiniz.
        </p>
        <dl className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4">
          <div>
            <dt className="font-semibold text-slate-800">Yönetim ofisi</dt>
            <dd>{managementContact.address}</dd>
          </div>
          <div>
            <dt className="font-semibold text-slate-800">Telefon</dt>
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
      setError("Şifreler eşleşmiyor.");
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
        "Şifre en az 12 karakter olmalı; büyük harf, küçük harf, rakam ve sembol içermelidir.",
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
    toast.show("Şifreniz yenilendi. Yeni şifrenizle giriş yapabilirsiniz.");
    go("/giris");
  };
  if (!authorized)
    return (
      <div className={`${panel} mx-auto max-w-md text-center`}>
        <h1 className="text-2xl font-bold text-navy">
          Bağlantı geçersiz veya süresi dolmuş
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          Giriş ekranından yeni bir şifre yenileme bağlantısı talep edin.
        </p>
        <button className={`${primary} mt-5`} onClick={() => go("/giris")}>
          Giriş ekranına dön
        </button>
      </div>
    );
  return (
    <form className={`${panel} mx-auto max-w-md space-y-4`} onSubmit={submit}>
      <h1 className="text-2xl font-bold text-navy">Yeni Şifre Belirle</h1>
      <p className="text-sm text-slate-500">
        En az 12 karakter; büyük harf, küçük harf, rakam ve sembol kullanın.
      </p>
      <input
        className={field}
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="Yeni şifre"
        minLength={12}
        required
      />
      <input
        className={field}
        name="confirmation"
        type="password"
        autoComplete="new-password"
        placeholder="Yeni şifre tekrar"
        minLength={12}
        required
      />
      <ErrorMessage text={error} />
      <button className={`${primary} w-full`} disabled={busy}>
        {busy ? "Kaydediliyor…" : "Şifreyi Yenile"}
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
        <PageTitle title="Taleplerim" />
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
      Açık: tickets.filter((x) => ["new", "under_review"].includes(x.status))
        .length,
      İşlemde: tickets.filter((x) => x.status === "in_progress").length,
      Çözülen: tickets.filter((x) => x.status === "resolved").length,
    }),
    [tickets],
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <p className="font-semibold text-blue-700">Firma Paneli</p>
          <h1 className="text-3xl font-bold text-navy">{company.name}</h1>
          <p className="text-slate-500">
            {[company.block, company.floor, company.office_code]
              .filter(Boolean)
              .join(" / ")}
          </p>
        </div>
        <button className={primary} onClick={() => go("/firma/ariza-bildir")}>
          <Plus className="mr-2 inline" size={18} />
          Arıza Bildir
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
      if (!user) throw new Error("Oturum bulunamadı.");
      const photo = form.get("photo");
      if (photo instanceof File && photo.size) {
        const webp = await toWebp(photo);
        path = `${company.id}/${id}/${webp.name}`;
        const { error } = await supabase.storage
          .from("ticket-photos")
          .upload(path, webp, { contentType: "image/webp" });
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
      <PageTitle title="Yeni Arıza Bildirimi" />
      <select className={field} name="categoryId" required defaultValue="">
        <option value="" disabled>
          Kategori seçin
        </option>
        {categories.map((x) => (
          <option key={x.id} value={x.id}>
            {x.name}
          </option>
        ))}
      </select>
      <input
        className={field}
        name="title"
        minLength={3}
        maxLength={160}
        placeholder="Başlık"
        required
      />
      <textarea
        className={field}
        name="description"
        minLength={10}
        maxLength={5000}
        rows={6}
        placeholder="Arızayı açıklayın"
        required
      />
      <label className="block text-sm font-medium">
        Fotoğraf (opsiyonel)
        <input
          className={`${field} mt-2`}
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
        />
      </label>
      <ErrorMessage text={error} />
      <button className={primary} disabled={busy}>
        {busy ? "Gönderiliyor…" : "Talebi Oluştur"}
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
    <p className="mt-3 text-sm text-slate-400">Fotoğraf yükleniyor…</p>
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
      .select("*,categories(name),companies(name,block,floor,office_code)")
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
                  {ticket.categories?.name}
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
                    <b>Yönetim notu:</b> {ticket.admin_public_note}
                  </p>
                ) : null}
                <p className="mt-3 text-xs text-slate-400">
                  {new Date(ticket.created_at).toLocaleString("tr-TR")}
                </p>
              </div>
            ) : null}
            <button
              className="mt-4 flex items-center gap-1 text-sm font-semibold text-blue-700"
              onClick={() => setOpen(expanded ? null : ticket.id)}
            >
              {expanded ? "Kapat" : "Detaylar"}
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </article>
        );
      })}
      {!rows.length ? <Empty text="Kayıt bulunamadı." /> : null}
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
    toast.show("Bildirimler güncellendi.");
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
  return (
    <div>
      <PageTitle
        title="Bildirimler"
        action={
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-secondary"
              onClick={() => void rpc("mark_all_notifications_read")}
            >
              Tümünü Okundu Yap
            </button>
            <button
              className="btn-danger"
              onClick={() => void rpc("clear_notifications")}
            >
              Tümünü Temizle
            </button>
          </div>
        }
      />
      <div className="space-y-3">
        {rows.map((item) => (
          <article
            className={`${panel} ${item.read_at ? "opacity-65" : ""}`}
            key={item.id}
          >
            <div className="flex gap-3">
              <button
                className="min-w-0 flex-1 text-left"
                onClick={() => target(item)}
              >
                <b className="text-navy">{item.title}</b>
                {item.companies?.name ? (
                  <span className="ml-2 text-sm text-blue-700">
                    {item.companies.name}
                  </span>
                ) : null}
                <p className="text-sm text-slate-600">{item.message}</p>
                <small className="text-slate-400">
                  {new Date(item.created_at).toLocaleString("tr-TR")}
                </small>
              </button>
              <button
                aria-label="Bildirimi kaldır"
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
                Okundu olarak işaretle
              </button>
            ) : null}
          </article>
        ))}
        {!rows.length ? <Empty text="Bildirim bulunmuyor." /> : null}
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
    [FileText, "Talepler", tickets.length, "/admin/talepler"],
    [Building2, "Aktif Firmalar", companies, "/admin/firmalar"],
    [Gauge, "Sayaçlar", meters, "/admin/sayaclar"],
  ];
  return (
    <div className="space-y-6">
      <PageTitle title="Yönetim Dashboard" />
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
          Talep Durumları
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
      .select("*,categories(name),companies(name,block,floor,office_code)")
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
      toast.show("Değişiklikler kaydedildi.");
      load();
    }
  };
  const exportCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      ["Firma", "Kategori", "Başlık", "Durum", "Tarih"],
      ...rows.map((x) => [
        x.companies?.name,
        x.categories?.name,
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
        title="Talepler"
        action={
          <button className={primary} onClick={exportCsv}>
            CSV Dışa Aktar
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
              Tüm{" "}
              {key === "company"
                ? "firmalar"
                : key === "category"
                  ? "kategoriler"
                  : "durumlar"}
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
                      {x.name}
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
                    {ticket.companies?.name} · {ticket.categories?.name}
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
                      placeholder="Firmaya görünür not"
                      maxLength={3000}
                    />
                    <button className={primary}>Güncelle</button>
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
      toast.show("Kategori oluşturuldu.");
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
      toast.show("Kategori kaldırıldı.");
      load();
    }
  };
  return (
    <div>
      <PageTitle title="Kategoriler" />
      <form
        className={`${panel} mb-6 flex flex-col gap-3 sm:flex-row`}
        onSubmit={create}
      >
        <input
          className={field}
          name="name"
          minLength={2}
          maxLength={80}
          placeholder="Kategori adı"
          required
        />
        <button className={primary}>Kategori Ekle</button>
      </form>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((x) => (
          <div
            className={`${panel} flex min-h-32 items-center justify-between gap-3`}
            key={x.id}
          >
            <b className="text-navy">{x.name}</b>
            <button
              className="icon-button text-red-700"
              aria-label={`${x.name} kategorisini kaldır`}
              onClick={() => setConfirm(x)}
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
      <ConfirmDialog
        open={!!confirm}
        title="Kategoriyi Kaldır"
        message={`${confirm?.name ?? ""} kategorisi kaldırılacaktır. Onaylıyor musunuz?`}
        danger
        confirmLabel="Kaldır"
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
        <option value="">Blok</option>
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
        <option value="">Kat</option>
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
        <option value="">Ofis/Oda</option>
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
  const toast = useToast();
  const [rows, setRows] = useState<Company[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [newLocation, setNewLocation] = useState("");
  const [passwords, setPasswords] = useState<Record<string, string>>({});
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
      toast.show("Firma oluşturuldu.");
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
        toast.show("Yeni şifre oluşturuldu.");
      } else if (action === "deactivate") {
        await invoke("company-credentials", {
          body: {
            action: "set-active",
            companyId: company.id,
            isActive: false,
          },
        });
        toast.show("Firma pasife alındı.");
        await load();
      } else {
        await invoke("company-credentials", {
          body: { action: "remove", companyId: company.id },
        });
        toast.show("Firma kaldırıldı; geçmiş talepler korundu.");
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
      toast.show("Firma aktifleştirildi.");
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
      toast.show("Lokasyon seçin.", "error");
      return;
    }
    let logoPath = company.logo_path;
    try {
      const logo = data.get("logo");
      if (logo instanceof File && logo.size) {
        const webp = await toWebp(logo, {
          maxDimension: 800,
          maxBytes: 2 * 1024 * 1024,
        });
        logoPath = `${company.id}/${webp.name}`;
        const { error } = await supabase.storage
          .from("company-logos")
          .upload(logoPath, webp, { contentType: "image/webp" });
        if (error) throw error;
      }
      const name = String(data.get("name")).trim();
      const { error } = await supabase
        .from("companies")
        .update({
          name,
          normalized_name: name.replace(/\s+/g, " ").toLocaleLowerCase("tr-TR"),
          location_id: location.id,
          block: location.block,
          floor: location.floor,
          office_code: location.office_code,
          logo_path: logoPath,
        })
        .eq("id", company.id);
      if (error) throw error;
      toast.show("Değişiklikler kaydedildi.");
      await load();
    } catch (cause) {
      toast.show(err(cause), "error");
    }
  };
  return (
    <div>
      <PageTitle title="Firmalar" />
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <form className={`${panel} h-fit space-y-3`} onSubmit={create}>
          <h2 className="text-xl font-bold text-navy">Yeni Firma Oluştur</h2>
          <input
            className={field}
            name="name"
            placeholder="Firma adı"
            required
          />
          <LocationPicker
            locations={locations}
            value={newLocation}
            onChange={setNewLocation}
          />
          <button className={`${primary} w-full`}>Firma Oluştur</button>
        </form>
        <div className="space-y-3">
          {rows.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              locations={locations}
              password={passwords[company.id]}
              onUpdate={update}
              onConfirm={(action) => setConfirm({ company, action })}
              onActivate={() => void activate(company)}
              toast={toast.show}
            />
          ))}
        </div>
      </div>
      <ConfirmDialog
        open={!!confirm}
        title="İşlemi Onayla"
        message={
          confirm?.action === "reset"
            ? `${confirm.company.name} firması için yeni şifre oluşturmak istediğinize emin misiniz?`
            : confirm?.action === "deactivate"
              ? `${confirm?.company.name} firmasını pasife almak istediğinize emin misiniz?`
              : `${confirm?.company.name} firmasını kaldırmak istediğinize emin misiniz? Geçmiş talepler korunacaktır.`
        }
        danger={confirm?.action !== "reset"}
        confirmLabel={
          confirm?.action === "reset"
            ? "Yeni Şifre Oluştur"
            : confirm?.action === "deactivate"
              ? "Pasife Al"
              : "Firmayı Kaldır"
        }
        onClose={() => setConfirm(null)}
        onConfirm={() => void execute()}
      />
    </div>
  );
}

function CompanyCard({
  company,
  locations,
  password,
  onUpdate,
  onConfirm,
  onActivate,
  toast,
}: {
  company: Company;
  locations: Location[];
  password?: string;
  onUpdate: (e: FormEvent<HTMLFormElement>, c: Company, l: string) => void;
  onConfirm: (a: "reset" | "deactivate" | "remove") => void;
  onActivate: () => void;
  toast: (m: string, k?: "success" | "error" | "info") => void;
}) {
  const [locationId, setLocationId] = useState(company.location_id ?? "");
  return (
    <form
      id={`company-${company.id}`}
      className={`${panel} space-y-3`}
      onSubmit={(e) => void onUpdate(e, company, locationId)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <input
            className={`${field} font-bold`}
            name="name"
            defaultValue={company.name}
            required
          />
          <p
            className={`mt-2 text-sm ${company.is_active ? "text-emerald-700" : "text-slate-400"}`}
          >
            {company.is_active ? "Aktif" : "Pasif"}
          </p>
        </div>
        <OverflowMenu>
          {company.is_active ? (
            <>
              <MenuButton onClick={() => onConfirm("reset")}>
                Yeni Şifre Oluştur
              </MenuButton>
              <MenuButton onClick={() => onConfirm("deactivate")} danger>
                Pasife Al
              </MenuButton>
            </>
          ) : (
            <>
              <MenuButton onClick={onActivate}>Aktifleştir</MenuButton>
              <MenuButton onClick={() => onConfirm("reset")}>
                Yeni Şifre Oluştur
              </MenuButton>
              <MenuButton onClick={() => onConfirm("remove")} danger>
                Firmayı Kaldır
              </MenuButton>
            </>
          )}
        </OverflowMenu>
      </div>
      <LocationPicker
        locations={locations}
        value={locationId}
        onChange={setLocationId}
        currentCompanyId={company.id}
      />
      <label className="block text-xs text-slate-500">
        Yeni logo (opsiyonel)
        <input
          className={`${field} mt-1`}
          name="logo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
        />
      </label>
      {password ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div>
            <small className="text-emerald-700">
              Yalnızca şimdi gösterilir
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
                .then(() => toast("Şifre kopyalandı."))
            }
          >
            <Clipboard />
          </button>
        </div>
      ) : null}
      <button className={primary}>Kaydet</button>
    </form>
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
      <PageTitle title="Sayaç Kayıtları" action={<TechnicianAccessPanel />} />
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
                    {x.meter_type === "electricity" ? "Elektrik" : "Doğalgaz"}
                  </b>
                  <p className="text-sm text-slate-500">
                    {new Date(x.created_at).toLocaleString("tr-TR")}
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
                    alt="Sayaç fotoğrafı"
                  />
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-slate-400">Sayaç değeri</dt>
                      <dd>{x.reading_value ?? "Girilmedi"}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Not</dt>
                      <dd>{x.notes || "Not yok"}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Erişim</dt>
                      <dd>{x.access_method.toUpperCase()}</dd>
                    </div>
                  </dl>
                </div>
              ) : null}
            </article>
          );
        })}
        {!rows.length ? <Empty text="Sayaç kaydı bulunmuyor." /> : null}
      </div>
    </div>
  );
}

function TechnicianAccessPanel() {
  const toast = useToast();
  const [confirm, setConfirm] = useState<"qr" | "pin" | null>(null);
  const [result, setResult] = useState<{
    url?: string;
    pin: string;
    image?: string;
  } | null>(null);
  const rotate = async () => {
    if (!confirm) return;
    const target = confirm;
    setConfirm(null);
    try {
      const data = await invoke<{ rawToken: string | null; pin: string }>(
        "technician-access",
        { body: { action: "rotate", target, pinLength: 6 } },
      );
      if (target === "qr" && data.rawToken) {
        const url = `${location.origin}/tekniker#token=${data.rawToken}`;
        const image = await createQrSheet(url, data.pin);
        setResult({ url, pin: data.pin, image });
      } else setResult({ pin: data.pin });
      toast.show(
        "Yeni bilgiler oluşturuldu. Fiziksel sayaç kutusundaki mevcut bilgilerle değiştirin.",
        "info",
      );
    } catch (cause) {
      toast.show(err(cause), "error");
    }
  };
  return (
    <>
      <OverflowMenu label="QR ve PIN işlemleri">
        <MenuButton onClick={() => setConfirm("qr")}>QR Yenile</MenuButton>
        <MenuButton onClick={() => setConfirm("pin")}>PIN Yenile</MenuButton>
      </OverflowMenu>
      <ConfirmDialog
        open={!!confirm}
        title={confirm === "qr" ? "QR ve PIN Yenile" : "PIN Yenile"}
        message={
          confirm === "qr"
            ? "QR ve fallback PIN birlikte değişecektir. Fiziksel çıktıyı yenilemeniz gerekir."
            : "Fallback PIN değişecektir. Fiziksel bilgiyi yenilemeniz gerekir."
        }
        confirmLabel="Yenile"
        onClose={() => setConfirm(null)}
        onConfirm={() => void rotate()}
      />
      {result ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/55 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex justify-between">
              <h2 className="text-xl font-bold text-navy">
                Yeni Tekniker Bilgileri
              </h2>
              <button className="icon-button" onClick={() => setResult(null)}>
                <X />
              </button>
            </div>
            <p className="mt-2 text-sm text-amber-700">
              Fiziksel sayaç kutusundaki mevcut bilgilerle değiştirin.
            </p>
            {result.image ? (
              <div className="group relative mt-4">
                <img
                  src={result.image}
                  alt="Tekniker QR ve PIN çıktısı"
                  className="mx-auto max-h-[55vh]"
                />
                <button
                  aria-label="QR görselini indir"
                  className="icon-button absolute right-2 top-2 bg-white opacity-100 shadow transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                  onClick={() =>
                    downloadDataUrl(result.image!, "teknotakip-tekniker-qr.png")
                  }
                >
                  <Download />
                </button>
              </div>
            ) : null}
            {result.url ? (
              <p className="mt-3 break-all rounded-lg bg-slate-100 p-2 text-xs">
                {result.url}
              </p>
            ) : null}
            <div className="mt-3 flex items-center justify-between rounded-xl bg-blue-50 p-4">
              <span className="font-mono text-2xl font-bold text-navy">
                {result.pin}
              </span>
              <button
                className="icon-button"
                onClick={() =>
                  void navigator.clipboard
                    .writeText(result.pin)
                    .then(() => toast.show("PIN kopyalandı."))
                }
              >
                <Clipboard />
              </button>
            </div>
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
        throw new Error("Sayaç fotoğrafı zorunludur.");
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
  if (busy && !grant) return <Empty text="Tekniker erişimi doğrulanıyor…" />;
  if (done)
    return (
      <div className={`${panel} mx-auto max-w-lg text-center`}>
        <Gauge className="mx-auto mb-3 text-emerald-600" size={48} />
        <h1 className="text-2xl font-bold text-navy">Sayaç kaydı alındı</h1>
        <p className="mt-2 text-slate-500">
          15 dakikalık erişim süresince yeni kayıt ekleyebilirsiniz.
        </p>
        <button
          className={`${primary} mt-5`}
          onClick={() => {
            setDone(false);
            setError("");
          }}
        >
          Yeni Sayaç Yükle
        </button>
      </div>
    );
  if (!grant)
    return (
      <form className={`${panel} mx-auto max-w-md space-y-4`} onSubmit={login}>
        <h1 className="text-2xl font-bold text-navy">Tekniker Girişi</h1>
        <p className="text-sm text-slate-500">
          QR kullanmadan giriş için fallback PIN’i yazın.
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
          placeholder="4–6 haneli PIN"
        />
        <ErrorMessage text={error} />
        <button className={`${primary} w-full`} disabled={busy}>
          Devam Et
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
      <PageTitle title="Sayaç Yükle" />
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className={`meter-choice electricity ${type === "electricity" ? "selected" : ""}`}
          onClick={() => setType("electricity")}
        >
          <Zap size={30} />
          ELEKTRİK
        </button>
        <button
          type="button"
          className={`meter-choice gas ${type === "natural_gas" ? "selected" : ""}`}
          onClick={() => setType("natural_gas")}
        >
          <Flame size={30} />
          DOĞALGAZ
        </button>
      </div>
      <input type="hidden" name="meterType" value={type} />
      <label className="block text-sm font-semibold">
        Sayaç fotoğrafı (zorunlu)
        <input
          className={`${field} mt-2`}
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
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
        placeholder="Sayaç değeri (opsiyonel)"
      />
      <textarea
        className={field}
        name="notes"
        maxLength={2000}
        rows={4}
        placeholder="Not (opsiyonel)"
      />
      <ErrorMessage text={error} />
      <button className={`${primary} w-full`} disabled={busy || !type}>
        {busy ? "Gönderiliyor…" : "Kaydet"}
      </button>
    </form>
  );
}
