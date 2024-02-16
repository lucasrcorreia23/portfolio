
import React from 'react';


const portfolio_content = {
  subtitle: "Desafio",
  title: "Lançar uma unidade de negócio independente para distribuição, com marca própria e canal de e-commerce exclusivo.",
  description: "Prime8 - Distribuidora de TIC iniciou sua operação em 2023 e necessitava de um canal próprio de venda online. Sua entrada ao mercado deveria comunica-la como um grande player, visto seu portfólio com produtos da lider global em TI Huawei, smartphones realme e soluções de telefonia Intelbras.  Sendo assim, para ter certeza que estava direcionando corretamente o design ao público deste modelo de negócio, foram feitas pesquisas desk e sessões de entrevistas com usuários e pessoas chaves com experiência no negócio, o que trouxe insights e respostas importantes para as tomadas de decisões de branding e design.",
    
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
                  <span>Prime8 - Distrubuidora de TIC</span>
                </div>
                <div className="porfolio-details__left-content">
                  <h4 className="porfolio-details__left-info-title">Posições</h4>
                  <span>UX/UI Design - Branding</span>
                  

                </div>
                <div className="porfolio-details__left-content">
                  <h4 className="porfolio-details__left-info-title mb-20">Serviços</h4>
                  <span>Pesquisa desk</span>
                  <span>Design System</span>                 
                  <span>CSD</span>
                  <span>Proto-personas</span>                  
                  <span>Princípios de design</span>                  
                  <span>ID Visual</span>                  
                  <span>Prototipação</span>                  
                  <span>Pesquisa qualitativa</span>
                  <span>Arquitetura de informação</span>
                  <span>Mapa de empatia</span>                 
                  <span>Componentização</span>                 
                </div>
                <div className="porfolio-details__left-content">
                  <h4 className="porfolio-details__left-info-title">Ano</h4>
                  <span>2023</span>
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
                  <a className="tp-btn-border-md" href="https://www.prime8.com.br">
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