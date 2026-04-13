'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '../../lib/useProfile';

export default function UserProfileMenu() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const {
    session,
    displayName,
    displayNameInput,
    setDisplayNameInput,
    handleSaveDisplayName: globalSaveDisplayName,
    handleSignOut: globalSignOut,
    saving,
    roleLabel,
    initials,
  } = useProfile();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  if (!session) return null;

  const handleSaveDisplayName = () => {
    globalSaveDisplayName();
    setEditing(false);
    setOpen(false);
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    const success = await globalSignOut();
    if (success) {
      setOpen(false);
      router.replace('/');
    }
    setSigningOut(false);
  };

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((currentOpen) => !currentOpen)}
        style={{
          width: 42,
          height: 42,
          borderRadius: '50%',
          border: '1px solid rgba(255, 179, 71, 0.7)',
          background: '#133020',
          color: '#fff',
          fontWeight: 800,
          fontSize: 13,
          cursor: 'pointer',
        }}
        title="Profile settings"
        type="button"
      >
        {initials}
      </button>

      {open ? (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 50,
            right: 0,
            width: 280,
            padding: 14,
            borderRadius: 14,
            border: '1px solid rgba(19, 48, 32, 0.12)',
            background: 'rgba(255,255,255,0.98)',
            boxShadow: '0 18px 36px rgba(19, 48, 32, 0.18)',
            zIndex: 30,
          }}
        >
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#133020' }}>{displayName || session.username}</div>
            <div style={{ fontSize: 12, color: '#708E7C' }}>{session.email}</div>
            <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 999, background: 'linear-gradient(180deg, rgba(4,98,65,0.12) 0%, rgba(4,98,65,0.08) 100%)', border: '1px solid rgba(4,98,65,0.12)', color: '#046241', fontSize: 11, fontWeight: 800 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#046241' }} />
              {roleLabel}
            </div>
          </div>

          <button
            onClick={() => {
              setDisplayNameInput(displayName || session.username);
              setEditing(true);
              setOpen(false);
            }}
            style={{
              width: '100%',
              border: '1px solid rgba(19, 48, 32, 0.12)',
              borderRadius: 10,
              background: '#fff',
              color: '#133020',
              fontSize: 12,
              fontWeight: 700,
              padding: '10px 12px',
              textAlign: 'left',
              cursor: 'pointer',
            }}
            type="button"
          >
            Edit Profile
          </button>

          <button
            disabled={signingOut}
            onClick={handleSignOut}
            style={{
              marginTop: 8,
              width: '100%',
              border: '1px solid rgba(193, 113, 16, 0.25)',
              borderRadius: 10,
              background: 'rgba(255, 179, 71, 0.16)',
              color: '#133020',
              fontSize: 12,
              fontWeight: 700,
              padding: '10px 12px',
              textAlign: 'left',
              cursor: signingOut ? 'not-allowed' : 'pointer',
              opacity: signingOut ? 0.65 : 1,
            }}
            type="button"
          >
            {signingOut ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      ) : null}

      {editing ? (
        <div
          aria-modal="true"
          onClick={() => setEditing(false)}
          role="dialog"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(8, 19, 26, 0.45)',
            display: 'grid',
            placeItems: 'center',
            padding: 20,
            zIndex: 100,
          }}
        >
          <section
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(100%, 400px)',
              borderRadius: 18,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(249,246,238,0.98) 100%)',
              border: '1px solid rgba(19,48,32,0.12)',
              padding: 18,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#133020' }}>Profile Settings</h2>
            <p style={{ margin: '6px 0 12px', fontSize: 12, color: '#708E7C' }}>Update how your profile name appears.</p>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#133020' }}>Display name</span>
              <input
                autoComplete="name"
                onChange={(event) => setDisplayNameInput(event.target.value)}
                style={{
                  width: '100%',
                  minHeight: 42,
                  border: '1px solid rgba(19,48,32,0.12)',
                  borderRadius: 12,
                  padding: '0 12px',
                  fontSize: 14,
                }}
                type="text"
                value={displayNameInput}
              />
            </label>

            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button
                onClick={() => setEditing(false)}
                style={{
                  flex: 1,
                  minHeight: 40,
                  border: '1px solid rgba(19,48,32,0.12)',
                  borderRadius: 12,
                  background: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                type="button"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                onClick={handleSaveDisplayName}
                style={{
                  flex: 1,
                  minHeight: 40,
                  border: '0',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #FFB347, #FFC370)',
                  color: '#133020',
                  fontWeight: 800,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
                type="button"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
