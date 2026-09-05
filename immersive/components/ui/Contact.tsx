'use client'

export default function Contact() {
  return (
    <section id="contact" className="section relative py-24 px-6 md:px-12 mb-12">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-8">
          <span className="text-cyber-cyan glow-text">Vamos Conversar?</span>
        </h2>
        
        <p className="text-lg md:text-xl text-white/70 mb-12 max-w-2xl mx-auto">
          Interessado em colaborar ou discutir um projeto? 
          Estou sempre aberto a novas oportunidades e conversas.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <a
            href="mailto:contato@lucasrc.com.br"
            className="group relative px-8 py-4 bg-gradient-to-r from-cyber-cyan to-cyber-magenta text-cyber-black font-bold rounded-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl"
          >
            <span className="relative z-10">Enviar Email</span>
            <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
          </a>

          <a
            href="https://www.linkedin.com/in/lucasrcorreia/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 border-2 border-cyber-magenta text-cyber-magenta font-medium rounded-lg transition-all duration-300 hover:bg-cyber-magenta/10 hover:scale-105"
          >
            LinkedIn
          </a>
        </div>

        <div className="mt-16 pt-12 border-t border-cyber-gray/30">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-white/50 text-sm">
            <p>© 2024 Lucas R. Correia. Todos os direitos reservados.</p>
            <div className="flex gap-6">
              <a 
                href="https://github.com/lucasrcorreia23"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-cyber-cyan transition-colors duration-300"
              >
                GitHub
              </a>
              <a 
                href="https://www.lucasrc.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-cyber-cyan transition-colors duration-300"
              >
                Portfólio Atual
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyber-cyan to-transparent" />
    </section>
  )
}
