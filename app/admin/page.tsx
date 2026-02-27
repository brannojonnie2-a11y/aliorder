'use client';
import { AdminPanel } from '@/components/AdminPanel';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();
  return <AdminPanel onBack={() => router.push('/')} />;
}
