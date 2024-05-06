'use client'

import Link from 'next/link';

import { useEffect, useState } from 'react';
import { scroller } from 'react-scroll';
import {animatedHeadline} from '@/utils/animatedHeadline';

import HeroArrowIcon from '@/svg/home/HeroIcons/HeroArrowIcon';
import { HeroSocialLinks } from '@/components/common/SocialLinks';


interface DataType {
  slide_text: string[];
  sub_title: string;
  title_1: string;
  words: string[];
  title_2: string;
  sm_info: JSX.Element;
  btn_text: JSX.Element;
}

const hero_content: DataType = {
  slide_text: [
    "Designer",
    "Desenvolvedor",
    "Negócios",
  ],
  sub_title: "Olá!",
  title_1: "Eu sou Lucas",
  words: ["Visual", "Digital", "UI", "UX", "Web","App", "Product"],
  title_2: "designer",
  sm_info: <>Apaixonado pela combinação de design, códigos, negócios & toda a interação entre eles.</>,
  btn_text: <>Meu <br />currículo  </>,

}
const { slide_text, sub_title, title_1, words, title_2, sm_info, btn_text } = hero_content;

// scroll to tp-sv section 
const scrollTo = () => {
  scroller.scrollTo('tp-sv', {
    duration: 800,
    delay: 0,
    smooth: 'easeInOutQuart',
  });
};


const HeroAreaHome = () => {
  const [currentWord, setCurrentWord] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWord((prevWord) => (prevWord + 1) % words.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [words.length]);

  useEffect(() => {
    animatedHeadline()
  },[])

  return (
    <>

      <section className="tp-hero-area p-relative tp-btn-trigger z-index-1 fix theme-bg-2">
        <div className="tp-hero-social-wrapper">
          <span className="tp-hero-social-bar"></span>
          <div className="tp-hero-social">
            <HeroSocialLinks />
          </div>
        </div>
        <div className="tp-hero-shape">
          <div className="tp-hero-shape-1 background-white-mode" style={{ backgroundImage: 'url(/assets/img/hero/hero-overlay.png)' }}></div>
          <div className="tp-hero-shape-1 background-dark-mode" style={{ backgroundImage: 'url(/assets/img/hero/hero-overlay-2.png)' }}></div>
          <span className="tp-hero-shape-2"></span>
        </div>
        <div className="tp-hero-bottom-text-wrapper">
          <div className="tp-hero-bottom-text">
            {slide_text.map((item, index) => (
              <p key={index}>{item}</p>
            ))}
          </div>
          <div className="tp-hero-bottom-text">
            {slide_text.map((item, index) => (
              <p key={index}>{item}</p>
            ))}
          </div>
        </div>
        <div className="container">
          <div className="row align-items-end">
            <div className="col-xl-10 col-lg-10 col-md-12 col-8">
              <div className="tp-hero-left-wrapper">
                <div className="tp-hero-content tp_text_anim p-relative z-index-1">
                  <span className="singleLine">{sub_title} </span>
                  <h3 className="tp-hero-title cd-headline clip tp_title_anim">
                    {title_1} <br />
                    <span className="cd-words-wrapper">
                      {words.map((word, index) => (
                        <b
                          key={index}
                          className={`${index === currentWord ? "is-visible" : "is-hidden"}`}>
                          {word}
                        </b>
                      ))}
                    </span> {' '}
                    {title_2}

                  </h3>
                  <p>{sm_info}</p>
                  <div className="tp-hero-btn wrap">
                    <div className="tp-hover-btn-wrapper tp-btn-bounce">
                      <Link href="assets/img/cv/Curriculo.pdf" target="_blank" className="tp-hover-btn tp-hover-btn-item tp-btn-circle square">
                        <span className="tp-btn-circle-text" >
                          {btn_text}
                        </span>
                        <span className="tp-btn-circle-arrow">
                          <HeroArrowIcon />
                        </span>
                        <i className="tp-btn-circle-dot"></i>
                      </Link>
                    </div>
                  </div>
                  <div className="tp-hero-scroll smooth">
                    <a className="pointer" onClick={scrollTo}>
                      <span className="tp-hero-scroll-bar"></span>
                      <span className="tp-hero-scroll-mouse"></span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-5 col-lg-5 col-md-12">
              <div className="tp-hero-thumb-wrapper text-center text-lg-end p-relative z-index-1">
                <div className="tp-hero-thumb-shape">
                 
                  <span className="tp-hero-thumb-shape-3"></span>
                </div>
                {/*<div className="tp-hero-thumb">
                  <Image src={HeroImage} style={{ height: 'auto' }} alt="diego-image" />
                      </div>*/}
              </div>
            </div>
          </div>
        </div>
      </section>

    </>
  );
};

export default HeroAreaHome;