
import ZoomtechProject from '@/components/zoomtech-project';
import Wrapper from '@/layouts/Wrapper';
import React from 'react';


export const metadata = {
  title: "Projeto ZOOMtech",
};


const index = () => {
  return (
    <Wrapper>
      <ZoomtechProject />
    </Wrapper>
  );
};

export default index;