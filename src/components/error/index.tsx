
import React from 'react'; 
import Breadcrumb from './Breadcrumb';
import HeaderOne from '@/layouts/headers/HeaderOne';
import FooterFour from '@/layouts/footers/FooterFour';
import HeroArrowIcon from '@/svg/home/HeroIcons/HeroArrowIcon';
import Link from 'next/link';
import FooterOne from '@/layouts/footers/FooterOne';

const Error = () => {
  return (
    <>
      <HeaderOne />
      <main>
        <Breadcrumb />
        
      </main>
      <FooterOne />
    </>
  );
};

export default Error;