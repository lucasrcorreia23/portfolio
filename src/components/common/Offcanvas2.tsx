
import React from 'react';
import Image from 'next/image';
import MobileMenus from '@/layouts/headers/menu/mobile-menus';

import bg_shape from "@/assets/img/offcanvas/bg-shape-3.png";
import logo_white from "@/assets/img/logo/logo.png";
import logo_black from "@/assets/img/logo/logo-black.png";

import offcanvas_1 from "@/assets/img/portfolio/ZOOMtech-home.jpg";
import offcanvas_2 from "@/assets/img/portfolio/organiconecta-home.jpg";
import offcanvas_3 from "@/assets/img/portfolio/prime8-home.jpg";
import offcanvas_4 from '@/assets/img/nestle/capa2.jpg';

interface Offcanvas2Props {
  showCanvas: boolean;
  setShowCanvas: (show: boolean) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Offcanvas2: React.FC<Offcanvas2Props> = ({ showCanvas, setShowCanvas }) => {
  return (
    <>
      <div className={`tp-offcanvas-area-2 tp-menu-2 ${showCanvas ? 'opened' : ''}`}>
        <div className="tp-offcanvas-shape">
          <Image className="tp-offcanvas-shape-2" src={bg_shape} alt="image" />
        </div>
        <div className="tp-offcanvas-circle-1">
          <span></span>
        </div>
        <div className="tp-offcanvas-circle-2">
          <span></span>
        </div>
        <div className="tp-offcanvas-wrapper">
          <div className="tp-offcanvas-top-2 d-flex align-items-center justify-content-between">
            <div className="tp-offcanvas-logo-2">
              <a href="#">
                <Image className="logo-white" src={logo_white} style={{height: 'auto'}} alt="image" />
                <Image className="logo-black" src={logo_black} style={{height: 'auto'}} alt="image" />
              </a>
            </div>
            <div className="tp-offcanvas-close-2">
              <button className="tp-offcanvas-close-btn-2 tp-offcanvas-open-btn-2" onClick={() => setShowCanvas(false)}>
                <svg width="37" height="38" viewBox="0 0 37 38" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.19141 9.80762L27.5762 28.1924" stroke="currentColor" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9.19141 28.1924L27.5762 9.80761" stroke="currentColor" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
          <div className="tp-offcanvas-main-2">
            <div className="tp-offcanvas-content-2">
              <h3 className="tp-offcanvas-content-title-2">Tudo bem?</h3>
              <p>Aqui estão os <a href="/portfolio">principais cases</a> <br />e logo abaixo meus contatos :&#41; </p>
            </div>
            <div className="tp-main-menu-mobile d-lg-none">
              <nav>
                <MobileMenus />
              </nav>
            </div>
            <div className="tp-offcanvas-gallery">
              <div className="row gx-2">
                
                <div className="col-md-3 col-3">
                  <div className="tp-offcanvas-gallery-img fix h-10 w-10">
                    <a className="h-10" href="/prime8-project"><Image src={offcanvas_3} alt="image" /></a>
                  </div>
                </div>
                <div className="col-md-3 col-3">
                  <div className="tp-offcanvas-gallery-img fix h-10 w-10">
                    <a className="h-10" href="/nestle"><Image src={offcanvas_4} alt="image" /></a>
                  </div>
                </div>
                
                <div className="col-md-3 col-3">
                  <div className="tp-offcanvas-gallery-img fix h-10 w-10">
                    <a className="h-10" href="/zoomtech-project"><Image src={offcanvas_1} alt="image" /></a>
                  </div>
                </div>
                <div className="col-md-3 col-3">
                  <div className="tp-offcanvas-gallery-img fix h-10 w-10">
                    <a className="h-10" href="/construcao"><Image src={offcanvas_2} alt="image" /></a>
                  </div>
                </div>
                
              </div>
            </div>
            <div className="tp-offcanvas-contact-2">
              <h3 className="tp-offcanvas-contact-title-2">Contatos</h3>

              <ul>
                <li><a href="tel:5548999247580">+55 (48) 9 9924 7580</a></li>
                <li><a href="mailto:lucas_rc15@live.com">lucas_rc15@live.com</a></li>
                <li><a href="https://maps.app.goo.gl/Hi53T6eiZnHGn1oGA" target="_blank">Palhoça, SC - Brasil</a></li>
              </ul>
            </div>
            <div className="tp-offcanvas-social-2">
              
              <ul>  
              <li>
                  <a href="https://www.linkedin.com.br/in/lucasrcorreia" target="_blank">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                  </a>
                </li>              
                <li>
                  <a href="https://www.github.com/lucasrcorreia23" target="_blank">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                  </a>
                </li>
                <li>
                  <a href="https://www.be.net/lucasrodriguxs" target="_blank">
                    <svg width="18" height="11" viewBox="0 0 18 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M1 5.5715H6.33342C7.62867 5.5715 8.61917 6.56199 8.61917 7.85725C8.61917 9.15251 7.62867 10.143 6.33342 10.143H1.76192C1.30477 10.143 1 9.83823 1 9.38108V1.76192C1 1.30477 1.30477 1 1.76192 1H5.5715C6.86676 1 7.85725 1.99049 7.85725 3.28575C7.85725 4.58101 6.86676 5.5715 5.5715 5.5715H1Z"
                        stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" />
                      <path
                        d="M10.9062 7.09454H17.0016C17.0016 5.41832 15.6301 4.04688 13.9539 4.04688C12.2777 4.04688 10.9062 5.41832 10.9062 7.09454ZM10.9062 7.09454C10.9062 8.77076 12.2777 10.1422 13.9539 10.1422H15.2492"
                        stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round"
                        strokeLinejoin="round" />
                      <path d="M16.1125 1.44434H11.668" stroke="currentColor" strokeWidth="1.2"
                        strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                </li>
                
                <li>
                  <a href="https://www.instagram.com/lucasrodriguxs" target="_blank">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M11.25 1.5H4.75C2.95507 1.5 1.5 2.95507 1.5 4.75V11.25C1.5 13.0449 2.95507 14.5 4.75 14.5H11.25C13.0449 14.5 14.5 13.0449 14.5 11.25V4.75C14.5 2.95507 13.0449 1.5 11.25 1.5Z"
                        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path
                        d="M10.6016 7.5907C10.6818 8.13166 10.5894 8.68414 10.3375 9.16955C10.0856 9.65497 9.68711 10.0486 9.19862 10.2945C8.71014 10.5404 8.15656 10.6259 7.61663 10.5391C7.0767 10.4522 6.57791 10.1972 6.19121 9.81055C5.80451 9.42385 5.54959 8.92506 5.46271 8.38513C5.37583 7.8452 5.46141 7.29163 5.70728 6.80314C5.95315 6.31465 6.34679 5.91613 6.83221 5.66425C7.31763 5.41238 7.87011 5.31998 8.41107 5.4002C8.96287 5.48202 9.47372 5.73915 9.86817 6.1336C10.2626 6.52804 10.5197 7.0389 10.6016 7.5907Z"
                        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M11.5742 4.42578H11.5842" stroke="currentColor" strokeWidth="1.5"
                        strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Offcanvas2;