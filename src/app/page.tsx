import HomeOne from '@/components/homes/home';
import Wrapper from '@/layouts/Wrapper';
import React from 'react';


export const metadata = {
  
  description: 'Lucas é um desenvolvedor e designer de Santa Catarina com foco em produtos criativos e de experiências únicas',
  openGraph: {
    type: 'website',
    authors: ['Lucas Rodrigues Correia']
  },
  robots: {
    follow: true,
    index: true
  }
};

const MainHome = () => {
  return (
    <Wrapper>
      <HomeOne />
    </Wrapper>
  );
};

export default MainHome;