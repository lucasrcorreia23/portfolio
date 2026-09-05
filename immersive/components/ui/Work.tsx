'use client'

interface Project {
  title: string
  category: string
  description: string
  year: string
}

const projects: Project[] = [
  {
    title: 'Decision Suite',
    category: 'Product Design & Development',
    description: 'Sistema de decisão empresarial com interface moderna e análise de dados em tempo real.',
    year: '2024',
  },
  {
    title: 'Nestlé Experience',
    category: 'UX/UI Design',
    description: 'Experiência digital interativa para produtos Nestlé, focada em engajamento do usuário.',
    year: '2023',
  },
  {
    title: 'Prime8 Platform',
    category: 'Full Stack Development',
    description: 'Plataforma completa de gerenciamento com foco em performance e escalabilidade.',
    year: '2023',
  },
  {
    title: 'Zoomtech Solutions',
    category: 'Design System',
    description: 'Sistema de design modular e componentes reutilizáveis para produto SaaS.',
    year: '2022',
  },
]

export default function Work() {
  return (
    <section id="work" className="section relative min-h-screen py-24 px-6 md:px-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-16">
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            <span className="text-cyber-cyan glow-text">Selected Work</span>
          </h2>
          <p className="text-lg md:text-xl text-white/60">
            Projetos que combinam design intuitivo e código robusto
          </p>
        </div>

        <div className="grid gap-8 md:gap-12">
          {projects.map((project, index) => (
            <div
              key={index}
              className="group relative p-8 bg-cyber-dark/50 backdrop-blur-sm border border-cyber-gray hover:border-cyber-cyan/50 rounded-2xl transition-all duration-500 hover:scale-[1.02]"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                <div className="flex-1">
                  <h3 className="font-display text-2xl md:text-3xl font-bold text-white group-hover:text-cyber-cyan transition-colors duration-300">
                    {project.title}
                  </h3>
                  <p className="text-cyber-magenta/80 mt-2">{project.category}</p>
                </div>
                <span className="text-white/40 font-mono text-sm">{project.year}</span>
              </div>
              
              <p className="text-white/70 leading-relaxed">
                {project.description}
              </p>

              {/* Decorative corner accent */}
              <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute top-2 right-2 w-16 h-16 border-t-2 border-r-2 border-cyber-cyan/50 rounded-tr-2xl" />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-white/60">
            Mais projetos disponíveis no{' '}
            <a 
              href="https://www.lucasrc.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyber-cyan hover:underline"
            >
              portfólio completo
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}
