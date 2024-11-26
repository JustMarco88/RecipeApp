import { type AppType } from 'next/app';
import { trpc } from '../utils/trpc';
import '@/styles/globals.css';
import { Toaster } from '@/components/ui/toaster';

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <div className="min-h-screen bg-background">
      <Component {...pageProps} />
      <Toaster />
    </div>
  );
};

export default trpc.withTRPC(MyApp); 