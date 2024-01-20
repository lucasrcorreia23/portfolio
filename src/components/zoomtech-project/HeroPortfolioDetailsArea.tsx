

'use client'
import React from 'react';
import Image from 'next/image';
import { scroller } from 'react-scroll';

import banner_img from "@/assets/img/portfolio/zoomtech-hero.jpg";
import PortfolioDownArrowIcon from '@/svg/icons/PortfolioDownArrowIcon';


const scrollTo = () => {
  scroller.scrollTo('porfolio-details', {
    duration: 800,
    delay: 0,
    smooth: 'easeInOutQuart',
  });
};

const HeroPortfolioDetailsArea = () => {
  return (
    <>
      <div className="porfolio-details__area porfolio-details__color-customize p-relative smooth">
        <a className='pointer' onClick={scrollTo}>
          <div className="tp-hero-3__scrool-down z-index-5">
            <span className="text">Scroll</span> 
            <PortfolioDownArrowIcon />
          </div>
        </a>
        <div className="porfolio-details__hero-img">
          <Image priority data-speed="1.1" src={banner_img} alt="Mockup site em todos os dispositivos" />
        </div>
      </div>
    </>
  );
};

export default HeroPortfolioDetailsArea;