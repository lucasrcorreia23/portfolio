'use client'

export default function Contact() {
  return (
    <section id="contact" className="section relative py-24 px-6 md:px-12 mb-12">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-8">
          <span className="text-cyber-cyan glow-text glitch-text" data-text="Vamos Conversar?">
            Vamos Conversar?
          </span>
        </h2>
        
        <p className="text-lg md:text-xl text-white/70 mb-12 max-w-2xl mx-auto">
          Interessado em colaborar ou discutir um projeto? 
          Estou sempre aberto a novas oportunidades e conversas.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a
            href="mailto:contato@lucasrc.com.br"
            className="group relative px-8 py-4 bg-gradient-to-r from-cyber-cyan via-cyber-teal to-cyber-magenta text-cyber-black font-bold rounded-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-cyber-cyan/50 font-mono"
          >
            <span className="relative z-10">[EMAIL]</span>
            <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
          </a>

          <a
            href="https://wa.me/5548999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 border-2 border-cyber-cyan text-cyber-cyan font-medium rounded-lg transition-all duration-300 hover:bg-cyber-cyan/10 hover:scale-105 glow-border font-mono"
          >
            [WHATSAPP]
          </a>

          <a
            href="https://www.linkedin.com/in/lucasrcorreia/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 border-2 border-cyber-magenta text-cyber-magenta font-medium rounded-lg transition-all duration-300 hover:bg-cyber-magenta/10 hover:scale-105 hover:border-cyber-cyan hover:text-cyber-cyan glow-border-magenta font-mono"
          >
            [LINKEDIN]
          </a>
        </div>
        
        <div className="flex gap-6 justify-center pt-6">
          <a
            href="https://www.behance.net/lucasrcorreia"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/60 hover:text-cyber-cyan transition-colors duration-300 font-mono text-sm"
          >
            [Behance]
          </a>
          <a
            href="https://github.com/lucasrcorreia23"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/60 hover:text-cyber-magenta transition-colors duration-300 font-mono text-sm"
          >
            [GitHub]
          </a>
        </div>

        <div className="mt-16 pt-12 border-t border-cyber-gray/30">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-white/50 text-xs font-mono">
            <p>© 2024 Lucas R. Correia. Todos os direitos reservados.</p>
            <div className="flex gap-6">
              <a 
                href="https://github.com/lucasrcorreia23"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-cyber-cyan transition-colors duration-300"
              >
                [GitHub]
              </a>
              <a 
                href="https://www.lucasrc.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-cyber-magenta transition-colors duration-300"
              >
                [Portfólio_Atual]
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative bottom gradient with teal-warm blend */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyber-cyan via-cyber-teal to-transparent opacity-50" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-cyber-teal/10 via-cyber-peach/5 to-transparent pointer-events-none" />
    </section>
  )
}
