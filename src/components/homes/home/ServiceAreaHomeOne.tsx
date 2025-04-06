'use client';
import React, {useState } from 'react';





const service_content = {
  subtitle: "",
  title: <>Competências, habilidades</>,
  sm_des: <>E uma brincadeirinha com os assuntos que mais me interessam </>,
  accordion_data: [
    {
      id: 1,
      tab_id: "One",
      question: "Product Designer/UX Designer",
      answer: "Atuação completa do ciclo de produtos digitais: discovery, design, delivery, GTM e acompanhamento das métricas de sucesso.",
      some_features: [
        "Prototipação e Wireframe",        
        "Pesquisas Quanti., Quali., Desk",
        "Testes e jornada do usuário",
        "Design System, DesignOps",
        "Métricas de sucesso",
      ]
    },
    {
      id: 2,
      tab_id: "Two",
      question: "Gestão de Produto",
      answer: "Compreensão das boas práticas ágeis e rituais em gestão de produto.",
      some_features: [       
        "BDD, Adaptabilidade, Lean",        
        "Aprendizado contínuo e iterações",
        "Documentação",
        "Jira, Miro, Gitlab",
      ]
    },
    {
      id: 3,
      tab_id: "Three",
      question: "Desenvolvedor Front-end",
      answer: "Compreensão e vivência nas principais tecnologias, frameworks e bibliotecas para estreita colaboração",
      some_features: [
        "HTML, CSS, JS, TS",
        "Next.js, React.js, Node.js",
        "Tailwindcss, Bootstrap",       
        "Git, Github",        
        "SQL",
      ]
    },
    
    {
      id: 4,
      tab_id: "Four",
      question: "Marketing",
      answer: "Acompanhamento e desenvolvimento do Go-To-Market junto ao departamento para garantir a mensagem da marca e sucesso do produto",
      some_features: [
       
        
      ]
    }
  ]
}

const { subtitle, title, sm_des, accordion_data } = service_content;


const ServiceAreaHomeOne = () => {
  const [active, setActive] = useState(1);

  const handleItemClick = (index: number) => {
    setActive(index);
  }

  return (
    <>
      <section className="tp-services-area tp-sv tp-services-bg-text-animation fix" id="tp-sv">
        <div className="container container-large">
          <div className="tp-services-inner p-relative z-index-1">

            <span className="tp-services-inner-border tp-vertical-line transition-3"></span>
            <span className="tp-services-inner-border right tp-vertical-line transition-3"></span>

           {/*} <div className="tp-services-bottom-text tp-services-bg-text">
              <p>Oportunidades</p>
            </div> */}
            <div className="row gx-0">

              <div className="col-xl-6 col-lg-7">
                <div className="tp-services-wrapper tp-services-capsule-wrapper p-relative pt-100 pr-70" style={{ paddingTop: "100px", }}
                  data-tp-throwable-scene="true">
                  <div className="tp-section-title-wrapper tp_text_anim mb-170">
                    <div className="tp-section-title-inner p-relative">
                      <span className="tp-section-subtitle">{subtitle}</span>
                      <h3 className="tp-section-title tp_title_anim">{title}</h3>
                    </div>
                    <p>{sm_des}</p>
                  </div>

                  <div className="tp-services-capsule-item-wrapper">
                    <p data-tp-throwable-el="">
                      <span className="tp-services-capsule-item" style={{ backgroundColor: "#19B3F1",color: "#121212" }}>Front-end</span>
                    </p>
                    <p data-tp-throwable-el="">
                      <span className="tp-services-capsule-item" style={{ backgroundColor: "#FFDB59",color: "#121212" }}>Prototipagem</span>
                    </p>
                    <p data-tp-throwable-el="">
                      <span className="tp-services-capsule-item" style={{ backgroundColor: "#19B3F1",color: "#121212" }}>IA</span>
                    </p>
                    <p data-tp-throwable-el="">
                      <span className="tp-services-capsule-item" style={{ backgroundColor: "#00CC97", color: "#121212" }}>Discovery</span>
                    </p>
                    <p data-tp-throwable-el="">
                      <span className="tp-services-capsule-item" style={{ backgroundColor: "#00CC97", color: "#121212" }}>Ideação</span>
                    </p>
                    <p data-tp-throwable-el="">
                      <span className="tp-services-capsule-item" style={{ backgroundColor: "#00CC97",color: "#121212" }}>Posicionamento de Marca</span>
                    </p>
                    <p data-tp-throwable-el="">
                      <span className="tp-services-capsule-item" style={{ backgroundColor: "#FFDB59",color: "#121212" }}>Pessoas</span>
                    </p>
                    <p data-tp-throwable-el="">
                      <span className="tp-services-capsule-item" style={{ backgroundColor: "#FFDB59", color: "#121212" }}>Métricas</span>
                    </p>
                    <p data-tp-throwable-el="">
                      <span className="tp-services-capsule-item" style={{ backgroundColor: "#FFDB59", color: "#121212" }}>Problemas</span>
                    </p>
                    <p data-tp-throwable-el="">
                      <span className="tp-services-capsule-item" style={{ backgroundColor: "#00CC97",color: "#121212" }}>Jornada de Compra</span>
                    </p>                   
                    <p data-tp-throwable-el="">
                      <span className="tp-services-capsule-item" style={{ backgroundColor: "#FFDB59",color: "#121212" }}>KPI</span>
                    </p>
                    <p data-tp-throwable-el="">
                      <span className="tp-services-capsule-item" style={{ backgroundColor: "#00CC97",color: "#121212" }}>User Testing</span>
                    </p>
                    <p data-tp-throwable-el="">
                      <span className="tp-services-capsule-item" style={{ backgroundColor: "#FFDB59",color: "#121212" }}>Product Design</span>
                    </p>
                    <p data-tp-throwable-el="">
                      <span className="tp-services-capsule-item" style={{ backgroundColor: "#FF759C",color: "#121212" }}>Games</span>
                    </p>
                   
                  </div>

                </div>
              </div>

              <div className="col-xl-6 col-lg-5">
                <div className="tp-services-accordion tp-accordion tp-accordion-2 pl-70 p-relative" style={{ marginTop: "90px" }}>
                  <span className="tp-services-accordion-border"></span>
                  <div className="accordion" id="accordionExample">

                    {accordion_data.map((item, i) => (
                      <div key={i} onClick={() => handleItemClick(i)} className={`accordion-item tp-services-accordion-item ${active === i ? 'active' : ''}`}>
                        <h2 className="accordion-header" id={`heading${item.tab_id}`}>
                          <button
                            className={`accordion-button ${i === 1 ? '' : 'collapsed'}`}
                            type="button"
                            data-bs-toggle="collapse"
                            data-bs-target={`#collapse${item.tab_id}`}
                            aria-expanded={`${i === 1 ? 'true' : 'false'}`}
                            aria-controls={`collapse${item.tab_id}`}
                            tabIndex={0}
                          >
                            <span>0{item.id}</span>
                            {item.question}
                          </button>
                        </h2>
                        <div
                          id={`collapse${item.tab_id}`}
                          className={`accordion-collapse collapse ${i === 1 ? 'show' : ''}`}
                          aria-labelledby={`heading${item.tab_id}`}
                          data-bs-parent="#accordionExample"
                        >
                          <div className="accordion-body">
                            <p>{item.answer}</p>
                            <ul>
                              {item.some_features.map((feature, index) => (
                                <li key={index}>{feature}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <span className="accordion-item-border"></span>
                      </div>
                    ))}

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

export default ServiceAreaHomeOne;