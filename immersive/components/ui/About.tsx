'use client'

export default function About() {
  return (
    <section id="about" className="section relative py-24 px-6 md:px-12">
      <div className="max-w-4xl mx-auto">
        <div className="relative p-8 md:p-12 bg-gradient-to-br from-cyber-dark/80 to-cyber-gray/40 backdrop-blur-sm border border-cyber-gray rounded-3xl">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-8">
            <span className="text-cyber-magenta glow-text">Sobre</span>
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

          <div className="mt-12 pt-8 border-t border-cyber-gray/50">
            <h3 className="text-xl font-display font-bold text-white/90 mb-4">
              Habilidades principais
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
              ].map((skill) => (
                <span
                  key={skill}
                  className="px-4 py-2 bg-cyber-black/60 border border-cyber-cyan/30 text-cyber-cyan text-sm rounded-full"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Decorative gradient orb */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-cyber-cyan/20 to-cyber-magenta/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
        </div>
      </div>
    </section>
  )
}
