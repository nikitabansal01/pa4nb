import { LogIn, UserPlus } from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/clerk-react';
import { isClerkConfigured } from '../clerk';

export default function AuthPanel() {
  if (!isClerkConfigured) {
    return (
      <div className="auth-panel auth-panel--offline" title="Add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to client/.env.local">
        <span className="auth-panel__email">Local mode</span>
      </div>
    );
  }

  return (
    <div className="auth-panel">
      <SignedOut>
        <SignInButton mode="modal">
          <button type="button" className="auth-btn">
            <LogIn size={16} />
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button type="button" className="auth-btn auth-btn--primary">
            <UserPlus size={16} />
            Create account
          </button>
        </SignUpButton>
      </SignedOut>
      <SignedIn>
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              userButtonPopoverCard: 'clerk-user-popover',
              userButtonAvatarBox: 'clerk-user-avatar',
            },
          }}
        />
      </SignedIn>
    </div>
  );
}
