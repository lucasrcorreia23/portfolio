
import React from 'react';


const portfolio_content = {
  subtitle: "Desafio",
  title: "Entender o mercado de TIC para desenvolver nova ID visual, website e estratégia de conteúdo omnichannel.",
  description: "Inicialmente, a ideia era reformular o site existente. Porém, logo percebeu-se a necessidade de maior clareza sobre o mercado, os usuários e a proposta de valor da empresa. Guiado pelo framework das 5 Forças de Porter, mergulhei em pesquisas desk e qualitativas em busca de respostas sobre os concorrentes, clientes e suas jornadas de compra, assim como, o contexto mercadológico em que estava inserido. Esse estudo foi essencial para fundamentar o projeto de rebranding, decisões de design e desenvolver um guia de conteúdo consistente para todos os pontos de contato da companhia",
    
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
                  <h4 className="porfolio-details__left-info-title">Posição</h4>
                  <span>UX/UI Designer - Branding -<br/><br/> User Researcher - Developer -<br/><br/>Content Strategy - UI design</span>
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
                {/*
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
                */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PortfolioAboutArea;