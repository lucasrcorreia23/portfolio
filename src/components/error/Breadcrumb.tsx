

import Link from 'next/link';
import React from 'react';

const Breadcrumb = () => {
  return (
    <>
      <div className="blog-standard__area pt-200 black-bg-3">
        <div className="container">
          <div className="row">
            <div className="blog-list__title-box">
              <span className="blog-list__subtitle tp-char-animation">Opa! Algo de errado não esta certo.</span>
              <h4 className="blog-list__title tp-char-animation">Error 404</h4>
              
              <div className="tp-hover-btn-wrapper tp-btn-bounce mb-30">
                      <Link href="/" target="_blank" className="tp-hover-btn tp-hover-btn-item tp-btn-circle square">
                        <span className="tp-btn-circle-text text-center" >
                          Vem pra Home!
                        </span>
                        
                        <i className="tp-btn-circle-dot"></i>
                      </Link>
                </div>
                <div className="tp-hover-btn-wrapper    ml-30 mb-30">
                      <Link href="/portfolio" target="_blank" className="tp-hover-btn tp-hover-btn-item tp-btn-circle square">
                        <span className="tp-btn-circle-text text-center" >
                          Ou veja projetos
                        </span>
                        
                        <i className="tp-btn-circle-dot"></i>
                      </Link>
                </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Breadcrumb;