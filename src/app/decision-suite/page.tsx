
import Decisionsuiteproject from '@/components/decision-suite-project';
import Wrapper from '@/layouts/Wrapper';
import React from 'react';


export const metadata = {
  title: "Projeto Decision Suite",
  description: 'Plataforma inteligente para empresas de centralização de dados.',
};



const index = () => {
  return (
    <Wrapper>
      <Decisionsuiteproject />
    </Wrapper>
  );
};

export default index;