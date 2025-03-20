// components/LocationPin.jsx
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';

export default function LocationPin() {
  const pinRef = useRef(null);
  const textInsideRef = useRef(null);
  const textOutsideRef = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".hero-section",
        start: "top top",
        end: "bottom top",
        scrub: 0.5
      }
    });
    
    tl.to(pinRef.current, {
      scale: 0.2,
      y: 350,
      duration: 1
    });
    
    tl.to(textInsideRef.current, {
      y: -20,
      opacity: 0,
      duration: 0.5
    }, 0);
    
    tl.to(textOutsideRef.current, {
      y: -30,
      opacity: 0,
      duration: 0.5
    }, 0);
    
    return () => {
      if (tl.scrollTrigger) {
        tl.scrollTrigger.kill();
      }
    };
  }, []);

  return (
    <>
      <div ref={pinRef} className="absolute z-10 transform-origin-center">
        <svg width="400" height="500" viewBox="0 0 400 500">
          <path 
            d="M200 0C89.5 0 0 89.5 0 200c0 110.5 200 300 200 300s200-189.5 200-300C400 89.5 310.5 0 200 0z" 
            fill="#ff3a3a"
          />
          <circle cx="200" cy="180" r="80" fill="white" />
        </svg>
        
        <div ref={textInsideRef} className="absolute top-1/4 left-0 w-full text-center pointer-events-none">
          <h1 className="text-white text-3xl font-bold">Find Your</h1>
        </div>
      </div>
      
      <div ref={textOutsideRef} className="absolute top-1/3 left-0 w-full text-center mt-24 pointer-events-none">
        <h1 className="text-red-500 text-3xl font-bold">Perfect Location</h1>
      </div>
    </>
  );
}