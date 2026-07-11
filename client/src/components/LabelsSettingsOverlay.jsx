import { useEffect, useState } from 'react';
import { Pencil, Plus, X, Trash2 } from 'lucide-react';

function LabelRow({ label, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!editing) setDraft(label.name);
  }, [label.name, editing]);

  const save = async () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setError('Name is required');
      return;
    }
    if (trimmed === label.name) {
      setEditing(false);
      setError(null);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onUpdate(label.id, trimmed);
      setEditing(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    setError(null);
    try {
      await onDelete(label.id);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <li className="labels-overlay__row">
      {editing ? (
        <div className="labels-overlay__edit">
          <input
            className="labels-overlay__input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                save();
              }
              if (e.key === 'Escape') {
                setEditing(false);
                setError(null);
              }
            }}
            aria-label={`Edit label ${label.name}`}
            autoFocus
            disabled={saving}
          />
          <button type="button" className="labels-overlay__text-btn" onClick={save} disabled={saving}>
            Save
          </button>
          <button
            type="button"
            className="labels-overlay__text-btn labels-overlay__text-btn--muted"
            onClick={() => {
              setEditing(false);
              setError(null);
            }}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          <span className="labels-overlay__name">{label.name}</span>
          <div className="labels-overlay__actions">
            <button
              type="button"
              className="labels-overlay__icon-btn"
              onClick={() => setEditing(true)}
              aria-label={`Edit ${label.name}`}
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              className="labels-overlay__icon-btn labels-overlay__icon-btn--danger"
              onClick={remove}
              aria-label={`Delete ${label.name}`}
              disabled={saving}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </>
      )}
      {error && <p className="labels-overlay__error">{error}</p>}
    </li>
  );
}

export default function LabelsSettingsOverlay({
  labels,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const addLabel = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onCreate(trimmed);
      setNewName('');
      setAdding(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="labels-overlay-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="labels-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="labels-overlay-title"
      >
        <header className="labels-overlay__header">
          <div>
            <h2 id="labels-overlay-title">Labels</h2>
            <p className="labels-overlay__hint">
              Create labels to track jobs — for example, referral requested.
            </p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <ul className="labels-overlay__list">
          {labels.map((label) => (
            <LabelRow
              key={label.id}
              label={label}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
          {labels.length === 0 && (
            <li className="labels-overlay__empty">No labels yet. Add one below.</li>
          )}
        </ul>

        {adding ? (
          <div className="labels-overlay__add">
            <input
              className="labels-overlay__input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addLabel();
                }
                if (e.key === 'Escape') {
                  setAdding(false);
                  setNewName('');
                  setError(null);
                }
              }}
              placeholder="Label name"
              aria-label="New label name"
              autoFocus
              disabled={saving}
            />
            <button type="button" className="labels-overlay__text-btn" onClick={addLabel} disabled={saving}>
              Add
            </button>
            <button
              type="button"
              className="labels-overlay__text-btn labels-overlay__text-btn--muted"
              onClick={() => {
                setAdding(false);
                setNewName('');
                setError(null);
              }}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="labels-overlay__add-btn"
            onClick={() => setAdding(true)}
          >
            <Plus size={16} />
            Add label
          </button>
        )}

        {error && <p className="labels-overlay__error">{error}</p>}
      </div>
    </div>
  );
}
