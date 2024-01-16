
import React from 'react';


const portfolio_content = {
  subtitle: "Sobre o projeto",
  title: "Nova arquitetura de marcas, manual de identidade visual, estratégia de conteúdo e design do site.",
  description: "Inicialmente, a ideia era reformular o site existente, porém logo percebeu-se a necessidade de maior clareza sobre o mercado, os usuários e a proposta de valor da empresa. Guiado pelas 5 Forças de Porter, mergulhei em uma pesquisa abrangente sobre os concorrentes, clientes e suas jornadas de compra, bem como o contexto mercadológico em que estávamos inseridos. Esse estudo foi essencial para fundamentar o projeto de rebranding, decisões de design e desenvolver um guia de conteúdo consistente para todos os pontos de contato de companhia.",
    
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
                  <span>ZOOMtecnologia</span>
                </div>
                <div className="porfolio-details__left-content">
                  <h4 className="porfolio-details__left-info-title">Posição no projeto</h4>
                  <span>UX Designer - Branding -<br/><br/> User Research - Developer</span>
                </div>
                <div className="porfolio-details__left-content">
                  <h4 className="porfolio-details__left-info-title mb-20">Tecnologias/Softwares</h4>
                  <span></span>
                  <span>Figma</span>
                  <span>Photoshop</span>                  
                  <span>Illustrator</span>
                  <span>InDesign</span>                   
                  <span>After Effects</span>
                  <span>Next.js</span>
                  <span>GSAP</span>                 
                  <span>SCSS</span>
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
                  <a className="tp-btn-border-md" href="#">
                    View Website

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