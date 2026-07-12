export default function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
  compact = false,
}) {
  return (
    <div className={`empty-state${compact ? ' empty-state--compact' : ''}`} role="status">
      <p>{title}</p>
      {body && <p>{body}</p>}
      {actionLabel && onAction && (
        <button type="button" className="auth-btn auth-btn--primary empty-state__action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
