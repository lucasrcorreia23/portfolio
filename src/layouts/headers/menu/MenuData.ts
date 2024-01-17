import { StaticImageData } from "next/image";

import demo_img_1 from "@/assets/img/menu/home-1.jpg";
import demo_img_2 from "@/assets/img/menu/home-2.jpg";
import demo_img_3 from "@/assets/img/menu/home-3.jpg";

interface DataType {
  id: number;
  title: string;
  link: string;
  img_dropdown?: boolean;
  has_dropdown?: boolean;
  sub_menus?: {
    link: string;
    title: string;
    btn_title?: string;
    one_page_link?: string | any;
    one_page_title?: string;
    demo_img?: StaticImageData | any;
    mobile_menu?: boolean;
  }[];
}[]
// menu data 
const menu_data: DataType[] = [
  {
    id: 1,
    title: "Home",
    link: "/",
    img_dropdown: false,
    sub_menus: [
      { mobile_menu: false, link: "/", title: "Home 01", demo_img: demo_img_1, },
      { mobile_menu: false, link: "/home-2", title: "Home 02", demo_img: demo_img_2, },
      { mobile_menu: false, link: "/home-3", title: "Home 03", demo_img: demo_img_3, },

      { mobile_menu: true, link: "/", title: "Freelancer"},
      { mobile_menu: true, link: "/home-2", title: "Interface Designer"},
      { mobile_menu: true, link: "/home-3", title: "Web Developer"},
    ],
  },
  
  {
    id: 4,
    title: "Portfólio",
    link: "/portfolio",
    has_dropdown: false,
    sub_menus: [
      { link: "/portfolio", title: "Portfolio" },
      { link: "/portfolio-details", title: "Portfolio Details" },
    ],
  },
  
];
export default menu_data;
