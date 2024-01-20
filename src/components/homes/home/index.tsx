"use client";
import React from "react";
import HeaderOne from "@/layouts/headers/HeaderOne";
import HeroAreaHome from "./HeroAreaHome";

import ServiceAreaHomeOne from "./ServiceAreaHomeOne";

import AboutAreaHomeOne from "./AboutAreaHomeOne";
import PortfolioAreaHomeOne from "./PortfolioAreaHomeOne";
import SkillAreaHomeOne from "./SkillAreaHomeOne";

import FooterOne from "@/layouts/footers/FooterOne";


const HomeOne = () => {
  return (
    <>
      <HeaderOne />
      <div
        id="smooth-wrapper"
        className="tp-page-wrapper theme-bg"
        style={{ backgroundImage: `url(/assets/img/bg/distort-bg.png)` }}
      >
        <div id="smooth-content">
          <main>
            <HeroAreaHome />
            
            <ServiceAreaHomeOne />
            
            <AboutAreaHomeOne />
            <PortfolioAreaHomeOne />
            <SkillAreaHomeOne />
            
          
           
          </main>
          <FooterOne />
        </div>
      </div>
    </>
  );
};

export default HomeOne;
