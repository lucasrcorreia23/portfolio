"use client";
import Link from 'next/link';
import Image from 'next/image';
import React from 'react';

import portfolio_img_1 from "@/assets/img/portfolio/ZOOMtech-home.jpg";
import portfolio_img_2 from "@/assets/img/portfolio/organiconecta-home.jpg";
import portfolio_img_3 from "@/assets/img/portfolio/prime8-home.jpg";

import UpArrowIconPortfolio from '@/svg/home/PortfolioIcons/UpArrowIconPortfolio';
import RitghtArrowIconPortfolio from '@/svg/home/PortfolioIcons/RitghtArrowIconPortfolio';

const portfolio_content = {
  subtitle: '',
  title: 'Principais projetos',
  portfolio_data: [
    
    
    {
      id: 2,
      link:"/zoomtech-project",
      img: portfolio_img_1,
      bg_img: "/assets/img/portfolio/ZOOMtech-home.jpg",
      title: 'ZOOMtecnologia',
      tags:"Brand Architect - Visual Identity - UX/UI - Website",
    },
    {
      id: 3,
      link:"/construcao",
      img: portfolio_img_3,
      bg_img: "/assets/img/portfolio/prime8-home.jpg",
      title: "Prime8",
      tags:"Visual Identity - UX/UI - Design System - eCommerce",
    }
  ]
}
const { subtitle, title, portfolio_data, } = portfolio_content


const PortfolioAreaHomeOne = () => {

  return (
    <>
      <section className="tp-portfolio-area tp-btn-trigger-2 p-relative z-index-1 pt-280 pb-40 fix">
        <div className="tp-portfolio-top-text tp-portfolio-bg-text d-flex align-items-center tp-portfolio-bg-text-animation">
          <p>{title}</p>
          <p>{title}</p>
        </div>
        <div className="container">
          <div className="row">
            <div className="col-xl-6 col-lg-6">
              <div className="tp-portfolio-wrapper pr-30 pt-55">
                <div className="tp-section-title-wrapper mb-60">
                  <div className="tp-section-title-inner tp_title_anim p-relative">
                    <span className="tp-section-subtitle tp-portfolio-subtitle">{subtitle}</span>
                    <h3 className="tp-section-title tp_title_anim">{title}</h3>
                  </div>
                </div>
                <div className="tp-portfolio-item-wrapper">
                  <div className="tp-portfolio-item mb-70">
                    <Link href="/construcao">
                      <div className="tp-portfolio-thumb img-1 w-img fix ">
                        <div className="tp-portfolio-thumb-img include-bg d-none"
                          style={{ backgroundImage: 'url(/assets/img/portfolio/Home.png)' }}></div>
                        <div className="tp-portfolio-thumb-img ">
                          <Image data-speed="0.85" style={{ objectFit: 'cover', height: "auto" }} src={portfolio_img_2} alt="image-here" />
                        </div>
                      </div>
                      <div className="tp-portfolio-content">
                        <h3 className="tp-portfolio-title">Organiconecta </h3>
                        <div className="tp-portfolio-meta d-flex align-items-center">
                          <span className="tp-portfolio-meta-count">02</span>
                          <span className="tp-portfolio-meta-arrow">
                            <RitghtArrowIconPortfolio />
                          </span>
                          <div className="tp-portfolio-meta-hover">
                            <span> Startup - Visual Identity - UI Design - UX Research - Website </span>
                            <span className="tp-portfolio-meta-link">Ver projeto</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                </div>
                <div className="tp-portfolio-more tp-hover-btn-wrapper tp-btn-bounce-2 d-none d-lg-block">
                  <Link href="/portfolio"
                    className="tp-hover-btn tp-hover-btn-item tp-btn-circle-2 d-flex align-items-center justify-content-center flex-column">
                    <span className="tp-btn-circle-text-2">
                      Todos <br /> os projetos
                      <span className="tp-btn-circle-arrow-2">
                        <UpArrowIconPortfolio />
                      </span>
                    </span>
                    <i className="tp-btn-circle-dot"></i>
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-xl-6 col-lg-6">
              <div className="tp-portfolio-item-wrapper pl-50">
                {portfolio_data.map((item, i) =>
                  <div key={i} className="tp-portfolio-item mb-70">
                    <Link href={item.link}>
                      <div className="tp-portfolio-thumb img-2 w-img fix">

                        <div className="tp-portfolio-thumb-img include-bg d-none"
                          style={{ backgroundImage: `url(${item.bg_img})`, height: "auto" }}></div>
                        <div className="tp-portfolio-thumb-img">
                          <Image data-speed="0.85" style={{ height: "auto",}} src={item.img} alt="image-here" />
                        </div>
                      </div>
                      <div className="tp-portfolio-content">
                        <h3 className="tp-portfolio-title">{item.title}</h3>
                        <div className="tp-portfolio-meta d-flex align-items-center">
                          <span className="tp-portfolio-meta-count">01</span>
                          <span className="tp-portfolio-meta-arrow">
                            <RitghtArrowIconPortfolio />
                          </span>
                          <div className="tp-portfolio-meta-hover">
                            <span>{item.tags}</span>
                            <span className="tp-portfolio-meta-link">Ver projeto</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                )} 
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default PortfolioAreaHomeOne;