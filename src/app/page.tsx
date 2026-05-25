// Authentication disabled for testing - redirect directly to dashboard
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/dashboard');
}
