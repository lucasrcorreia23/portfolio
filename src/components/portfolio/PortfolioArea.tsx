'use client';
import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

import project_img_1 from '@/assets/img/portfolio/organiconecta-home.jpg';
import project_img_2 from '@/assets/img/portfolio/prime8-home.jpg';
import project_img_3 from '@/assets/img/decision-suite/cover-img.jpg';

import project_img_4 from '@/assets/img/portfolio/ZOOMtech-home.jpg';
import project_img_5 from '@/assets/img/nestle/capa2.jpg';

import { gsap } from 'gsap';

import UseHoverReveal from '@/hooks/UseHoverReveal';




const project_content = {
 
  blog_data_1: [
    
    
    {
      id: 5,
      img: project_img_3,
      bg_img: '/assets/img/decision-suite/cover-img.jpg',
      hover_img: '/assets/img/decision-suite/hover-port.jpg',
      title: 'Decision Suite',
      category: 'SaaS - Research - Dados - IA - Mobile - End to End',
      link:"/decision-suite"
      
    },
    {
      id: 1,
      img: project_img_1,
      bg_img: '/assets/img/portfolio/organiconecta-home.jpg',
      hover_img: '/assets/img/portfolio/hover/Organiconecta.png',
      title: 'Organiconecta',
      category: 'Startup - Visual Identity - UI - UX Research - Website',
      link:"/construcao"
      
    },
   
    {
      id:3,
      img: project_img_4,
      bg_img: '/assets/img/portfolio/ecosintese-home.jpg',
      hover_img:'/assets/img/portfolio/hover/zoomtech.png',
      title: 'ZOOMtecnologia',
      category: 'Brand Architect - UX Research - Visual Identity - UI - Website',
      link:"/zoomtech-project"
    },
   
  ],
  blog_data_2: [
    {
      id: 2,
      img: project_img_2,
      bg_img: '/assets/img/portfolio/prime8-home.jpg',
      hover_img: '/assets/img/portfolio/hover/prime8.png',
      title: 'Prime8',
      category: 'Visual Identity - UX/UI - Design System - eCommerce',
      link:"/prime8-project"
    },
    
    
    {
      id: 4,
      img: project_img_5,
      bg_img: '/assets/img/nestle/capa2.jpg',
      hover_img:'',
      title: 'Nestlé',
      category: 'Ads - Trade - eCommerce - Motion - App',
      link:"/nestle"
    },
    {
      id: 4,
      img: project_img_5,
      bg_img: '/assets/img/nestle/capa2.jpg',
      hover_img:'',
      title: 'Orbsofty',
      category: 'Telemarketing - SaaS - Omnichannel - UI',
      link:"/contrucao"
    },
    
  ]
}

const { blog_data_1, blog_data_2, } = project_content


const PortfolioArea = () => {
  const {handleMouseMove} = UseHoverReveal();


  useEffect(() => {

    /* portfolio animation start */
    gsap.set('.tp-portfolio-bg-text', {
      x: '25%'
    });

    gsap.timeline({
      scrollTrigger: {
        trigger: '.tp-portfolio-bg-text-animation',
        start: '-500 0%',
        end: 'bottom -10%',
        scrub: true,
        invalidateOnRefresh: true
      }
    })
      .to('.tp-portfolio-bg-text', {
        x: '-80%'
      });

    gsap.timeline({
      scrollTrigger: {
        trigger: '.portfolio-list-scroll-text-animation',
        start: '-500 0%',
        end: 'bottom -10%',
        scrub: true,
        invalidateOnRefresh: true
      }
    })
      .to('.portfolio-list-scroll-text', {
        x: '-80%'
      });

  }, [])


  return (
    <>
      <div className="porfolio-inner__thumb-wrapper tp-portfolio-effect portfolio-list-scroll-text-animation p-relative fix  black-bg-3 pt-80 pb-50"
        data-scrub="0.0001">
        <div className="portfolio-list-scroll-text pb-80 d-flex align-items-center">
          <p>Principais projetos</p>
          <p>Principais projetos</p>
        </div>
        <div className="container">
          <div className="row grid gx-90">
            <div className="col-xl-6 grid-item ">
              <div className="tp-portfolio-item-wrapper">
                {blog_data_1.map((item, index ,) => (
                  <div key={index} className="tp-portfolio-item mb-70 tp-hover-reveal-item tp-award-item"
                  onMouseMove={(event) => handleMouseMove(event, '.tp-hover-reveal-item')} >
                    
                    <Link href={item.link}>
                      <div className={`tp-portfolio-thumb img-${item.id} w-img fix`}>
                        <div className="tp-portfolio-thumb-img include-bg d-none"
                          style={{ backgroundImage: `url(${item.bg_img})`}}></div>
                        <div className="tp-portfolio-thumb-img">
                          <Image data-speed="0.85" style={{ height: 'auto' }} src={item.img} alt="image-here" />
                        </div>
                      </div>
                      <div className="tp-portfolio-content">
                        <h3 className="tp-portfolio-title">{item.title}</h3>
                        <div className="tp-portfolio-meta d-flex align-items-center">
                                                 
                          <span className="tp-portfolio-meta-arrow">

                            <svg width="42" height="13" viewBox="0 0 42 13" fill="none"
                              xmlns="http://www.w3.org/2000/svg">
                              <path d="M35.4889 1L41 6.33338L35.4889 11.6667" stroke="currentColor"
                                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M0.999998 6.33179H41" stroke="currentColor" strokeWidth="1.5"
                                strokeLinecap="round" strokeLinejoin="round" />
                            </svg>

                          </span>
                          <div className="tp-portfolio-meta-hover">
                            <span>{item.category}</span>
                            <span className="tp-portfolio-meta-link">Ver projeto</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                    <div className="tp-hover-reveal-bg" style={{ backgroundImage: `url(${item.hover_img})` }}></div>
                  </div>
                ))}

              </div>
            </div>
            <div className="col-xl-6 grid-item ">
              <div className="tp-portfolio-item-wrapper">
                {blog_data_2.map((item, index) => (
                  <div key={index+3} className="tp-portfolio-item mb-70 tp-hover-reveal-item tp-award-item"
                  onMouseMove={(event) => handleMouseMove(event, '.tp-hover-reveal-item')}>
                    <Link href={item.link}>
                      <div className={`tp-portfolio-thumb img-${item.id} w-img fix`}>
                        <div className="tp-portfolio-thumb-img include-bg d-none" style={{ backgroundImage: `url(${item.img})` }}></div>
                        <div className="tp-portfolio-thumb-img">
                          <Image data-speed="0.85" style={{ height: 'auto' }} src={item.img} alt="image-here" />
                        </div>
                      </div>
                      <div className="tp-portfolio-content">
                        <h3 className="tp-portfolio-title">{item.title}</h3>
                        <div className="tp-portfolio-meta d-flex align-items-center">
                         
                          <span className="tp-portfolio-meta-arrow">
                            <svg width="42" height="13" viewBox="0 0 42 13" fill="none"
                              xmlns="http://www.w3.org/2000/svg">
                              <path d="M35.4889 1L41 6.33338L35.4889 11.6667" stroke="currentColor"
                                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M0.999998 6.33179H41" stroke="currentColor" strokeWidth="1.5"
                                strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                          <div className="tp-portfolio-meta-hover">
                            <span>{item.category}</span>
                            <span className="tp-portfolio-meta-link">Ver projeto</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                    <div className="tp-hover-reveal-bg" style={{ backgroundImage: `url(${item.hover_img})` }}></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PortfolioArea;