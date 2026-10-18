import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { MotionConfig, motion } from 'motion/react'
import AuroraBackground from '../components/layout/AuroraBackground'
import Sidebar from '../components/layout/Sidebar'
import Topbar from '../components/layout/Topbar'
import BottomNav from '../components/layout/BottomNav'
const pageVariants = {
  hidden: { opacity: 0.9 },
  show: { opacity: 1, transition: { duration: 0.12, ease: 'easeOut' } },
}

export default function AppShell() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    // reducedMotion="user": transform/layout animation is disabled for people who ask for less motion.
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh overflow-x-hidden">
        <AuroraBackground />
        <a
          href="#main"
          className="sr-only z-50 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
        >
          Skip to content
        </a>

        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[220px] lg:block">
          <Sidebar />
        </aside>

        <div className="lg:pl-[220px]">
          <Topbar />
          <main id="main" className="mx-auto w-full max-w-[1600px] p-6 sm:p-8 pb-32 lg:pb-16">
            {/* Enter-only transition: an exit animation would re-render the old page with the new route's params. */}
            <motion.div key={pathname} variants={pageVariants} initial="hidden" animate="show">
              <Outlet />
            </motion.div>
          </main>
        </div>

        <BottomNav />
      </div>
    </MotionConfig>
  )
}
