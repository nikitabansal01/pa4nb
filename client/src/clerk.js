export function getClerkPublishableKey() {
  return (
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
    || import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    || ''
  );
}

export const clerkAppearance = {
  variables: {
    colorBackground: '#0e0020',
    colorInputBackground: '#12001f',
    colorPrimary: '#ff006e',
    colorText: '#fff5f8',
    colorTextSecondary: '#c4a8d4',
    borderRadius: '10px',
  },
  elements: {
    modalBackdrop: 'clerk-modal-backdrop',
    card: 'clerk-card',
  },
};
