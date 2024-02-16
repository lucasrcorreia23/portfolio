
import ZoomtechProject from '@/components/zoomtech-project';
import Wrapper from '@/layouts/Wrapper';
import React from 'react';


export const metadata = {
  title: "Projeto ZOOMtech",
  description: 'Desenvolvimento de nova identidade visual, website e estratégia de conteúdo omnichannel para uma holding de tecnologia da informação e comunicação'  

};


const index = () => {
  return (
    <Wrapper>
      <ZoomtechProject />
    </Wrapper>
  );
};

export default index;