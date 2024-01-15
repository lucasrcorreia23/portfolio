'use client';
import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

import project_img_1 from '@/assets/img/portfolio/organiconecta-home.jpg';
import project_img_2 from '@/assets/img/portfolio/prime8-home.jpg';
import project_img_3 from '@/assets/img/portfolio/ecosintese-home.jpg';

import project_img_4 from '@/assets/img/portfolio/ZOOMtech-home.jpg';
import project_img_5 from '@/assets/img/portfolio/brbassessoria-home.jpg';
import project_img_6 from '@/assets/img/portfolio/brisapollar-home.jpg';
import { gsap } from 'gsap';


const project_content = {
  blog_data_1: [
    {
      id: 1,
      img: project_img_1,
      bg_img: '/assets/img/portfolio/organiconecta-home.jpg',
      title: 'Organiconecta',
      category: 'Visual Identity - UI - UX Research - Website',
    },
    {
      id: 2,
      img: project_img_2,
      bg_img: '/assets/img/portfolio/prime8-home.jpg',
      title: 'Prime8',
      category: 'Visual Identity - UX/UI - Design System - eCommerce',
    },
    {
      id: 3,
      img: project_img_3,
      bg_img: '/assets/img/portfolio/ecosintese-home.jpg',
      title: 'ecoSíntese',
      category: 'UX/UI - Website',
    }
  ],
  blog_data_2: [
    {
      id: 4,
      img: project_img_4,
      bg_img: '/assets/img/portfolio/ecosintese-home.jpg',
      title: 'ZOOMtech',
      category: 'Brand Architect - UX Research - Visual Identity - UI - Website',
    },
    {
      id: 5,
      img: project_img_5,
      bg_img: '/assets/img/portfolio/brbassessoria-home.jpg',
      title: 'BRB Assessoria',
      category: 'Naming - Branding - UX/UI - Website',
    },
    {
      id: 6,
      img: project_img_6,
      bg_img: '/assets/img/portfolio/brisapollar-home.jpg',
      title: 'Brisapollar',
      category: 'UX/UI - Website',
    }
  ]
}

const { blog_data_1, blog_data_2 } = project_content

const PortfolioArea = () => {


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
            <div className="col-xl-6 grid-item">
              <div className="tp-portfolio-item-wrapper">
                {blog_data_1.map((item, index) => (
                  <div key={index + 2} className="tp-portfolio-item mb-70">
                    
                    <Link href="/portfolio-details">
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
                          <span className="tp-portfolio-meta-count">0{index}</span>                          
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
                            <span className="tp-portfolio-meta-link">View Project</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}

              </div>
            </div>
            <div className="col-xl-6 grid-item">
              <div className="tp-portfolio-item-wrapper">
                {blog_data_2.map((item, index) => (
                  <div key={index + 1} className="tp-portfolio-item mb-70">
                    <Link href="/portfolio-details">
                      <div className={`tp-portfolio-thumb img-${item.id} w-img fix`}>
                        <div className="tp-portfolio-thumb-img include-bg d-none" style={{ backgroundImage: `url(${item.img})` }}></div>
                        <div className="tp-portfolio-thumb-img">
                          <Image data-speed="0.85" style={{ height: 'auto' }} src={item.img} alt="image-here" />
                        </div>
                      </div>
                      <div className="tp-portfolio-content">
                        <h3 className="tp-portfolio-title">{item.title}</h3>
                        <div className="tp-portfolio-meta d-flex align-items-center">
                          <span className="tp-portfolio-meta-count">0{index + 3}</span>
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
                            <span className="tp-portfolio-meta-link">View Project</span>
                          </div>
                        </div>
                      </div>
                    </Link>
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