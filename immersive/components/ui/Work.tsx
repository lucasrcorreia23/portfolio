'use client'

interface Project {
  title: string
  tags: string[]
  description: string
  year: string
}

const projects: Project[] = [
  {
    title: 'Nestlé',
    tags: ['Ads', 'Trade', 'eCommerce', 'Motion', 'App'],
    description: 'Experiências digitais multiplataforma para a Nestlé, unindo campanhas publicitárias, plataformas de trade marketing, soluções de eCommerce e aplicativos mobile.',
    year: '2024',
  },
  {
    title: 'Decision Suite',
    tags: ['SaaS', 'Research', 'Dados', 'IA', 'Mobile', 'End to End'],
    description: 'Plataforma SaaS completa de pesquisa e análise de dados com inteligência artificial, cobrindo todo o ciclo de decisão empresarial.',
    year: '2024',
  },
  {
    title: 'Prime8',
    tags: ['Visual Identity', 'UX/UI', 'Design System', 'eCommerce'],
    description: 'Identidade visual completa, sistema de design modular e plataforma de eCommerce para a Prime8.',
    year: '2023',
  },
  {
    title: 'Zoomtech',
    tags: ['Product Design', 'Development', 'SaaS'],
    description: 'Design e desenvolvimento de produto SaaS com foco em experiência do usuário e performance.',
    year: '2023',
  },
]

export default function Work() {
  return (
    <section id="work" className="section relative min-h-screen py-24 px-6 md:px-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-16">
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            <span className="text-cyber-cyan glow-text glitch-text" data-text="Selected Work">
              Selected Work
            </span>
          </h2>
          <p className="text-lg md:text-xl text-white/60 font-mono">
            {'//'} Projetos que combinam design intuitivo e código robusto
          </p>
        </div>

        <div className="grid gap-8 md:gap-12">
          {projects.map((project, index) => (
            <div
              key={index}
              className="group relative hud-panel p-8 rounded-lg transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-cyber-cyan/20"
              style={{
                transform: `perspective(1000px) rotateX(${index % 2 === 0 ? '1deg' : '-1deg'})`,
              }}
            >
              {/* HUD corner brackets */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyber-cyan/40" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyber-magenta/40" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyber-magenta/40" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyber-cyan/40" />

              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-cyber-cyan/60 font-mono text-xs mt-1.5">
                      [{(index + 1).toString().padStart(2, '0')}]
                    </span>
                    <h3 className="font-display text-2xl md:text-3xl font-bold text-white group-hover:text-cyber-cyan transition-all duration-300">
                      <span className="glitch-text" data-text={project.title}>
                        {project.title}
                      </span>
                    </h3>
                  </div>
                  
                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 md:ml-10 mb-3">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs font-mono px-2 py-1 bg-cyber-magenta/10 border border-cyber-magenta/30 text-cyber-magenta/80 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="text-white/40 font-mono text-xs bg-cyber-black/50 px-3 py-1 rounded border border-cyber-gray/30">
                  {project.year}
                </span>
              </div>
              
              <p className="text-white/70 leading-relaxed md:ml-10">
                {project.description}
              </p>

              {/* Signal bar indicator */}
              <div className="absolute bottom-4 right-4 flex gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-cyber-cyan"
                    style={{ height: `${(i + 1) * 4}px` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-white/60 font-mono text-sm">
            {'//'} Mais projetos disponíveis no{' '}
            <a 
              href="https://www.lucasrc.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyber-cyan hover:text-cyber-magenta transition-colors duration-300"
            >
              [PORTFÓLIO_COMPLETO]
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}
