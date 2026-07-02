import { LogIn, UserPlus } from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/clerk-react';

export default function AuthPanel() {
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
