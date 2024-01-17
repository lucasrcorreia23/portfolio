import InConstruction from "@/components/in-construction";
import Wrapper from "@/layouts/Wrapper";
import React from "react";

 
 
export const metadata = {
  title: "Em construção | | Lucas R. C.",
};
const construction = () => {
  return (
    <Wrapper>
      <InConstruction />
    </Wrapper>
  );
};

export default construction;