import Error from "@/components/error";
import Wrapper from "@/layouts/Wrapper";

 
 
export const metadata = {
  title: "Erro 404 | | Lucas R. C.",
};
const index = () => {
  return (
    <Wrapper>
      <Error />
    </Wrapper>
  );
};

export default index;