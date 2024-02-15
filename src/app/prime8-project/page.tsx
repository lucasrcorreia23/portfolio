
import Prime8project from '@/components/prime8-project';
import Wrapper from '@/layouts/Wrapper';
import React from 'react';


export const metadata = {
  title: "Projeto Prime8",
};


const index = () => {
  return (
    <Wrapper>
      <Prime8project />
    </Wrapper>
  );
};

export default index;