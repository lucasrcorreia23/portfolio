import React from "react";
import Image, { StaticImageData } from "next/image";

import portfolio_details_img_1 from "@/assets/img/decision-suite/take-01.png";
import portfolio_img_1 from "@/assets/img/decision-suite/design-process.jpg";
import portfolio_img_4 from "@/assets/img/decision-suite/design-process-2.jpg";
import portfolio_img_2 from "@/assets/img/decision-suite/design-process-3.jpg";

import portfolio_img_5 from "@/assets/img/decision-suite/final-01.jpg";
import portfolio_img_6 from "@/assets/img/decision-suite/final-02.png";
import portfolio_img_7 from "@/assets/img/decision-suite/final-4.jpg";
import portfolio_img_8 from "@/assets/img/decision-suite/take-05.jpg";
import portfolio_img_9 from "@/assets/img/decision-suite/take-07.jpg";
import portfolio_img_11 from "@/assets/img/decision-suite/take-06.png";
import portfolio_img_12 from "@/assets/img/decision-suite/assistente-nike.jpg";
import portfolio_img_13 from "@/assets/img/decision-suite/decisiongif01.gif";


interface DataType {
  title: string;
  title2: string;
  title3: string;
  step4: string;
  step5: string;
  features: string[];
  counter_data: {
    counter: number;
    title: string;
  }[];
  images: StaticImageData[];
}

const portfolio_detaisl_content: DataType = {
  title: `Meu primeiro passo foi, junto ao PM, planejar os assuntos que gostaríamos de aprofundar nas entrevistas exploratórias por meio da matriz CSD, mapeando certezas, suposições e dúvidas que tínhamos. Com a matriz documentada, buscamos sanar as dúvidas e suposições entrevistando primeiramente os nossos stakeholders do produto e especialistas de dados.<br /><br /> Após isso, conversamos com alguns potenciais clientes para entender suas necessidades na prática e com isso, ouvimos falas que validaram várias das hipóteses sobre os principais desafios enfrentados no mercado em relação a dados.`,
  title2:
    "Com informações em mãos fizemos um brainstorming de ideias para o produto, seguido de clusterização das ideias mais relevantes e aplicação de MoSCoW para criar a esteira de priorização.",
  title3:
    "De forma geral, começava mapeando um fluxo funcional para entender e delimitar o escopo daquela parte da aplicação. Em seguida, criava os primeiros wireframes (baixa fidelidade) para validar rapidamente com as pessoas envolvidas. <br /><br />A partir desses alinhamentos, evoluía para o protótipo de alta fidelidade, refinando em ciclos de iteração até chegarmos em documentação e acompanhamento de handoff para uma entrega sólida e alinhada com os objetivos do produto, negócio e engenharia.",
  step4:
    "Este projeto me proporcionou a oportunidade de exercitar pensamento crítico, atenção aos detalhes e me mostrou a importância de trazer os stakeholder para perto na construção do produto, visando a tradução e aprofundamento em assuntos densos e complexos afim transforma-los em experiências fluidas e de baixa curva de aprendizagem do usuário.<br /><br /> Tive muita liberdade em explorar interações e padrões inovadores, além de investigar casos extremos que não haviam sido previstos no briefing inicial. A colaboração próxima com a engenharia de dados também me permitiu entender melhor a lógica e chamadas de visualização dos dashboards e como considerar exceções na construção do Design System do produto.",
  step5:
    "Além de tudo, tive a oportunidade de trabalhar com agentes de IA utilizando as plataformas n8n e Dify, o que ampliou significativamente minha visão sobre automações inteligentes e experiências assistidas. Também colaborei com grandes parceiros da Qlik na geração de dashboards personalizados e nativos, aprofundando meu entendimento em soluções de Business Intelligence aplicadas a contextos reais.",
  features: [
    "Placeat laborum quam.",
    "Corporis explicabo voluptas exercitationem",
    "In inventore consequatur autem.",
  ],
  counter_data: [
    {
      counter: 120,
      title: "Months Project Duration",
    },
    {
      counter: 45,
      title: "Average daily signups",
    },
    {
      counter: 300,
      title: "Average daily signups",
    },
  ],
  images: [
    portfolio_img_5,
    portfolio_img_6,
    portfolio_img_7,    
    portfolio_img_8,
    portfolio_img_9,
    portfolio_img_11,
   
    portfolio_img_12,
  ],
};

const { title, images, title2, title3,step4, step5 } = portfolio_detaisl_content;

const PortfolioDetailsArea = () => {
  return (
    <>
      <div className="porfolio-details__overview-wrapper black-bg-3">
        <div className="container">
          <div className="row">
            <div className="col-xl-12">
              <div className="porfolio-details__overview-thumb mb-100">
                <Image
                  data-speed="0.6"
                  src={portfolio_details_img_1}
                  style={{ height: "auto" }}
                  alt="image-here"
                />
              </div>
            </div>
            <div className="porfolio-details__overview-box mt-120 pb-100  ">
              <div className="row">
                <div className="col-xl-3 col-lg-2 ">
                  <div className="porfolio-details__overview-left">
                    <h4 className="porfolio-details__overview-title mb-40">
                      Design Process
                    </h4>
                  </div>
                </div>
                <div className="col-xl-9 col-lg-10">
                  <div className="porfolio-details__right-info mb-100">
                    <p dangerouslySetInnerHTML={{ __html: title }} />
                    <div className="service-details__fea-list">
                    <ul>
                      <li>
                        "Falta a informação correta e clara para tomar as
                        decisões que preciso"
                      </li>
                      <li>
                        "Tenho a informação, mas a visualização em planilha não
                        me dá um contexto completo"
                      </li>
                      <li>
                      "Tenho o mesmo tipo de informação em vários locais
                        diferentes e não sei qual é verdadeira"
                      </li>
                      <li>
                      "Tenho muitos painéis na empresa, mas não com as
                        informações que preciso"
                      </li>
                      <li>
                      "Custa muito caro ter um escritório de ciência de dados
                        na empresa"
                      </li>
                      <li>
                      "Não tenho um time capacitado para me auxiliar na
                        elaboração dos painéis que preciso"
                      </li>
                    </ul>
                    </div>
                  </div>
                </div>
                <div className="col-xl-12 mb-100">
                  <div className="porfolio-details__overview-thumb mb-100">
                    <Image
                      data-speed="0.6"
                      src={portfolio_img_1}
                      style={{ height: "auto" }}
                      alt="image-here"
                    />
                  </div>
                </div>                
              </div>
              <div className="row ">
                <div className="col-xl-6 col-lg-6">
                  <div className="porfolio-details__right-info">
                    <p>{title2}</p>
                    <p>
                      Por se tratar de um projeto construído do zero,
                      meu processo para desenvolvimento de propostas de design variou conforme o módulo ou
                      funcionalidade que estava sendo priorizado em cada
                      momento.
                    </p>
                  </div>
                </div>
                <div className="col-xl-6 col-lg-6 ">
                  <div className="porfolio-details__right-info ">
                  <p dangerouslySetInnerHTML={{ __html: title3 }} />
                  </div>
                </div>
              </div>
              <div className="col-xl-12 mb-100">
                <div className="porfolio-details__overview-thumb mb-100">
                  <Image
                    data-speed="0.6"
                    src={portfolio_img_4}
                    style={{ height: "auto" }}
                    alt="image-here"
                  />
                </div>
              </div>
              <div className="col-xl-12 mb-100">
                <div className="porfolio-details__overview-thumb mb-100">
                  <Image
                    data-speed="0.6"
                    src={portfolio_img_2}
                    style={{ height: "auto" }}
                    alt="image-here"
                  />
                </div>
              </div>
              <div className="row ">
              <div className="col-xl-5 col-lg-4 ">
                  <div className="porfolio-details__overview-left">
                    <h4 className="porfolio-details__overview-title mb-40">
                      Resultados<br/> e aprendizados
                    </h4>
                    
                  </div>
                  <div>
                  <Image
                      data-speed="0.9"
                      src={portfolio_img_13}
                      style={{ height: "auto", zIndex:"0",position:"relative" }}
                      alt="image-here"
                    />
                    </div>
                </div>
                
                <div className="col-xl-6 col-lg-8">
                  <div className="porfolio-details__right-info">
                  <p dangerouslySetInnerHTML={{ __html: step4 }} />
                    
                  </div>
                </div>
                <div className="col-xl-11 col-lg-11 ">
                  <div className="porfolio-details__right-info ">
                    <p>{step5}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="porfolio-details__thumb-box tp-project-3__area">
              <div className="row">
                <div className="col-xl-12">
                  <div className="tp-portfolio-item-wrapper-3">
                    {images.map((item, index) => (
                      <div
                        key={index}
                        className="tp-portfolio-item-3 portfolio-panel pb-80 tp-hover-reveal-text"
                      >
                        <a href="#">
                          <Image
                            src={item}
                            style={{ height: "auto" }}
                            alt="image-here"
                          />
                          <span></span>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="porfolio-details__navigation-wrap pb-125">
              <div className="row align-items-center">
                <div className="col-xl-4 col-lg-4 col-md-4 col-12">
                  <div className="porfolio-details__navigation-content text-center text-md-start">
                    <a href="/nestle">
                      <i className="fa-regular fa-arrow-left"></i>
                      <span>Anterior</span>
                    </a>
                    <h4>Nestlé</h4>
                  </div>
                </div>
                <div className="col-xl-4 col-lg-4 col-md-4 col-12">
                  <div className="porfolio-details__navigation-bar text-center">
                    <a href="#">
                      <span>
                        <svg
                          width="22"
                          height="22"
                          viewBox="0 0 22 22"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            opacity="0.5"
                            d="M1 5.21053C1 3.22567 1 2.23323 1.61662 1.61662C2.23323 1 3.22567 1 5.21053 1C7.19539 1 8.18782 1 8.80444 1.61662C9.42105 2.23323 9.42105 3.22567 9.42105 5.21053C9.42105 7.19539 9.42105 8.18782 8.80444 8.80444C8.18782 9.42105 7.19539 9.42105 5.21053 9.42105C3.22567 9.42105 2.23323 9.42105 1.61662 8.80444C1 8.18782 1 7.19539 1 5.21053Z"
                            stroke="white"
                            strokeWidth="1.5"
                          />
                          <path
                            opacity="0.5"
                            d="M12.5781 16.7896C12.5781 14.8048 12.5781 13.8123 13.1947 13.1957C13.8114 12.5791 14.8038 12.5791 16.7887 12.5791C18.7735 12.5791 19.7659 12.5791 20.3826 13.1957C20.9992 13.8123 20.9992 14.8048 20.9992 16.7896C20.9992 18.7745 20.9992 19.7669 20.3826 20.3835C19.7659 21.0002 18.7735 21.0002 16.7887 21.0002C14.8038 21.0002 13.8114 21.0002 13.1947 20.3835C12.5781 19.7669 12.5781 18.7745 12.5781 16.7896Z"
                            stroke="white"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M1 16.7896C1 14.8048 1 13.8123 1.61662 13.1957C2.23323 12.5791 3.22567 12.5791 5.21053 12.5791C7.19539 12.5791 8.18782 12.5791 8.80444 13.1957C9.42105 13.8123 9.42105 14.8048 9.42105 16.7896C9.42105 18.7745 9.42105 19.7669 8.80444 20.3835C8.18782 21.0002 7.19539 21.0002 5.21053 21.0002C3.22567 21.0002 2.23323 21.0002 1.61662 20.3835C1 19.7669 1 18.7745 1 16.7896Z"
                            stroke="white"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M12.5781 5.21053C12.5781 3.22567 12.5781 2.23323 13.1947 1.61662C13.8114 1 14.8038 1 16.7887 1C18.7735 1 19.7659 1 20.3826 1.61662C20.9992 2.23323 20.9992 3.22567 20.9992 5.21053C20.9992 7.19539 20.9992 8.18782 20.3826 8.80444C19.7659 9.42105 18.7735 9.42105 16.7887 9.42105C14.8038 9.42105 13.8114 9.42105 13.1947 8.80444C12.5781 8.18782 12.5781 7.19539 12.5781 5.21053Z"
                            stroke="white"
                            strokeWidth="1.5"
                          />
                        </svg>
                      </span>
                    </a>
                  </div>
                </div>
                <div className="col-xl-4 col-lg-4 col-md-4 col-12">
                  <div className="porfolio-details__navigation-content next text-center text-md-end">
                    <a href="/zoomtech-project">
                      <span>Próximo</span>
                      <i className="fa-regular fa-arrow-right"></i>
                    </a>
                    <h4>ZOOMtech</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PortfolioDetailsArea;
