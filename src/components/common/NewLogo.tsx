interface LogoProps {
  logoWidth?: number;
  logoHeight?: number;
  textSize?: string;
  gap?: string;
  centered?: boolean;
}

const NewLogo = ({ 
  logoWidth = 80, 
  logoHeight = 80, 
  textSize = "text-[32px]",
  gap = "gap-[7px]",
  centered = true
}: LogoProps) => {
  return (
    <div className={`flex flex-row items-center justify-center ${gap} ${centered ? 'fixed inset-0 w-full h-full overflow-hidden' : ''}`}>
        <img 
          src="/logo/logo.png"
          alt="Logo"
          width={logoWidth}
          height={logoHeight}
          className="max-w-37.5"
        />
        <h1 className={`text-[#3D08BA] -ml-1 mt-2 ${textSize} font-medium whitespace-nowrap`}>
          Edamaa<span className={`text-[#F68C29] font-semibold ${textSize}`}>3D</span>
        </h1>
    </div>
  )
}

export default NewLogo