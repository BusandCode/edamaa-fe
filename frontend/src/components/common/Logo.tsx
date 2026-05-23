interface LogoProps {
  logoWidth?: number;
  logoHeight?: number;
  textSize?: string;
  gap?: string;
  centered?: boolean;
}

const Logo = ({ 
  logoWidth = 147, 
  logoHeight = 176, 
  textSize = "text-[38px]",
  gap = "gap-[2px]",
  centered = true
}: LogoProps) => {
  return (
    <div className={`flex flex-col justify-center items-center ${gap} ${centered ? 'fixed inset-0 w-full h-full overflow-hidden' : ''}`}>
        <img 
          src="/logo/logo.png"
          alt="Logo"
          width={logoWidth}
          height={logoHeight}
          className="max-w-37.5"
        />
        <h1 className={`text-[#3D08BA] -mt-3 ${textSize} font-medium whitespace-nowrap`}>
          Edamaa<span className={`text-[#F68C29] font-semibold ${textSize}`}>3D</span>
        </h1>
    </div>
  )
}

export default Logo