import svgPaths from "./svg-5g74a2yfn5";
import clsx from "clsx";
type ContainerBackgroundImage5Props = {
  additionalClassNames?: string;
};

function ContainerBackgroundImage5({ children, additionalClassNames = "" }: React.PropsWithChildren<ContainerBackgroundImage5Props>) {
  return (
    <div style={{ backgroundImage: "linear-gradient(135deg, rgb(251, 44, 54) 0%, rgb(231, 0, 11) 100%)" }} className={clsx("relative shrink-0", additionalClassNames)}>
      {children}
    </div>
  );
}
type ContainerBackgroundImage4Props = {
  additionalClassNames?: string;
};

function ContainerBackgroundImage4({ children, additionalClassNames = "" }: React.PropsWithChildren<ContainerBackgroundImage4Props>) {
  return (
    <div style={{ backgroundImage: "linear-gradient(135deg, rgb(142, 81, 255) 0%, rgb(127, 34, 254) 100%)" }} className={clsx("absolute content-stretch flex items-center justify-center left-[31.99px] pl-0 pr-[0.012px] py-0 rounded-[16px] size-[63.993px] top-[31.99px]", additionalClassNames)}>
      {children}
    </div>
  );
}
type ContainerBackgroundImage3Props = {
  additionalClassNames?: string;
};

function ContainerBackgroundImage3({ children, additionalClassNames = "" }: React.PropsWithChildren<ContainerBackgroundImage3Props>) {
  return (
    <div style={{ backgroundImage: "linear-gradient(135deg, rgb(0, 201, 80) 0%, rgb(0, 166, 62) 100%)" }} className={clsx("absolute content-stretch flex items-center justify-center left-[31.99px] pl-0 pr-[0.012px] py-0 rounded-[16px] size-[63.993px] top-[31.99px]", additionalClassNames)}>
      {children}
    </div>
  );
}
type ContainerBackgroundImage2Props = {
  additionalClassNames?: string;
};

function ContainerBackgroundImage2({ children, additionalClassNames = "" }: React.PropsWithChildren<ContainerBackgroundImage2Props>) {
  return (
    <div style={{ backgroundImage: "linear-gradient(135deg, rgb(43, 127, 255) 0%, rgb(21, 93, 252) 100%)" }} className={clsx("absolute content-stretch flex items-center justify-center left-[31.99px] pl-0 pr-[0.012px] py-0 rounded-[16px] size-[63.993px] top-[31.99px]", additionalClassNames)}>
      {children}
    </div>
  );
}
type ButtonBackgroundImageProps = {
  additionalClassNames?: string;
};

function ButtonBackgroundImage({ children, additionalClassNames = "" }: React.PropsWithChildren<ButtonBackgroundImageProps>) {
  return (
    <div className={clsx("bg-white h-[41.47px] relative rounded-[10px] shrink-0", additionalClassNames)}>
      <div aria-hidden="true" className="absolute border-[#d1d5dc] border-[0.741px] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">{children}</div>
    </div>
  );
}
type BackgroundImage1Props = {
  additionalClassNames?: string;
};

function BackgroundImage1({ children, additionalClassNames = "" }: React.PropsWithChildren<BackgroundImage1Props>) {
  return (
    <div className={clsx("bg-[#155dfc] relative shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] shrink-0", additionalClassNames)}>
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">{children}</div>
    </div>
  );
}
type IconBackgroundImage4Props = {
  additionalClassNames?: string;
};

function IconBackgroundImage4({ children, additionalClassNames = "" }: React.PropsWithChildren<IconBackgroundImage4Props>) {
  return (
    <div className={clsx("absolute size-[20px]", additionalClassNames)}>
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">{children}</g>
      </svg>
    </div>
  );
}
type ContainerBackgroundImage1Props = {
  additionalClassNames?: string;
};

function ContainerBackgroundImage1({ children, additionalClassNames = "" }: React.PropsWithChildren<ContainerBackgroundImage1Props>) {
  return (
    <div className={clsx("relative shrink-0 w-full", additionalClassNames)}>
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex gap-[23.993px] items-center justify-center pl-0 pr-[0.012px] py-0 relative size-full">{children}</div>
      </div>
    </div>
  );
}

function IconBackgroundImage3({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0 size-[23.993px]">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 23.9931 23.9931">
        <g id="Icon">{children}</g>
      </svg>
    </div>
  );
}

function BackgroundImage({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className="relative shrink-0 size-[31.991px]">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 31.9907 31.9907">
        <g id="Icon">{children}</g>
      </svg>
    </div>
  );
}
type ContainerBackgroundImageAndTextProps = {
  text: string;
};

function ContainerBackgroundImageAndText({ text }: ContainerBackgroundImageAndTextProps) {
  return (
    <div className="absolute h-[47.998px] left-[23.99px] top-[83.98px] w-[123.056px]">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[48px] left-[61.93px] not-italic text-[#155dfc] text-[32px] text-center text-nowrap top-[-2.78px] translate-x-[-50%]">{text}</p>
    </div>
  );
}
type BackgroundImageAndText5Props = {
  text: string;
};

function BackgroundImageAndText5({ text }: BackgroundImageAndText5Props) {
  return (
    <div className="h-[23.993px] relative shrink-0 w-full">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-0 not-italic text-[#4a5565] text-[16px] text-nowrap top-[-1.52px]">{text}</p>
    </div>
  );
}
type BackgroundImageAndText4Props = {
  text: string;
  additionalClassNames?: string;
};

function BackgroundImageAndText4({ text, additionalClassNames = "" }: BackgroundImageAndText4Props) {
  return (
    <div className={clsx("h-[23.993px] relative shrink-0", additionalClassNames)}>
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-0 not-italic text-[#4a5565] text-[16px] text-nowrap top-[-1.52px]">{text}</p>
      </div>
    </div>
  );
}
type BackgroundImageAndText3Props = {
  text: string;
};

function BackgroundImageAndText3({ text }: BackgroundImageAndText3Props) {
  return (
    <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-0 not-italic text-[#364153] text-[16px] text-nowrap top-[-1.52px]">{text}</p>
    </div>
  );
}
type TextBackgroundImageAndTextProps = {
  text: string;
};

function TextBackgroundImageAndText({ text }: TextBackgroundImageAndTextProps) {
  return (
    <div className="basis-0 grow h-[23.993px] min-h-px min-w-px relative shrink-0">
      <BackgroundImageAndText3 text={text} />
    </div>
  );
}

function IconBackgroundImage2() {
  return (
    <BackgroundImage>
      <path d="M13.3295 15.9954H18.6613" id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66589" />
      <path d="M13.3295 10.6636H18.6613" id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66589" />
      <path d={svgPaths.p15f37180} id="Vector_3" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66589" />
      <path d={svgPaths.p1e5dd980} id="Vector_4" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66589" />
      <path d={svgPaths.p8d43700} id="Vector_5" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66589" />
    </BackgroundImage>
  );
}
type ContainerBackgroundImageProps = {
  additionalClassNames?: string;
};

function ContainerBackgroundImage({ additionalClassNames = "" }: ContainerBackgroundImageProps) {
  return (
    <div style={{ backgroundImage: "linear-gradient(135deg, rgb(255, 105, 0) 0%, rgb(245, 73, 0) 100%)" }} className={clsx("absolute content-stretch flex items-center justify-center left-[31.99px] pl-0 py-0 rounded-[16px] size-[63.993px] top-[31.99px]", additionalClassNames)}>
      <IconBackgroundImage1 />
    </div>
  );
}

function IconBackgroundImage1() {
  return (
    <BackgroundImage>
      <path d={svgPaths.p22ac1c80} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66589" />
      <path d="M19.9942 23.9931H11.9965" id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66589" />
      <path d={svgPaths.p16361d80} id="Vector_3" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66589" />
      <path d={svgPaths.p36869980} id="Vector_4" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66589" />
      <path d={svgPaths.p23fa3900} id="Vector_5" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66589" />
    </BackgroundImage>
  );
}
type ButtonBackgroundImageAndTextProps = {
  text: string;
  additionalClassNames?: string;
};

function ButtonBackgroundImageAndText({ text, additionalClassNames = "" }: ButtonBackgroundImageAndTextProps) {
  return (
    <div className={clsx("absolute bg-gradient-to-r h-[47.975px] left-[31.99px] rounded-[14px] w-[172.361px]", additionalClassNames)}>
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-[74.67px] not-italic text-[16px] text-center text-nowrap text-white top-[10.47px] translate-x-[-50%]">{text}</p>
      <IconBackgroundImage additionalClassNames="left-[108.19px]" />
    </div>
  );
}
type IconBackgroundImageProps = {
  additionalClassNames?: string;
};

function IconBackgroundImage({ additionalClassNames = "" }: IconBackgroundImageProps) {
  return (
    <div className={clsx("absolute size-[15.995px] top-[15.98px]", additionalClassNames)}>
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 15.9954 15.9954">
        <g id="Icon">
          <path d="M3.33237 7.99768H12.663" id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33295" />
          <path d={svgPaths.pd9c6760} id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33295" />
        </g>
      </svg>
    </div>
  );
}
type BackgroundImageAndText2Props = {
  text: string;
};

function BackgroundImageAndText2({ text }: BackgroundImageAndText2Props) {
  return (
    <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-0 not-italic text-[#101828] text-[16px] text-nowrap top-[-1.52px]">{text}</p>
    </div>
  );
}
type BackgroundImageAndText1Props = {
  text: string;
};

function BackgroundImageAndText1({ text }: BackgroundImageAndText1Props) {
  return (
    <div className="h-[23.993px] relative shrink-0 w-full">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-0 not-italic text-[#101828] text-[16px] text-nowrap top-[-1.52px]">{text}</p>
    </div>
  );
}
type BackgroundImageAndTextProps = {
  text: string;
  additionalClassNames?: string;
};

function BackgroundImageAndText({ text, additionalClassNames = "" }: BackgroundImageAndTextProps) {
  return (
    <div className={clsx("absolute h-[23.993px] left-[31.99px] top-[119.98px]", additionalClassNames)}>
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-0 not-italic text-[#101828] text-[16px] text-nowrap top-[-1.52px]">{text}</p>
    </div>
  );
}

function Heading1() {
  return (
    <div className="absolute h-[30px] left-0 top-0 w-[1023.264px]" data-name="Heading 2">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[30px] left-[511.28px] not-italic text-[#101828] text-[20px] text-center text-nowrap top-[-2.52px] translate-x-[-50%]">Choose Your Role</p>
    </div>
  );
}

function Paragraph() {
  return (
    <div className="absolute h-[26.991px] left-[175.64px] top-[46px] w-[671.991px]" data-name="Paragraph">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[27px] left-[335.82px] not-italic text-[#4a5565] text-[18px] text-center text-nowrap top-[-1.52px] translate-x-[-50%]">Join our ecosystem and make a difference in healthcare delivery</p>
    </div>
  );
}

function Container() {
  return (
    <div className="h-[72.986px] relative shrink-0 w-full" data-name="Container">
      <Heading1 />
      <Paragraph />
    </div>
  );
}

function Icon() {
  return (
    <BackgroundImage>
      <path d={svgPaths.p3f153100} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66589" />
    </BackgroundImage>
  );
}

function Container1() {
  return (
    <ContainerBackgroundImage2>
      <Icon />
    </ContainerBackgroundImage2>
  );
}

function Paragraph1() {
  return (
    <div className="absolute h-[71.979px] left-[31.99px] top-[155.96px] w-[172.35px]" data-name="Paragraph">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-0 not-italic text-[#4a5565] text-[16px] top-[-1.52px] w-[145px]">Request blood, track delivery, manage transfusions</p>
    </div>
  );
}

function Button() {
  return (
    <div className="absolute bg-gradient-to-r from-[#2b7fff] h-[47.975px] left-[31.99px] rounded-[14px] to-[#155dfc] top-[251.93px] w-[172.35px]" data-name="Button">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-[74.66px] not-italic text-[16px] text-center text-nowrap text-white top-[10.47px] translate-x-[-50%]">Explore</p>
      <IconBackgroundImage additionalClassNames="left-[108.18px]" />
    </div>
  );
}

function Container2() {
  return (
    <div className="absolute bg-white border-[#f3f4f6] border-[0.741px] border-solid h-[333.38px] left-0 rounded-[16px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] top-0 w-[237.812px]" data-name="Container">
      <Container1 />
      <BackgroundImageAndText text="Patient" additionalClassNames="w-[172.35px]" />
      <Paragraph1 />
      <Button />
    </div>
  );
}

function Icon1() {
  return (
    <BackgroundImage>
      <path d={svgPaths.p22abf60} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66589" />
      <path d={svgPaths.p5047900} id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66589" />
      <path d={svgPaths.p18f14800} id="Vector_3" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66589" />
      <path d={svgPaths.p27626800} id="Vector_4" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66589" />
    </BackgroundImage>
  );
}

function Container3() {
  return (
    <ContainerBackgroundImage3>
      <Icon1 />
    </ContainerBackgroundImage3>
  );
}

function Paragraph2() {
  return (
    <div className="absolute h-[47.986px] left-[31.99px] top-[155.96px] w-[172.361px]" data-name="Paragraph">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-0 not-italic text-[#4a5565] text-[16px] top-[-1.52px] w-[170px]">Save lives, earn rewards, track your impact</p>
    </div>
  );
}

function Container4() {
  return (
    <div className="absolute bg-white border-[#f3f4f6] border-[0.741px] border-solid h-[333.38px] left-[261.81px] rounded-[16px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] top-0 w-[237.824px]" data-name="Container">
      <Container3 />
      <BackgroundImageAndText text="Donor" additionalClassNames="w-[172.361px]" />
      <Paragraph2 />
      <ButtonBackgroundImageAndText text="Explore" additionalClassNames="from-[#00c950] to-[#00a63e] top-[227.94px]" />
    </div>
  );
}

function Paragraph3() {
  return (
    <div className="absolute h-[71.979px] left-[31.99px] top-[155.96px] w-[172.361px]" data-name="Paragraph">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-0 not-italic text-[#4a5565] text-[16px] top-[-1.52px] w-[139px]">Ensure safe delivery with cold-chain monitoring</p>
    </div>
  );
}

function Container5() {
  return (
    <div className="absolute bg-white border-[#f3f4f6] border-[0.741px] border-solid h-[333.38px] left-[523.62px] rounded-[16px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] top-0 w-[237.824px]" data-name="Container">
      <ContainerBackgroundImage additionalClassNames="pr-[0.011px]" />
      <BackgroundImageAndText text="Delivery Agent" additionalClassNames="w-[172.361px]" />
      <Paragraph3 />
      <ButtonBackgroundImageAndText text="Explore" additionalClassNames="from-[#ff6900] to-[#f54900] top-[251.93px]" />
    </div>
  );
}

function Container6() {
  return (
    <ContainerBackgroundImage4>
      <IconBackgroundImage2 />
    </ContainerBackgroundImage4>
  );
}

function Paragraph4() {
  return (
    <div className="absolute h-[47.986px] left-[31.99px] top-[155.96px] w-[172.361px]" data-name="Paragraph">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-0 not-italic text-[#4a5565] text-[16px] top-[-1.52px] w-[171px]">Manage inventory, fulfill requests efficiently</p>
    </div>
  );
}

function Container7() {
  return (
    <div className="absolute bg-white border-[#f3f4f6] border-[0.741px] border-solid h-[333.38px] left-[785.44px] rounded-[16px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] top-0 w-[237.824px]" data-name="Container">
      <Container6 />
      <BackgroundImageAndText text="Hospital" additionalClassNames="w-[172.361px]" />
      <Paragraph4 />
      <ButtonBackgroundImageAndText text="Explore" additionalClassNames="from-[#8e51ff] to-[#7f22fe] top-[227.94px]" />
    </div>
  );
}

function Container8() {
  return (
    <div className="h-[333.38px] relative shrink-0 w-full" data-name="Container">
      <Container2 />
      <Container4 />
      <Container5 />
      <Container7 />
    </div>
  );
}

function Section() {
  return (
    <div className="absolute bg-[#f9fafb] content-stretch flex flex-col gap-[63.993px] h-[470.359px] items-start left-0 px-[47.998px] py-0 top-[1672.75px] w-[1119.259px]" data-name="Section">
      <Container />
      <Container8 />
    </div>
  );
}

function Icon2() {
  return (
    <IconBackgroundImage3>
      <path d={svgPaths.p261a3c00} id="Vector" stroke="var(--stroke-0, #155DFC)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.99942" />
      <path d={svgPaths.p1fdd4300} id="Vector_2" stroke="var(--stroke-0, #155DFC)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.99942" />
    </IconBackgroundImage3>
  );
}

function Text() {
  return (
    <div className="h-[23.993px] relative shrink-0 w-[122.743px]" data-name="Text">
      <BackgroundImageAndText3 text="NABH Accredited" />
    </div>
  );
}

function Container9() {
  return (
    <div className="absolute bg-[#f9fafb] content-stretch flex gap-[11.991px] h-[57.465px] items-center left-[173.14px] pl-[24.734px] pr-[0.741px] py-[0.741px] rounded-[14px] top-[63.99px] w-[208.194px]" data-name="Container">
      <div aria-hidden="true" className="absolute border-[#e5e7eb] border-[0.741px] border-solid inset-0 pointer-events-none rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]" />
      <Icon2 />
      <Text />
    </div>
  );
}

function Icon3() {
  return (
    <IconBackgroundImage3>
      <path d={svgPaths.p1ff31b00} id="Vector" stroke="var(--stroke-0, #155DFC)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.99942" />
    </IconBackgroundImage3>
  );
}

function Container10() {
  return (
    <div className="absolute bg-[#f9fafb] content-stretch flex gap-[11.991px] h-[57.465px] items-center left-[429.33px] px-[24.734px] py-[0.741px] rounded-[14px] top-[63.99px] w-[248.553px]" data-name="Container">
      <div aria-hidden="true" className="absolute border-[#e5e7eb] border-[0.741px] border-solid inset-0 pointer-events-none rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]" />
      <Icon3 />
      <TextBackgroundImageAndText text="Blood Safety Standards" />
    </div>
  );
}

function Icon4() {
  return (
    <IconBackgroundImage3>
      <path d={svgPaths.p31bc7700} id="Vector" stroke="var(--stroke-0, #155DFC)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.99942" />
    </IconBackgroundImage3>
  );
}

function Text1() {
  return (
    <div className="h-[23.993px] relative shrink-0 w-[134.78px]" data-name="Text">
      <BackgroundImageAndText3 text="Cold Chain Verified" />
    </div>
  );
}

function Container11() {
  return (
    <div className="absolute bg-[#f9fafb] content-stretch flex gap-[11.991px] h-[57.465px] items-center left-[725.88px] pl-[24.734px] pr-[0.741px] py-[0.741px] rounded-[14px] top-[63.99px] w-[220.231px]" data-name="Container">
      <div aria-hidden="true" className="absolute border-[#e5e7eb] border-[0.741px] border-solid inset-0 pointer-events-none rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]" />
      <Icon4 />
      <Text1 />
    </div>
  );
}

function Icon5() {
  return (
    <IconBackgroundImage3>
      <path d={svgPaths.p13350f80} id="Vector" stroke="var(--stroke-0, #155DFC)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.99942" />
      <path d={svgPaths.pcd6c100} id="Vector_2" stroke="var(--stroke-0, #155DFC)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.99942" />
    </IconBackgroundImage3>
  );
}

function Container12() {
  return (
    <div className="absolute bg-[#f9fafb] content-stretch flex gap-[11.991px] h-[57.465px] items-center left-[434.97px] px-[24.734px] py-[0.741px] rounded-[14px] top-[169.46px] w-[249.317px]" data-name="Container">
      <div aria-hidden="true" className="absolute border-[#e5e7eb] border-[0.741px] border-solid inset-0 pointer-events-none rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]" />
      <Icon5 />
      <TextBackgroundImageAndText text="Data Privacy Compliant" />
    </div>
  );
}

function Section1() {
  return (
    <div className="absolute bg-white h-[290.914px] left-0 top-[2793.51px] w-[1119.259px]" data-name="Section">
      <Container9 />
      <Container10 />
      <Container11 />
      <Container12 />
    </div>
  );
}

function Button1() {
  return (
    <BackgroundImage1 additionalClassNames="h-[39.988px] rounded-[10px] w-[127.025px]">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-[63.99px] not-italic text-[16px] text-center text-nowrap text-white top-[6.48px] translate-x-[-50%]">Clean Light</p>
    </BackgroundImage1>
  );
}

function Button2() {
  return (
    <ButtonBackgroundImage additionalClassNames="w-[157.836px]">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-[79.23px] not-italic text-[#364153] text-[16px] text-center text-nowrap top-[7.22px] translate-x-[-50%]">Soft Healthcare</p>
    </ButtonBackgroundImage>
  );
}

function Button3() {
  return (
    <ButtonBackgroundImage additionalClassNames="w-[148.056px]">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-[74.23px] not-italic text-[#364153] text-[16px] text-center text-nowrap top-[7.22px] translate-x-[-50%]">Warm Neutral</p>
    </ButtonBackgroundImage>
  );
}

function Container13() {
  return (
    <ContainerBackgroundImage1 additionalClassNames="h-[41.47px]">
      <BackgroundImageAndText4 text="Visual Theme:" additionalClassNames="w-[97.477px]" />
      <Button1 />
      <Button2 />
      <Button3 />
    </ContainerBackgroundImage1>
  );
}

function Section2() {
  return (
    <div className="absolute bg-[#f3f4f6] content-stretch flex flex-col h-[106.192px] items-start left-0 pb-0 pt-[32.731px] px-[47.998px] top-[3084.42px] w-[1119.259px]" data-name="Section">
      <div aria-hidden="true" className="absolute border-[#e5e7eb] border-[0.741px_0px_0px] border-solid inset-0 pointer-events-none" />
      <Container13 />
    </div>
  );
}

function Icon6() {
  return (
    <IconBackgroundImage3>
      <path d={svgPaths.p3234a400} fill="var(--fill-0, white)" id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.99942" />
    </IconBackgroundImage3>
  );
}

function Container14() {
  return (
    <ContainerBackgroundImage5 additionalClassNames="rounded-[10px] size-[40px]">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center pl-0 pr-[0.012px] py-0 relative size-full">
        <Icon6 />
      </div>
    </ContainerBackgroundImage5>
  );
}

function Text2() {
  return (
    <div className="h-[23.993px] relative shrink-0 w-[89.248px]" data-name="Text">
      <BackgroundImageAndText2 text="HAEMOLINK" />
    </div>
  );
}

function Container15() {
  return (
    <div className="content-stretch flex gap-[11.991px] h-[40px] items-center relative shrink-0 w-full" data-name="Container">
      <Container14 />
      <Text2 />
    </div>
  );
}

function Paragraph5() {
  return (
    <div className="h-[47.986px] relative shrink-0 w-full" data-name="Paragraph">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-0 not-italic text-[#4a5565] text-[16px] top-[-1.52px] w-[227px]">Saving lives through technology and compassion.</p>
    </div>
  );
}

function Container16() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[15.995px] h-[127.963px] items-start left-0 top-0 w-[231.817px]" data-name="Container">
      <Container15 />
      <Paragraph5 />
    </div>
  );
}

function Container17() {
  return (
    <div className="content-stretch flex flex-col gap-[7.998px] h-[87.975px] items-start relative shrink-0 w-full" data-name="Container">
      <BackgroundImageAndText5 text="About Us" />
      <BackgroundImageAndText5 text="How It Works" />
      <BackgroundImageAndText5 text="Roles" />
    </div>
  );
}

function Container18() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[15.995px] h-[127.963px] items-start left-[263.81px] top-0 w-[231.829px]" data-name="Container">
      <BackgroundImageAndText1 text="Quick Links" />
      <Container17 />
    </div>
  );
}

function Container19() {
  return (
    <div className="content-stretch flex flex-col gap-[7.998px] h-[87.975px] items-start relative shrink-0 w-full" data-name="Container">
      <BackgroundImageAndText5 text="Privacy Policy" />
      <BackgroundImageAndText5 text="Terms of Service" />
      <BackgroundImageAndText5 text="Compliance" />
    </div>
  );
}

function Container20() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[15.995px] h-[127.963px] items-start left-[527.63px] top-0 w-[231.817px]" data-name="Container">
      <BackgroundImageAndText1 text="Legal" />
      <Container19 />
    </div>
  );
}

function Container21() {
  return (
    <div className="content-stretch flex flex-col gap-[7.998px] h-[87.975px] items-start relative shrink-0 w-full" data-name="Container">
      <BackgroundImageAndText5 text="support@bloodbank.eco" />
      <BackgroundImageAndText5 text="1-800-BLOOD-HELP" />
      <BackgroundImageAndText5 text="24/7 Emergency Support" />
    </div>
  );
}

function Container22() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[15.995px] h-[127.963px] items-start left-[791.44px] top-0 w-[231.829px]" data-name="Container">
      <BackgroundImageAndText1 text="Contact" />
      <Container21 />
    </div>
  );
}

function Container23() {
  return (
    <div className="h-[127.963px] relative shrink-0 w-full" data-name="Container">
      <Container16 />
      <Container18 />
      <Container20 />
      <Container22 />
    </div>
  );
}

function Container24() {
  return (
    <div className="h-[23.993px] relative shrink-0 w-[206.516px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[15.995px] items-center relative size-full">
        <BackgroundImageAndText4 text="Twitter" additionalClassNames="w-[47.72px]" />
        <BackgroundImageAndText4 text="LinkedIn" additionalClassNames="w-[59.525px]" />
        <BackgroundImageAndText4 text="Facebook" additionalClassNames="w-[67.28px]" />
      </div>
    </div>
  );
}

function Container25() {
  return (
    <div className="content-stretch flex h-[56.725px] items-center justify-between pb-0 pt-[0.741px] px-0 relative shrink-0 w-full" data-name="Container">
      <div aria-hidden="true" className="absolute border-[#e5e7eb] border-[0.741px_0px_0px] border-solid inset-0 pointer-events-none" />
      <BackgroundImageAndText4 text="© 2024 HAEMOLINK. All rights reserved." additionalClassNames="w-[285.139px]" />
      <Container24 />
    </div>
  );
}

function Container26() {
  return (
    <div className="h-[216.678px] relative shrink-0 w-full" data-name="Container">
      <div className="content-stretch flex flex-col gap-[31.991px] items-start px-[47.998px] py-0 relative size-full">
        <Container23 />
        <Container25 />
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div className="absolute bg-[#f9fafb] content-stretch flex flex-col h-[313.414px] items-start left-0 pb-0 pt-[48.739px] px-0 top-[3190.61px] w-[1119.259px]" data-name="Footer">
      <div aria-hidden="true" className="absolute border-[#e5e7eb] border-[0.741px_0px_0px] border-solid inset-0 pointer-events-none" />
      <Container26 />
    </div>
  );
}

function Container27() {
  return <div className="absolute bg-[#bedbff] blur-3xl filter left-[-80px] rounded-[2.48551e+07px] size-[383.993px] top-[80px]" data-name="Container" />;
}

function Container28() {
  return <div className="absolute bg-[#ddd6ff] blur-3xl filter left-[815.27px] rounded-[2.48551e+07px] size-[383.993px] top-[390.67px]" data-name="Container" />;
}

function Container29() {
  return (
    <div className="absolute h-[854.664px] left-0 opacity-30 overflow-clip top-0 w-[1119.259px]" data-name="Container">
      <Container27 />
      <Container28 />
    </div>
  );
}

function Heading() {
  return (
    <div className="font-['Arial:Regular',sans-serif] h-[140.81px] leading-[70.4px] not-italic relative shrink-0 text-[#101828] text-[64px] text-center text-nowrap w-full" data-name="Heading 1">
      <p className="absolute left-[384.28px] top-[-5.41px] translate-x-[-50%]">When Every Drop Matters,</p>
      <p className="absolute left-[384.77px] top-[65px] translate-x-[-50%]">We Deliver Hope.</p>
    </div>
  );
}

function Paragraph6() {
  return (
    <div className="h-[60px] relative shrink-0 w-full" data-name="Paragraph">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[30px] left-[384.3px] not-italic text-[#4a5565] text-[20px] text-center top-[-2.52px] translate-x-[-50%] w-[714px]">A real-time digital ecosystem connecting patients, donors, hospitals, and delivery agents — saving lives faster.</p>
    </div>
  );
}

function Icon7() {
  return (
    <IconBackgroundImage4 additionalClassNames="left-[120.69px] top-[17.99px]">
      <path d="M4.16667 10H15.8333" id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
      <path d={svgPaths.p1ae0b780} id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
    </IconBackgroundImage4>
  );
}

function Button4() {
  return (
    <div className="bg-gradient-to-r from-[#fb2c36] h-[55.984px] relative rounded-[14px] shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)] shrink-0 to-[#e7000b] w-[180.694px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-[74px] not-italic text-[16px] text-center text-nowrap text-white top-[14.48px] translate-x-[-50%]">{`Let's Start`}</p>
        <Icon7 />
      </div>
    </div>
  );
}

function Icon8() {
  return (
    <IconBackgroundImage4 additionalClassNames="left-[41.48px] top-[19.47px]">
      <path d={svgPaths.p216b000} id="Vector" stroke="var(--stroke-0, #364153)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
    </IconBackgroundImage4>
  );
}

function Button5() {
  return (
    <div className="bg-white h-[58.947px] relative rounded-[14px] shrink-0 w-[258.414px]" data-name="Button">
      <div aria-hidden="true" className="absolute border-[#e5e7eb] border-[1.481px] border-solid inset-0 pointer-events-none rounded-[14px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <Icon8 />
        <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-[145.97px] not-italic text-[#364153] text-[16px] text-center text-nowrap top-[15.96px] translate-x-[-50%]">Watch How It Works</p>
      </div>
    </div>
  );
}

function Container30() {
  return (
    <ContainerBackgroundImage1 additionalClassNames="h-[58.947px]">
      <Button4 />
      <Button5 />
    </ContainerBackgroundImage1>
  );
}

function Container31() {
  return (
    <div className="content-stretch flex flex-col gap-[23.993px] h-[331.748px] items-start relative shrink-0 w-full" data-name="Container">
      <Heading />
      <Paragraph6 />
      <Container30 />
    </div>
  );
}

function Icon9() {
  return (
    <IconBackgroundImage3>
      <path d={svgPaths.pf07a500} id="Vector" stroke="var(--stroke-0, #E7000B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.99942" />
    </IconBackgroundImage3>
  );
}

function Container32() {
  return (
    <div className="absolute bg-[#ffe2e2] content-stretch flex items-center justify-center left-[61.52px] rounded-[14px] size-[47.998px] top-[23.99px]" data-name="Container">
      <Icon9 />
    </div>
  );
}

function Paragraph7() {
  return (
    <div className="absolute h-[23.993px] left-[23.99px] top-[135.97px] w-[123.056px]" data-name="Paragraph">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-[61.17px] not-italic text-[#364153] text-[16px] text-center text-nowrap top-[-1.52px] translate-x-[-50%]">Lives Saved</p>
    </div>
  );
}

function Container33() {
  return (
    <div className="absolute bg-white border-[#dbeafe] border-[1.481px] border-solid h-[186.921px] left-0 rounded-[16px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] top-0 w-[174.005px]" data-name="Container">
      <Container32 />
      <ContainerBackgroundImageAndText text="12,847" />
      <Paragraph7 />
    </div>
  );
}

function Icon10() {
  return (
    <IconBackgroundImage3>
      <path d={svgPaths.p2b628800} id="Vector" stroke="var(--stroke-0, #00A63E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.99942" />
      <path d={svgPaths.pe990200} id="Vector_2" stroke="var(--stroke-0, #00A63E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.99942" />
      <path d={svgPaths.p17fd22c0} id="Vector_3" stroke="var(--stroke-0, #00A63E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.99942" />
      <path d={svgPaths.p8530a00} id="Vector_4" stroke="var(--stroke-0, #00A63E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.99942" />
    </IconBackgroundImage3>
  );
}

function Container34() {
  return (
    <div className="absolute bg-[#dcfce7] content-stretch flex items-center justify-center left-[61.52px] rounded-[14px] size-[47.998px] top-[23.99px]" data-name="Container">
      <Icon10 />
    </div>
  );
}

function Paragraph8() {
  return (
    <div className="absolute h-[23.993px] left-[23.99px] top-[135.97px] w-[123.056px]" data-name="Paragraph">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-[61.12px] not-italic text-[#364153] text-[16px] text-center text-nowrap top-[-1.52px] translate-x-[-50%]">Active Donors</p>
    </div>
  );
}

function Container35() {
  return (
    <div className="absolute bg-white border-[#dbeafe] border-[1.481px] border-solid h-[186.921px] left-[198px] rounded-[16px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] top-0 w-[174.005px]" data-name="Container">
      <Container34 />
      <ContainerBackgroundImageAndText text="45,392" />
      <Paragraph8 />
    </div>
  );
}

function Icon11() {
  return (
    <IconBackgroundImage3>
      <path d="M9.99711 11.9965H13.9959" id="Vector" stroke="var(--stroke-0, #7F22FE)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.99942" />
      <path d="M9.99711 7.99768H13.9959" id="Vector_2" stroke="var(--stroke-0, #7F22FE)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.99942" />
      <path d={svgPaths.p1f91d400} id="Vector_3" stroke="var(--stroke-0, #7F22FE)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.99942" />
      <path d={svgPaths.p1942c940} id="Vector_4" stroke="var(--stroke-0, #7F22FE)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.99942" />
      <path d={svgPaths.p9015380} id="Vector_5" stroke="var(--stroke-0, #7F22FE)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.99942" />
    </IconBackgroundImage3>
  );
}

function Container36() {
  return (
    <div className="absolute bg-[#ede9fe] content-stretch flex items-center justify-center left-[61.52px] rounded-[14px] size-[47.998px] top-[23.99px]" data-name="Container">
      <Icon11 />
    </div>
  );
}

function Container37() {
  return (
    <div className="absolute h-[47.998px] left-[23.99px] top-[83.98px] w-[123.056px]" data-name="Container">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[48px] left-[61.65px] not-italic text-[#155dfc] text-[32px] text-center text-nowrap top-[-2.78px] translate-x-[-50%]">328</p>
    </div>
  );
}

function Paragraph9() {
  return (
    <div className="absolute h-[23.993px] left-[23.99px] top-[135.97px] w-[123.056px]" data-name="Paragraph">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-[62px] not-italic text-[#364153] text-[16px] text-center text-nowrap top-[-1.52px] translate-x-[-50%]">Hospitals</p>
    </div>
  );
}

function Container38() {
  return (
    <div className="absolute bg-white border-[#dbeafe] border-[1.481px] border-solid h-[186.921px] left-[396px] rounded-[16px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] top-0 w-[174.005px]" data-name="Container">
      <Container36 />
      <Container37 />
      <Paragraph9 />
    </div>
  );
}

function Icon12() {
  return (
    <IconBackgroundImage3>
      <path d={svgPaths.p2e4d4800} id="Vector" stroke="var(--stroke-0, #155DFC)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.99942" />
      <path d={svgPaths.p19aa3100} id="Vector_2" stroke="var(--stroke-0, #155DFC)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.99942" />
    </IconBackgroundImage3>
  );
}

function Container39() {
  return (
    <div className="absolute bg-[#dbeafe] content-stretch flex items-center justify-center left-[61.52px] rounded-[14px] size-[47.998px] top-[23.99px]" data-name="Container">
      <Icon12 />
    </div>
  );
}

function Container40() {
  return (
    <div className="absolute h-[47.998px] left-[23.99px] top-[83.98px] w-[123.056px]" data-name="Container">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[48px] left-[61.59px] not-italic text-[#155dfc] text-[32px] text-center text-nowrap top-[-2.78px] translate-x-[-50%]">94.7%</p>
    </div>
  );
}

function Paragraph10() {
  return (
    <div className="absolute h-[23.993px] left-[23.99px] top-[135.97px] w-[123.056px]" data-name="Paragraph">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-[61.94px] not-italic text-[#364153] text-[16px] text-center text-nowrap top-[-1.52px] translate-x-[-50%]">Success Rate</p>
    </div>
  );
}

function Container41() {
  return (
    <div className="absolute bg-white border-[#dbeafe] border-[1.481px] border-solid h-[186.921px] left-[593.99px] rounded-[16px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] top-0 w-[174.005px]" data-name="Container">
      <Container39 />
      <Container40 />
      <Paragraph10 />
    </div>
  );
}

function Container42() {
  return (
    <div className="h-[186.921px] relative shrink-0 w-full" data-name="Container">
      <Container33 />
      <Container35 />
      <Container38 />
      <Container41 />
    </div>
  );
}

function Container43() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[80px] h-[854.664px] items-start left-[127.63px] pb-0 pt-[127.998px] px-[47.998px] top-0 w-[863.993px]" data-name="Container">
      <Container31 />
      <Container42 />
    </div>
  );
}

function Section3() {
  return (
    <div className="absolute h-[854.664px] left-0 top-[80.73px] w-[1119.259px]" data-name="Section" style={{ backgroundImage: "linear-gradient(142.635deg, rgb(255, 255, 255) 0%, rgb(239, 246, 255) 50%, rgb(239, 246, 255) 100%)" }}>
      <Container29 />
      <Container43 />
    </div>
  );
}

function Heading2() {
  return (
    <div className="absolute h-[30px] left-0 top-0 w-[1023.264px]" data-name="Heading 2">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[30px] left-[512.57px] not-italic text-[#101828] text-[20px] text-center text-nowrap top-[-2.52px] translate-x-[-50%]">How It Works</p>
    </div>
  );
}

function Paragraph11() {
  return (
    <div className="absolute h-[53.981px] left-[175.64px] top-[46px] w-[671.991px]" data-name="Paragraph">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[27px] left-[336.17px] not-italic text-[#4a5565] text-[18px] text-center top-[-1.52px] translate-x-[-50%] w-[646px]">Our intelligent system connects every stakeholder in real-time for seamless blood delivery</p>
    </div>
  );
}

function Container44() {
  return (
    <div className="h-[99.977px] relative shrink-0 w-full" data-name="Container">
      <Heading2 />
      <Paragraph11 />
    </div>
  );
}

function Container45() {
  return <div className="absolute bg-gradient-to-r from-[#bedbff] h-[1.991px] left-0 to-[#bedbff] top-[94.13px] via-1/2 w-[1023.264px]" data-name="Container" />;
}

function Paragraph12() {
  return (
    <div className="absolute h-[95.972px] left-[31.99px] top-[155.96px] w-[166.354px]" data-name="Paragraph">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-0 not-italic text-[#4a5565] text-[16px] top-[-1.52px] w-[144px]">Emergency or scheduled blood request with specific requirements</p>
    </div>
  );
}

function Icon13() {
  return (
    <BackgroundImage>
      <path d={svgPaths.p1ec1df00} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66589" />
    </BackgroundImage>
  );
}

function Container46() {
  return (
    <ContainerBackgroundImage2 additionalClassNames="shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]">
      <Icon13 />
    </ContainerBackgroundImage2>
  );
}

function Container47() {
  return (
    <div className="absolute bg-white border-[#f3f4f6] border-[0.741px] border-solid h-[285.405px] left-0 rounded-[16px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] top-0 w-[231.817px]" data-name="Container">
      <BackgroundImageAndText text="Patient raises request" additionalClassNames="w-[166.354px]" />
      <Paragraph12 />
      <Container46 />
    </div>
  );
}

function Paragraph13() {
  return (
    <div className="absolute h-[71.979px] left-[31.99px] top-[155.96px] w-[166.366px]" data-name="Paragraph">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-0 not-italic text-[#4a5565] text-[16px] top-[-1.52px] w-[159px]">Smart matching based on location, freshness, and availability</p>
    </div>
  );
}

function Icon14() {
  return (
    <BackgroundImage>
      <path d={svgPaths.p14cd7d40} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66589" />
      <path d={svgPaths.p49e74f0} id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66589" />
    </BackgroundImage>
  );
}

function Container48() {
  return (
    <ContainerBackgroundImage4 additionalClassNames="shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]">
      <Icon14 />
    </ContainerBackgroundImage4>
  );
}

function Container49() {
  return (
    <div className="absolute bg-white border-[#f3f4f6] border-[0.741px] border-solid h-[261.412px] left-[263.81px] rounded-[16px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] top-0 w-[231.829px]" data-name="Container">
      <BackgroundImageAndText text="AI finds nearest blood" additionalClassNames="w-[166.366px]" />
      <Paragraph13 />
      <Container48 />
    </div>
  );
}

function Paragraph14() {
  return (
    <div className="absolute h-[71.979px] left-[31.99px] top-[155.96px] w-[166.354px]" data-name="Paragraph">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-0 not-italic text-[#4a5565] text-[16px] top-[-1.52px] w-[152px]">Quality checks and cold-chain packaging for safe transport</p>
    </div>
  );
}

function Container50() {
  return (
    <ContainerBackgroundImage3 additionalClassNames="shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]">
      <IconBackgroundImage2 />
    </ContainerBackgroundImage3>
  );
}

function Container51() {
  return (
    <div className="absolute bg-white border-[#f3f4f6] border-[0.741px] border-solid h-[261.412px] left-[527.63px] rounded-[16px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] top-0 w-[231.817px]" data-name="Container">
      <BackgroundImageAndText text="Hospital prepares" additionalClassNames="w-[166.354px]" />
      <Paragraph14 />
      <Container50 />
    </div>
  );
}

function Paragraph15() {
  return (
    <div className="absolute h-[71.979px] left-[31.99px] top-[155.96px] w-[166.366px]" data-name="Paragraph">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-0 not-italic text-[#4a5565] text-[16px] top-[-1.52px] w-[160px]">Real-time tracking and temperature monitoring</p>
    </div>
  );
}

function Container52() {
  return (
    <div className="absolute bg-white border-[#f3f4f6] border-[0.741px] border-solid h-[261.412px] left-[791.44px] rounded-[16px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] top-0 w-[231.829px]" data-name="Container">
      <BackgroundImageAndText text="Safe delivery" additionalClassNames="w-[166.366px]" />
      <Paragraph15 />
      <ContainerBackgroundImage additionalClassNames="pr-[0.012px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]" />
    </div>
  );
}

function Container53() {
  return (
    <div className="h-[285.405px] relative shrink-0 w-full" data-name="Container">
      <Container45 />
      <Container47 />
      <Container49 />
      <Container51 />
      <Container52 />
    </div>
  );
}

function Container54() {
  return (
    <div className="h-[449.375px] relative shrink-0 w-full" data-name="Container">
      <div className="content-stretch flex flex-col gap-[63.993px] items-start px-[47.998px] py-0 relative size-full">
        <Container44 />
        <Container53 />
      </div>
    </div>
  );
}

function Section4() {
  return (
    <div className="absolute bg-white content-stretch flex flex-col h-[641.366px] items-start left-0 overflow-clip pb-0 pt-[95.995px] px-0 top-[935.39px] w-[1119.259px]" data-name="Section">
      <Container54 />
    </div>
  );
}

function Container55() {
  return <div className="absolute bg-[#8ec5ff] blur-3xl filter left-[80px] rounded-[2.48551e+07px] size-[287.998px] top-[80px]" data-name="Container" />;
}

function Container56() {
  return <div className="absolute bg-[#c4b4ff] blur-3xl filter left-[655.27px] rounded-[2.48551e+07px] size-[383.993px] top-[90.41px]" data-name="Container" />;
}

function Container57() {
  return (
    <div className="absolute h-[554.398px] left-0 opacity-20 overflow-clip top-0 w-[1119.259px]" data-name="Container">
      <Container55 />
      <Container56 />
    </div>
  );
}

function Heading3() {
  return (
    <div className="absolute h-[30px] left-0 top-0 w-[1023.264px]" data-name="Heading 2">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[30px] left-[512.07px] not-italic text-[#101828] text-[20px] text-center text-nowrap top-[-2.52px] translate-x-[-50%]">Our Impact</p>
    </div>
  );
}

function Paragraph16() {
  return (
    <div className="absolute h-[26.991px] left-[175.64px] top-[46px] w-[671.991px]" data-name="Paragraph">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[27px] left-[336.08px] not-italic text-[#4a5565] text-[18px] text-center text-nowrap top-[-1.52px] translate-x-[-50%]">Real numbers, real lives saved every single day</p>
    </div>
  );
}

function Container58() {
  return (
    <div className="h-[72.986px] relative shrink-0 w-full" data-name="Container">
      <Heading3 />
      <Paragraph16 />
    </div>
  );
}

function Container59() {
  return (
    <div className="h-[71.991px] relative shrink-0 w-full" data-name="Container">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[72px] left-[83.78px] not-italic text-[#155dfc] text-[48px] text-center text-nowrap top-[-5.3px] translate-x-[-50%]">12,847</p>
    </div>
  );
}

function Paragraph17() {
  return (
    <div className="h-[23.993px] relative shrink-0 w-full" data-name="Paragraph">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-[82.82px] not-italic text-[#101828] text-[16px] text-center text-nowrap top-[-1.52px] translate-x-[-50%]">Lives Saved</p>
    </div>
  );
}

function Paragraph18() {
  return (
    <div className="h-[23.993px] relative shrink-0 w-full" data-name="Paragraph">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-[83.97px] not-italic text-[#4a5565] text-[16px] text-center text-nowrap top-[-1.52px] translate-x-[-50%]">+423 this month</p>
    </div>
  );
}

function Container60() {
  return (
    <div className="absolute bg-white content-stretch flex flex-col gap-[7.998px] h-[225.428px] items-start left-0 pb-[0.741px] pt-[32.731px] px-[32.731px] rounded-[16px] top-0 w-[231.817px]" data-name="Container">
      <div aria-hidden="true" className="absolute border-[#e5e7eb] border-[0.741px] border-solid inset-0 pointer-events-none rounded-[16px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]" />
      <Container59 />
      <Paragraph17 />
      <Paragraph18 />
    </div>
  );
}

function Container61() {
  return (
    <div className="h-[71.991px] relative shrink-0 w-full" data-name="Container">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[72px] left-[83.79px] not-italic text-[#155dfc] text-[48px] text-center text-nowrap top-[-5.3px] translate-x-[-50%]">45,392</p>
    </div>
  );
}

function Paragraph19() {
  return (
    <div className="h-[23.993px] relative shrink-0 w-full" data-name="Paragraph">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-[82.77px] not-italic text-[#101828] text-[16px] text-center text-nowrap top-[-1.52px] translate-x-[-50%]">Active Donors</p>
    </div>
  );
}

function Paragraph20() {
  return (
    <div className="h-[23.993px] relative shrink-0 w-full" data-name="Paragraph">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-[83.07px] not-italic text-[#4a5565] text-[16px] text-center text-nowrap top-[-1.52px] translate-x-[-50%]">+1.2k this month</p>
    </div>
  );
}

function Container62() {
  return (
    <div className="absolute bg-white content-stretch flex flex-col gap-[7.998px] h-[225.428px] items-start left-[263.81px] pb-[0.741px] pt-[32.731px] px-[32.731px] rounded-[16px] top-0 w-[231.829px]" data-name="Container">
      <div aria-hidden="true" className="absolute border-[#e5e7eb] border-[0.741px] border-solid inset-0 pointer-events-none rounded-[16px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]" />
      <Container61 />
      <Paragraph19 />
      <Paragraph20 />
    </div>
  );
}

function Container63() {
  return (
    <div className="h-[71.991px] relative shrink-0 w-full" data-name="Container">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[72px] left-[83.86px] not-italic text-[#155dfc] text-[48px] text-center text-nowrap top-[-5.3px] translate-x-[-50%]">328</p>
    </div>
  );
}

function Paragraph21() {
  return (
    <div className="h-[23.993px] relative shrink-0 w-full" data-name="Paragraph">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-[83.29px] not-italic text-[#101828] text-[16px] text-center text-nowrap top-[-1.52px] translate-x-[-50%]">Hospitals Connected</p>
    </div>
  );
}

function Paragraph22() {
  return (
    <div className="h-[23.993px] relative shrink-0 w-full" data-name="Paragraph">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-[82.77px] not-italic text-[#4a5565] text-[16px] text-center text-nowrap top-[-1.52px] translate-x-[-50%]">+12 this month</p>
    </div>
  );
}

function Container64() {
  return (
    <div className="absolute bg-white content-stretch flex flex-col gap-[7.998px] h-[225.428px] items-start left-[527.63px] pb-[0.741px] pl-[32.731px] pr-[32.732px] pt-[32.731px] rounded-[16px] top-0 w-[231.817px]" data-name="Container">
      <div aria-hidden="true" className="absolute border-[#e5e7eb] border-[0.741px] border-solid inset-0 pointer-events-none rounded-[16px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]" />
      <Container63 />
      <Paragraph21 />
      <Paragraph22 />
    </div>
  );
}

function Container65() {
  return (
    <div className="h-[71.991px] relative shrink-0 w-full" data-name="Container">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[72px] left-[84.03px] not-italic text-[#155dfc] text-[48px] text-center text-nowrap top-[-5.3px] translate-x-[-50%]">94.7%</p>
    </div>
  );
}

function Paragraph23() {
  return (
    <div className="h-[47.986px] relative shrink-0 w-full" data-name="Paragraph">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-[83.45px] not-italic text-[#101828] text-[16px] text-center top-[-1.52px] translate-x-[-50%] w-[137px]">Emergency Success Rate</p>
    </div>
  );
}

function Paragraph24() {
  return (
    <div className="h-[23.993px] relative shrink-0 w-full" data-name="Paragraph">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-[83.44px] not-italic text-[#4a5565] text-[16px] text-center text-nowrap top-[-1.52px] translate-x-[-50%]">+2.3% this year</p>
    </div>
  );
}

function Container66() {
  return (
    <div className="absolute bg-white content-stretch flex flex-col gap-[7.998px] h-[225.428px] items-start left-[791.44px] pb-[0.741px] pl-[32.731px] pr-[32.732px] pt-[32.731px] rounded-[16px] top-0 w-[231.829px]" data-name="Container">
      <div aria-hidden="true" className="absolute border-[#e5e7eb] border-[0.741px] border-solid inset-0 pointer-events-none rounded-[16px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]" />
      <Container65 />
      <Paragraph23 />
      <Paragraph24 />
    </div>
  );
}

function Container67() {
  return (
    <div className="h-[225.428px] relative shrink-0 w-full" data-name="Container">
      <Container60 />
      <Container62 />
      <Container64 />
      <Container66 />
    </div>
  );
}

function Container68() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[63.993px] h-[362.407px] items-start left-0 px-[47.998px] py-0 top-[96px] w-[1119.259px]" data-name="Container">
      <Container58 />
      <Container67 />
    </div>
  );
}

function Section5() {
  return (
    <div className="absolute h-[554.398px] left-0 overflow-clip top-[2239.11px] w-[1119.259px]" data-name="Section" style={{ backgroundImage: "linear-gradient(153.65deg, rgb(239, 246, 255) 0%, rgb(245, 243, 255) 50%, rgb(239, 246, 255) 100%)" }}>
      <Container57 />
      <Container68 />
    </div>
  );
}

function LandingPage() {
  return (
    <div className="absolute bg-white h-[3504.028px] left-0 top-0 w-[1119.259px]" data-name="LandingPage">
      <Section />
      <Section1 />
      <Section2 />
      <Footer />
      <Section3 />
      <Section4 />
      <Section5 />
    </div>
  );
}

function Icon15() {
  return (
    <div className="relative shrink-0 size-[27.998px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 27.9977 27.9977">
        <g id="Icon">
          <path d={svgPaths.p362e8880} fill="var(--fill-0, white)" id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.33314" />
        </g>
      </svg>
    </div>
  );
}

function Container69() {
  return (
    <ContainerBackgroundImage5 additionalClassNames="rounded-[14px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] size-[47.998px]">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
        <Icon15 />
      </div>
    </ContainerBackgroundImage5>
  );
}

function Text3() {
  return (
    <div className="h-[23.993px] relative shrink-0 w-[89.248px]" data-name="Text">
      <BackgroundImageAndText2 text="HAEMOLINK" />
    </div>
  );
}

function Container70() {
  return (
    <div className="h-[47.998px] relative shrink-0 w-[149.236px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[11.991px] items-center relative size-full">
        <Container69 />
        <Text3 />
      </div>
    </div>
  );
}

function Navigation() {
  return (
    <div className="h-[23.993px] relative shrink-0 w-[406.933px]" data-name="Navigation">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[31.991px] items-center relative size-full">
        <BackgroundImageAndText4 text="About" additionalClassNames="w-[43.588px]" />
        <BackgroundImageAndText4 text="How It Works" additionalClassNames="w-[94.745px]" />
        <BackgroundImageAndText4 text="Roles" additionalClassNames="w-[37.512px]" />
        <BackgroundImageAndText4 text="Impact" additionalClassNames="w-[48.403px]" />
        <BackgroundImageAndText4 text="Contact" additionalClassNames="w-[54.722px]" />
      </div>
    </div>
  );
}

function Button6() {
  return (
    <BackgroundImage1 additionalClassNames="h-[47.975px] rounded-[14px] w-[132.685px]">
      <p className="absolute font-['Arial:Regular',sans-serif] leading-[24px] left-[65.99px] not-italic text-[16px] text-center text-nowrap text-white top-[10.47px] translate-x-[-50%]">{`Let's Start`}</p>
    </BackgroundImage1>
  );
}

function LandingPage1() {
  return (
    <div className="absolute bg-[rgba(255,255,255,0.95)] content-stretch flex h-[79.988px] items-center justify-between left-0 pb-[0.741px] pl-[47.998px] pr-[48.009px] pt-0 top-0 w-[1119.259px]" data-name="LandingPage">
      <div aria-hidden="true" className="absolute border-[0px_0px_0.741px] border-black border-solid inset-0 pointer-events-none shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]" />
      <Container70 />
      <Navigation />
      <Button6 />
    </div>
  );
}

export default function BloodBankEcosystemWireframe() {
  return (
    <div className="bg-white relative size-full" data-name="Blood Bank Ecosystem Wireframe">
      <LandingPage />
      <LandingPage1 />
    </div>
  );
}