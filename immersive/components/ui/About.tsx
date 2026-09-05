'use client'

export default function About() {
  return (
    <section id="about" className="section relative py-24 px-6 md:px-12">
      <div className="max-w-4xl mx-auto">
        <div className="relative hud-panel p-8 md:p-12 rounded-2xl">
          {/* HUD corner brackets */}
          <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-cyber-magenta/50" />
          <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-cyber-cyan/50" />
          
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-8">
            <span className="text-cyber-magenta glow-magenta glitch-text" data-text="Sobre">
              Sobre
            </span>
          </h2>
          
          <div className="space-y-6 text-lg text-white/80 leading-relaxed">
            <p>
              Designer Engineer com foco em criar experiências digitais que conectam 
              design intuitivo e código eficiente. Atualmente trabalhando na{' '}
              <span className="text-cyber-cyan font-medium">Atomsix</span> em 
              Santa Catarina, Brasil.
            </p>
            
            <p>
              Especializado em transformar conceitos de design em produtos funcionais, 
              utilizando tecnologias modernas como React, Next.js, TypeScript e ferramentas 
              de prototipagem avançadas.
            </p>

            <p>
              Acredito que o melhor trabalho acontece na interseção entre design e 
              engenharia — onde a estética encontra a funcionalidade e a criatividade 
              encontra a lógica.
            </p>
          </div>

          <div className="mt-12 pt-8 border-t border-cyber-gray/30">
            <h3 className="text-xl font-display font-bold text-white/90 mb-4 font-mono">
              {'//'} Habilidades principais
            </h3>
            <div className="flex flex-wrap gap-3">
              {[
                'UI/UX Design',
                'React & Next.js',
                'TypeScript',
                'Design Systems',
                'Prototyping',
                'WebGL & Three.js',
                'GSAP Animation',
                'Figma',
              ].map((skill, index) => (
                <span
                  key={skill}
                  className="group px-4 py-2 bg-cyber-black/60 border border-cyber-cyan/30 text-cyber-cyan text-sm rounded font-mono hover:border-cyber-magenta/50 hover:text-cyber-magenta transition-all duration-300 hover:shadow-lg hover:shadow-cyber-cyan/20"
                >
                  <span className="text-cyber-cyan/50 mr-2">[{index + 1}]</span>
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Decorative gradient orbs */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-cyber-teal/20 to-cyber-peach/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-br from-cyber-cyan/20 to-cyber-magenta/20 rounded-full blur-3xl opacity-40 pointer-events-none" />
        </div>
      </div>
    </section>
  )
}
