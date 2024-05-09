
import React from 'react';
import PortfolioDetailsThreeArea from './PortfolioDetailsThreeArea';
import FooterOne from '@/layouts/footers/FooterOne';
import HeaderOne from '@/layouts/headers/HeaderOne';


const Nestle = () => {
  return (
    <>
      <HeaderOne  />
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <main>
          <PortfolioDetailsThreeArea />
          </main>
          <FooterOne style={true} />
        </div>
      </div>
    </>
  );
};

export default Nestle;