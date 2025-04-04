import React from 'react';
import Zoomtech from '@/svg/about/zoomtech';
import Ecosintese from '@/svg/about/ecosintese';
import Organiconecta from '@/svg/about/organiconecta';
import Nestle from '@/svg/about/nestle';
import Prime8 from '@/svg/about/prime8';



const brand_imgs = [
  {icon: <Zoomtech />, delay: '.1s'}, 
  {icon: <Nestle />, delay: '.4s'}, 
  {icon: <Ecosintese />, delay: '.2s', link:"https://www.ecosintese.com.br"}, 
  {icon: <Organiconecta />, delay: '.5s'}, 
  {icon: <Prime8 />, delay: '.8s', link:"https://www.prime8.com.br"}, 
  
]

const BrandAreaAbout = () => {
  return (
    <>               
      <div className="ab-brand__area black-bg-3 pb-100 ab-brand__plr">
        <div className="container-fluid">
          <div className="row gx-20 row-cols-xl-5 row-cols-lg-4 row-cols-md-3 row-cols-sm-2">

            {brand_imgs.map((item, index) => (
              <div key={index} className="col-xl mb-20">
                <div className="ab-brand__item wow tpfadeUp" data-wow-duration=".9s" data-wow-delay={item.delay}>
                  <a href={item.link} target="_blank">
                    <span>
                      {item.icon}
                    </span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default BrandAreaAbout;