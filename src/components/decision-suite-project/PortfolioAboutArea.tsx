
import React from 'react';


const portfolio_content = {
  subtitle: "Desafio",
  title: "Concepção de uma plataforma integrada à agentes de IA especialistas com visualização, insights e análise de dados da empresa",
  description: "Trabalhei na solução de um problema observado em diversas empresas que buscavam tomar decisões baseadas em dados: a dificuldade em centralizar todos os dados e informações da companhia em uma única plataforma, e assim, automatizar a identificação de boas oportunidades para rápidas tomadas de decisões que gerem valor para o negócio.",
    
}

const { subtitle, title, description } = portfolio_content

const PortfolioAboutArea = () => {
  return (
    <>
      <div id="porfolio-details" className="porfolio-details__info-wrap black-bg-3 pt-120 pb-100">
        <div className="container">
          <div className="row">
            <div className="col-xl-5 col-lg-4">
              <div className="porfolio-details__left-info">
                <div className="porfolio-details__left-content">
                  <h4 className="porfolio-details__left-info-title">Cliente</h4>
                  <span>Newral - Decision Suite</span>
                </div>
                <div className="porfolio-details__left-content">
                  <h4 className="porfolio-details__left-info-title">Posições</h4>
                  <span>Product Designer</span>
                  

                </div>
                <div className="porfolio-details__left-content">
                  <h4 className="porfolio-details__left-info-title mb-20">Serviços</h4>
                  <span>Pesquisa desk</span>
                  <span>Ideação</span>                 
                  <span>CSD</span>
                  <span>Persona</span>                  
                  <span>Princípios de design</span>  
                  <span>Prototipação</span>                  
                  <span>Pesquisa qualitativa e quantitativa</span>
                  <span>Arquitetura de informação</span>                                  
                  <span>Componentização</span>                 
                </div>
                <div className="porfolio-details__left-content">
                  <h4 className="porfolio-details__left-info-title">Ano</h4>
                  <span>2024/2025</span>
                </div>
              </div>
            </div>
            <div className="col-xl-7 col-lg-8">
              <div className="porfolio-details__right-info">
                <div className="porfolio-details__right-title-box">
                  <span className="tp-section-subtitle-4 mb-20">{subtitle}</span>
                  <h4 className="tp-section-title-4 mb-35">{title}</h4>
                  <p>{description}</p>
                </div>
                <div className="porfolio-details__right-btn">
                  <a className="tp-btn-border-md" href="https://www.decisionsuite.com.br">
                    Ver site

                    <span>
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 10L10 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M1 1H10V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>

                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PortfolioAboutArea;