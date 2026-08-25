import { ReactNode } from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { CartProvider } from '@/components/cart-context'
import { MobileBottomNav } from '@/components/mobile-bottom-nav'
import { StoreClosedBanner } from '@/components/store-closed-banner'

export default function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <div className="flex flex-col min-h-screen">
        <Header />
        <StoreClosedBanner />
        <main className="flex-1 pb-20 md:pb-0">
          {children}
        </main>
        <Footer />
        <MobileBottomNav />
      </div>
    </CartProvider>
  )
}