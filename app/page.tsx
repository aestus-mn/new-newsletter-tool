import { redirect } from 'next/navigation';

// Root → redirect to dashboard (Clerk middleware handles auth gate)
export default function Home() {
  redirect('/dashboard');
}
