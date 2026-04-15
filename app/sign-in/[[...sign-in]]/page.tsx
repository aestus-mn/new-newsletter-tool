import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Aestus LP Newsletter Tool
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Sign in with your Google Workspace account to continue.
          </p>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-none border border-gray-200 rounded-xl',
            },
          }}
        />
      </div>
    </div>
  );
}
