import type {Metadata} from 'next';
import { Tajawal } from 'next/font/google';
import './globals.css'; // Global styles
import ClientAssistantWrapper from '@/components/ClientAssistantWrapper';
import AuthGuard from '@/components/AuthGuard';

const tajawal = Tajawal({ 
  subsets: ['arabic'],
  weight: ['400', '500', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'توقعات سباق الخيول - بوابة خاصة',
  description: 'منصة لتحليل وتوقع ومقارنة نتائج سباقات الخيول (Tiercé, Quarté, Quinté+) بناءً على بيانات حقيقية مباشرة.',
  openGraph: {
    title: 'توقعات سباق الخيول - بوابة خاصة',
    description: 'منصة لتحليل وتوقع ومقارنة نتائج سباقات الخيول (Tiercé, Quarté, Quinté+) بناءً على بيانات حقيقية مباشرة.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'توقعات سباق الخيول - بوابة خاصة',
    description: 'منصة لتحليل وتوقع ومقارنة نتائج سباقات الخيول (Tiercé, Quarté, Quinté+) بناءً على بيانات حقيقية مباشرة.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="ar" dir="rtl">
      <body className={tajawal.className} suppressHydrationWarning>
        <AuthGuard>
          {children}
          <ClientAssistantWrapper />
        </AuthGuard>
      </body>
    </html>
  );
}
