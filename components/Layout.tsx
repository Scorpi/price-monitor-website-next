import clsx from "clsx"
import React, { ReactNode } from "react"

export const MainLayout: React.FC<{ children: ReactNode; className?: string }> = ({ children, className }) => {
  return (
    <main className={clsx("max-w-xl mx-auto pt-4 px-4 min-h-screen", className)}>
      {children}
    </main>
  )
}
