'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import Link from 'next/link'

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.hero-title', {
        opacity: 0,
        y: 50,
        duration: 1,
        ease: 'power3.out',
      })
      
      gsap.from('.hero-subtitle', {
        opacity: 0,
        y: 30,
        duration: 1,
        delay: 0.3,
        ease: 'power3.out',
      })
      
      gsap.from('.hero-tagline', {
        opacity: 0,
        y: 20,
        duration: 1,
        delay: 0.6,
        ease: 'power3.out',
      })

      gsap.from('.hero-cta', {
        opacity: 0,
        y: 20,
        duration: 1,
        delay: 0.9,
        ease: 'power3.out',
      })

      gsap.from('.hero-links', {
        opacity: 0,
        duration: 1,
        delay: 1.2,
        ease: 'power3.out',
      })
    }, heroRef)

    return () => ctx.revert()
  }, [])

  const scrollToWork = () => {
    const workSection = document.getElementById('work')
    workSection?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section 
      ref={heroRef}
      className="relative min-h-screen flex items-center justify-center px-6 md:px-12"
    >
      <div className="max-w-6xl w-full space-y-8 text-center">
        <h1 className="hero-title font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight">
          <span className="block text-cyber-cyan glow-text">Lucas R. Correia</span>
        </h1>
        
        <div className="hero-subtitle space-y-2">
          <p className="text-2xl md:text-3xl lg:text-4xl font-medium text-white/90">
            Designer Engineer
          </p>
          <p className="text-xl md:text-2xl text-cyber-magenta/80">
            Product Builder @ Atomsix
          </p>
        </div>

        <p className="hero-tagline text-lg md:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed">
          Construindo experiências digitais que unem design e código.
          <br />
          De interfaces interativas a sistemas completos.
        </p>

        <div className="hero-cta flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
          <button
            onClick={scrollToWork}
            className="group relative px-8 py-4 bg-transparent border-2 border-cyber-cyan text-cyber-cyan font-medium rounded-lg overflow-hidden transition-all duration-300 hover:scale-105 glow-border"
          >
            <span className="relative z-10">Explorar Trabalhos</span>
            <div className="absolute inset-0 bg-cyber-cyan/10 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
          </button>

          <a
            href="https://www.lucasrc.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 text-white/80 hover:text-white transition-colors duration-300"
          >
            Site Atual →
          </a>
        </div>

        <div className="hero-links flex gap-6 justify-center pt-12">
          <a
            href="https://github.com/lucasrcorreia23"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/60 hover:text-cyber-cyan transition-colors duration-300"
            aria-label="GitHub"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
          </a>
          <a
            href="https://www.linkedin.com/in/lucasrcorreia/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/60 hover:text-cyber-cyan transition-colors duration-300"
            aria-label="LinkedIn"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-cyber-cyan/50 rounded-full flex items-start justify-center p-2">
          <div className="w-1 h-2 bg-cyber-cyan rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  )
}
