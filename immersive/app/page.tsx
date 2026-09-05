'use client'

import { useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import Hero from '@/components/ui/Hero'
import Work from '@/components/ui/Work'
import About from '@/components/ui/About'
import Contact from '@/components/ui/Contact'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const Scene = dynamic(() => import('@/components/canvas/Scene'), { ssr: false })

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Smooth scroll animations
    const sections = gsap.utils.toArray('.section')
    
    sections.forEach((section: any) => {
      gsap.from(section, {
        opacity: 0,
        y: 50,
        duration: 1,
        scrollTrigger: {
          trigger: section,
          start: 'top 80%',
          end: 'top 50%',
          scrub: 1,
        },
      })
    })
  }, [])

  return (
    <main ref={containerRef} className="relative">
      {/* Grain overlay */}
      <div className="grain-overlay" />
      
      {/* WebGL Background */}
      <div className="fixed inset-0 -z-10">
        <Scene />
      </div>

      {/* Content */}
      <Hero />
      <Work />
      <About />
      <Contact />
    </main>
  )
}
