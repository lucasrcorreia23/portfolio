
import Prime8project from '@/components/prime8-project';
import Wrapper from '@/layouts/Wrapper';
import React from 'react';


export const metadata = {
  title: "Projeto Prime8",
  description: 'Lançamento uma unidade de negócio independente para distribuição, com marca própria e canal de e-commerce exclusivo.',
};



const index = () => {
  return (
    <Wrapper>
      <Prime8project />
    </Wrapper>
  );
};

export default index;