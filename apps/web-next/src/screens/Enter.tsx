import { KeyRound, UserRound } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useSearchParams } from 'react-router';

import { TopBar } from '../components/Shell.js';
import { useIdentity } from '../lib/identity.js';
import { useLocale } from '../lib/locale.js';
import { Navigate, useNav } from '../lib/nav.js';
import { Art } from '../site/art.js';
import { useSite } from '../site/Site.js';
import { Button } from '../ui/button.js';
import { Field, Input, Notice, Spinner } from '../ui/primitives.js';

/*
  TWO WAYS IN, SIDE BY SIDE, NEITHER HIDDEN BEHIND THE OTHER.

  An account keeps studies across devices; a name alone keeps them in this
  browser. Every USER_SET value carries whoever entered it, so even a guest is
  asked for a name — there is no anonymous mode, because a badge saying "you
  entered this" with nobody behind it would be a lie.
*/
export function Enter(): JSX.Element {
  const { t } = useLocale();
  const s = useSite();
  const { actor, signIn, continueAsGuest } = useIdentity();
  const [params] = useSearchParams();
  const navigate = useNav();
  const next = safeNext(params.get('next'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  if (actor) return <Navigate to={next} replace />;

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      navigate(next, { replace: true });
    } catch (err) {
      setError((err as Error).message || t.enter.failed);
    } finally {
      setBusy(false);
    }
  };

  const guest = (e: FormEvent): void => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setNameError(t.enter.nameTooShort);
      return;
    }
    continueAsGuest(name);
    navigate(next, { replace: true });
  };

  return (
    <div className="flex min-h-full flex-col bg-base">
      <TopBar />
      <main className="grid flex-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,32%)]">
        <div className="canvas-grid grid place-items-center px-4 py-12">
          <div className="grid w-full max-w-4xl gap-4">
            <header className="mb-2 grid gap-2 text-center">
              <h1 className="text-[30px] font-light tracking-[-0.02em] text-fg">{t.enter.title}</h1>
              <p className="mx-auto max-w-xl text-[14px] text-secondary">{t.enter.lede}</p>
            </header>
            <div className="grid gap-4 md:grid-cols-2">
              <form onSubmit={submit} className="grid content-start gap-4 rounded-lg border border-line bg-panel p-6" noValidate>
                <div className="flex items-center gap-2.5">
                  <KeyRound className="size-4 text-accent" aria-hidden="true" />
                  <h2 className="text-[15px] font-semibold text-fg">{t.enter.accountTitle}</h2>
                </div>
                <p className="text-[13px] text-secondary">{t.enter.accountBody}</p>
                <Field label={t.enter.email}>
                  {({ id, describedBy, invalid }) => (
                    <Input
                      id={id}
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      aria-describedby={describedBy}
                      aria-invalid={invalid || undefined}
                      required
                    />
                  )}
                </Field>
                <Field label={t.enter.password}>
                  {({ id, describedBy }) => (
                    <Input
                      id={id}
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      aria-describedby={describedBy}
                      required
                    />
                  )}
                </Field>
                {error ? <Notice>{error}</Notice> : null}
                <Button type="submit" variant="primary" aria-busy={busy || undefined} disabled={busy || !email || !password}>
                  {busy ? <Spinner /> : null}
                  {t.enter.signIn}
                </Button>
                <p className="text-[12px] text-secondary">
                  {t.enter.noAccount}{' '}
                  <a href="/sign-up" className="text-accent-strong underline underline-offset-2 hover:text-fg">
                    {t.enter.createOnClassic}
                  </a>
                </p>
              </form>

              <form onSubmit={guest} className="grid content-start gap-4 rounded-lg border border-line bg-panel p-6" noValidate>
                <div className="flex items-center gap-2.5">
                  <UserRound className="size-4 text-accent" aria-hidden="true" />
                  <h2 className="text-[15px] font-semibold text-fg">{t.enter.guestTitle}</h2>
                </div>
                <p className="text-[13px] text-secondary">{t.enter.guestBody}</p>
                <Field label={t.enter.name} hint={t.enter.nameHint} error={nameError}>
                  {({ id, describedBy, invalid }) => (
                    <Input
                      id={id}
                      autoComplete="name"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setNameError(null);
                      }}
                      aria-describedby={describedBy}
                      aria-invalid={invalid || undefined}
                    />
                  )}
                </Field>
                <Button type="submit" variant="secondary">
                  {t.enter.continueGuest}
                </Button>
              </form>
            </div>
          </div>
        </div>
        {/* The second half of the page on wide screens only: on a phone the forms are the page. */}
        <figure className="relative hidden overflow-hidden border-s border-line xl:block">
          <Art name="enter-panel" alt={s.art.enterPanel} eager className="absolute inset-0 size-full max-w-none object-cover" />
          <figcaption className="absolute inset-x-0 bottom-0 bg-panel/85 px-5 py-3 text-[12px] text-secondary backdrop-blur">{s.art.illustration}</figcaption>
        </figure>
      </main>
    </div>
  );
}

/** Only a path inside this app; anything else is somewhere a link should not send a reader after sign-in. */
function safeNext(raw: string | null): string {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/studies';
}
