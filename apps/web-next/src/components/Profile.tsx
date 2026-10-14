import { type FormEvent, useEffect, useState } from 'react';

import { useIdentity } from '../lib/identity.js';
import { useLocale } from '../lib/locale.js';
import { Button } from '../ui/button.js';
import { Drawer } from '../ui/drawer.js';
import { Field, Input, Notice, Spinner } from '../ui/primitives.js';

/*
  THE ACCOUNT'S NAME AND LICENCE, IN A SIDE SHEET.

  The licence is what G4 records beside a reviewer's name, and it is recorded,
  never verified — the drawer says so under the field rather than letting a
  filled box read as a checked one. Its own module, loaded on first open, so the
  header every page carries does not carry a form most readers never use.
*/
export default function Profile({ open, onOpenChange }: { readonly open: boolean; readonly onOpenChange: (open: boolean) => void }): JSX.Element {
  const { t } = useLocale();
  const { account, updateProfile } = useIdentity();
  const [name, setName] = useState('');
  const [licence, setLicence] = useState('');
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<{ kind: 'saved' } | { kind: 'failed'; message: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(account?.name ?? '');
    setLicence(account?.licence ?? '');
    setState(null);
  }, [open, account]);

  const save = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setState(null);
    try {
      await updateProfile({ name: name.trim(), licence: licence.trim() });
      setState({ kind: 'saved' });
    } catch (err) {
      setState({ kind: 'failed', message: (err as Error).message || t.profile.failed });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={t.profile.title} closeLabel={t.profile.close}>
      {account ? (
        <form onSubmit={(e) => void save(e)} className="grid gap-4" noValidate>
          <p className="text-[13px] text-secondary">
            {t.profile.email} <span className="text-fg">{account.email}</span>
          </p>
          <Field label={t.profile.name}>
            {({ id }) => <Input id={id} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />}
          </Field>
          <Field label={t.profile.licence} hint={t.profile.licenceHint}>
            {({ id, describedBy }) => (
              <Input id={id} value={licence} onChange={(e) => setLicence(e.target.value)} aria-describedby={describedBy} className="figure" />
            )}
          </Field>
          {state?.kind === 'failed' ? <Notice>{state.message}</Notice> : null}
          {state?.kind === 'saved' ? <Notice tone="neutral">{t.profile.saved}</Notice> : null}
          <Button type="submit" variant="primary" disabled={busy || name.trim() === ''} aria-busy={busy || undefined}>
            {busy ? <Spinner /> : null}
            {t.profile.save}
          </Button>
        </form>
      ) : (
        <p className="text-[13px] text-secondary">{t.profile.guest}</p>
      )}
    </Drawer>
  );
}
