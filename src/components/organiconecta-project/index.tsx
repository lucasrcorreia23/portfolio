
import React from 'react';
import HeaderFour from '@/layouts/headers/HeaderFour';
import HeroPortfolioDetailsArea from './HeroPortfolioDetailsArea';
import PortfolioAboutArea from './PortfolioAboutArea';
import PortfolioDetailsArea from './PortfolioDetailsArea';
import FooterOne from '@/layouts/footers/FooterOne';
import HeaderOne from '@/layouts/headers/HeaderOne';


const PortfolioDetails = () => {
  return (
    <>
      <HeaderOne  />
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <main>
            <HeroPortfolioDetailsArea style={true} />
            <PortfolioAboutArea />
            <PortfolioDetailsArea />
          </main>
          <FooterOne style={true} />
        </div>
      </div>
    </>
  );
};

export default PortfolioDetails;