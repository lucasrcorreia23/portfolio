
import Link from 'next/link';
import React from 'react';

const Content = () => {
  return (
    <>
      <div className="blog-standard__area pt-200 black-bg-3 pb-50">
        <div className="container ">
          <div className="row">
            <div className="blog-list__title-box ">
              <span className="blog-list__subtitle tp-char-animation">Opa, projeto ainda em construção</span>
              
              <h4 className="blog-list__title tp-char-animation mb-3">Por favor volte em breve para conferir!</h4>
             
              
            </div>
            <div className="tp-hover-btn-wrapper tp-btn-bounce mb-30">
                      <Link href="/decision-suite" target="_blank" className="tp-hover-btn tp-hover-btn-item tp-btn-circle square">
                        <span className="tp-btn-circle-text text-center" >
                          Veja o<br/> projeto Decision Suite!
                        </span>
                        
                        <i className="tp-btn-circle-dot"></i>
                      </Link>
                </div>
      </div>
          </div>
        </div>

        
    </>
  );
};

export default Content;