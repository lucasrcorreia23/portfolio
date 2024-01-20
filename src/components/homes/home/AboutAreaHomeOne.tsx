
import React from 'react';

import Count from '@/components/common/Count';


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
  Com mais de 5 anos de experiência no mercado, sou um UX/UI Designer e Desenvolvedor com versatilidade para marketing, design e programação.<br/><br/>Atualmente, sou discente no MBA de UX Design & Strategy da FIAP e atuo como freelancer em um estúdio de branding e design, planejando e executando projetos desde a descoberta e pesquisa inicial até o deploy em produção.</>,
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

const { subtitle,about_des, counter_data } = about_content

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
                  </div>
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