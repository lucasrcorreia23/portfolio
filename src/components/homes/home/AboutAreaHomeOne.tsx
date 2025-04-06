
import React from 'react';

//import Count from '@/components/common/Count';


type DataType = {
  subtitle: string; // subtitle
  award_title: string; // award title
  award_des: string; // award description
  about_des: React.JSX.Element; // about description
  counter_data: {
    id: number;
    count: number;
    text: string;
  }[];
}


const about_content: DataType = {
  subtitle: "Sobre mim",
  award_title: "",
  award_des: "",
  about_des: <>

A paixão pelo universo tech começou cedo nos jogos online, onde me destaquei e tive contato com diversos paises e culturas digitalmente.
  

  <br/><br/>Com mais de 6 anos de experiência como designer e 2 com produto, sempre trabalhei em ambientes colaborativos e de ritmo acelerado.
  <br/><br/>Minha trajetória inclui passagens pela Nestlé, ZOOMtecnologia, Grupo Rumo.On e Secretaria do Estado de SC. Sou formado em Design com MBA em Estratégia e Design de UX pela FIAP. <br/><br/>Como destaque, participei da concepção e evolução de produtos inovadores de IA em diferentes mercados: dados, energia renovável, saúde, contábil e telemarketing. </>,
  counter_data: [
    {
      id: 1,
      count: 10,
      text: "Projetos autorais",
    },
    {
      id: 2,
      count: 5,
      text: "Anos de experiência",
    },
    {
      id: 3,
      count: 8000,
      text: "Cafés degustados",
    }
  ],
}

const { subtitle,about_des,  } = about_content

const AboutAreaHomeOne = () => {
  return (
    <>
      <section className="tp-about-area fix">
        <div className="container container-large">
          <div className="tp-about-inner pt-145 pb-80" style={{ paddingTop: "145px", paddingBottom: "80px" }}>
            <span className="tp-about-inner-border transition-3"></span>
            <div className="row">
              <div className="col-xl-5 col-lg-5">
                <div className="tp-about-wrapper">
                  <div className="tp-section-title-wrapper p-relative mb-45">
                    <span className="tp-section-subtitle-bg">{subtitle}</span>
                    <span className="tp-section-subtitle tp-section-subtitle-1 tp-about-subtitle">{subtitle}</span>
                  </div>
                  <div className="tp-about-thumb-wrapper p-relative z-index-1">
                    {/*<div className="tp-about-thumb p-relative z-index-1">
                      <div className="tp-about-thumb-bg-shape include-bg"
                        style={{ backgroundImage: 'url(/assets/img/about/shape/about-shape-1.png)' }}></div>
                      <Image src={about_img} alt="image" />
  </div>*/}
                  </div>
                  
                </div>
              </div>
              <div className="col-xl-7 col-lg-7">
                <div className="tp-about-desc">
                  
                  <div className="tp-about-desc-content mb-40">
                    <p>{about_des}</p>
                  </div>
                  {/*
                  <div className="tp-about-fact">
                    <div className="row">
                      {counter_data.map((item, index) => (
                        <div key={index} className="col-md-4 col-sm-6 mb-30">
                          <div className="tp-about-fact-item">
                            <h4 className="d-flex">
                              <span className="purecounter">
                                <Count number={item.count} />
                                </span>+
                              </h4>
                            <p>{item.text}</p>
                          </div>
                        </div>
                      ))} 
                    </div>
                  </div>*/}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default AboutAreaHomeOne;