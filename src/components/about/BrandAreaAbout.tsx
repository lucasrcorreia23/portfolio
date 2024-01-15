
import React from 'react';
import Zoomtech from '@/svg/about/zoomtech';
import Ecosintese from '@/svg/about/ecosintese';
import Organiconecta from '@/svg/about/organiconecta';
import Brbassessoria from '@/svg/about/brbassessoria';
import Prime8 from '@/svg/about/prime8';
import Brisapollar from '@/svg/about/brisapollar';


const brand_imgs = [
  {icon: <Zoomtech />, delay: '.1s'}, 
  {icon: <Brbassessoria />, delay: '.4s'}, 
  {icon: <Ecosintese />, delay: '.2s'}, 
  {icon: <Organiconecta />, delay: '.5s'}, 
  {icon: <Prime8 />, delay: '.8s'}, 
  {icon: <Brisapollar />, delay: '.9s'}, 
]

const BrandAreaAbout = () => {
  return (
    <>               
      <div className="ab-brand__area black-bg-3 pb-100 ab-brand__plr">
        <div className="container-fluid">
          <div className="row gx-20 row-cols-xl-6 row-cols-lg-4 row-cols-md-3 row-cols-sm-2">

            {brand_imgs.map((item, index) => (
              <div key={index} className="col-xl mb-20">
                <div className="ab-brand__item wow tpfadeUp" data-wow-duration=".9s" data-wow-delay={item.delay}>
                  <a href="#">
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