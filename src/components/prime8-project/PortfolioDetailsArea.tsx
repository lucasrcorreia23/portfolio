import React from "react";
import Image, { StaticImageData } from "next/image";

import portfolio_details_img_1 from "@/assets/img/prime8-project/pesquisas.png";
import portfolio_img_1 from "@/assets/img/prime8-project/id-visual-1.png";
import portfolio_img_4 from "@/assets/img/prime8-project/tablet-1.jpg";
import portfolio_img_2 from "@/assets/img/prime8-project/id-visual-2.png";

import portfolio_img_5 from "@/assets/img/prime8-project/foto1.jpg";
import portfolio_img_6 from "@/assets/img/prime8-project/foto2.png";
import portfolio_img_7 from "@/assets/img/prime8-project/foto6.png";
import portfolio_img_8 from "@/assets/img/prime8-project/foto5.png";
import portfolio_img_9 from "@/assets/img/prime8-project/foto4.png";
import portfolio_img_11 from "@/assets/img/prime8-project/mobile.png";
import portfolio_img_12 from "@/assets/img/prime8-project/prototipo1.png";
import portfolio_img_10 from "@/assets/img/prime8-project/fotocapa.png";

interface DataType {
  title: string;
  title2:string;
  title3:string;
  features: string[];
  counter_data: {
    counter: number;
    title: string;
  }[];
  images: StaticImageData[];
}

const portfolio_detaisl_content: DataType = {
  title:
    "Com a jornada de compra, personas, mapa de empatia e análise das principais concorrentes documentados, começamos o processo de criação e parametrização das regras de aplicação da marca, incluindo palheta de cores, tipografia, elementos de apoio e princípios de design da unidade de negócio.",
    title2:"Definida a identidade visual e as diretrizes da marca, criamos um sistema de design para o produto e documentamos todas as etapas de manipulação e otimização do sistema. Com todos os componentes visuais prontos, começamos a criar protótipos baseados nas informações que coletamos. Realizamos ciclos semanais de iterações, que incluiam testes com usuários ao final de cada ciclo, para aprimorar continuamente com base no feedback dos stakeholders internos e usuários. ",
    title3:"O objetivo era mapear a jornada de compra mais eficiente, sem atrito algum, que fosse objetiva e ao mesmo tempo transmitisse segurança tanto para o comprador quanto para os nossos sistemas internos de atendimento ao cliente e processos de pós-compra.",
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
  images: [portfolio_img_5, portfolio_img_6, portfolio_img_12, portfolio_img_7, portfolio_img_8, portfolio_img_9,portfolio_img_11,  portfolio_img_4,portfolio_img_10,  ],
};

const { title, images, title2, title3 } = portfolio_detaisl_content;

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
                <div className="col-xl-5 col-lg-4 ">
                  <div className="porfolio-details__overview-left">
                    <h4 className="porfolio-details__overview-title mb-40">
                      Identidade visual
                    </h4>
                  </div>
                </div>
                <div className="col-xl-7 col-lg-8">
                  <div className="porfolio-details__right-info mb-100">
                    <p>{title}</p>
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
              </div>
              <div className="row ">
                <div className="col-xl-6 col-lg-6">
                  <div className="porfolio-details__right-info">
                  <p>{title2}</p>
                  </div>
                </div>
                <div className="col-xl-6 col-lg-6 ">
                  <div className="porfolio-details__right-info ">
                    <p>{title3}</p>
                    <p>Esse processo incluiu garantir uma transação suave de pagamento e a aprovação de crédito, além de verificação dos CNAE em cada CNPJ.</p>
                  </div>
                </div>
                </div>
            </div>
            
            <div className="porfolio-details__thumb-box tp-project-3__area">
              <div className="row">
                <div className="col-xl-12">
                  <div className="tp-portfolio-item-wrapper-3">

                    {images.map((item, index) => (
                      <div key={index} className="tp-portfolio-item-3 portfolio-panel pb-80 tp-hover-reveal-text">
                        <a href="#">
                          <Image src={item} style={{ height: 'auto' }} alt="image-here" />
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
                    <a href="/construcao">
                      <i className="fa-regular fa-arrow-left"></i>
                      <span>Anterior</span>
                    </a>
                    <h4>Organiconecta</h4>
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
                    <h4>ZOOMtecnologia</h4>
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
