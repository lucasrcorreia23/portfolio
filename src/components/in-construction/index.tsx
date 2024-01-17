
import React from 'react'; 
import Content from './Content';
import HeaderOne from '@/layouts/headers/HeaderOne';
import FooterOne from '@/layouts/footers/FooterOne';

const InConstruction = () => {
  return (
    <>
      <HeaderOne />
      <div id="smooth-wrapper">
        <div id="smooth-content">
      <main >
        <Content />
        
      </main>
      <FooterOne style={true} />
      </div>
      </div>
    </>
  );
};

export default InConstruction;