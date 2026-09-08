const labels: Record<string,string> = {
  mail: "Lá thư bay từ bạn đến khách hàng",
  video: "Các cảnh được ghép vào video và thêm phụ đề",
  web: "Các khối nội dung ghép thành website",
  ads: "Mẫu quảng cáo chuyển đến các nhóm khách hàng",
  research: "Thông tin từ nhiều nguồn được gom thành bản nghiên cứu",
  social: "Bài viết chuyển từ lịch đăng lên Facebook",
  finance: "Các khoản thu chi được tổng hợp thành báo cáo",
  plan: "Mục tiêu được chia thành các công việc trong kế hoạch tuần",
};

function Sheet({x,y,className=""}:{x:number;y:number;className?:string}) {
  return <g className={className}><rect x={x} y={y} width="38" height="46" rx="6" fill="#fff"/><path d={`M${x+9} ${y+13}h20m-20 9h16m-16 9h20`} /></g>;
}
function Envelope({x,y,className=""}:{x:number;y:number;className?:string}) {
  return <g className={className}><rect x={x} y={y} width="38" height="28" rx="5" fill="#f5d7bb"/><path d={`m${x+2} ${y+3} 17 12 17-12`}/></g>;
}
export function OutcomeMotion({kind}:{kind:string}) {
  return <div className={`cx-motion cx-motion-${kind}`} role="img" aria-label={`Minh họa: ${labels[kind]}`}>
    <svg viewBox="0 0 300 156" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {kind==="mail" && <>
        <path className="cx-motion-route" d="M54 84Q150 12 246 84"/>
        <g><rect x="15" y="66" width="60" height="45" rx="8" fill="#fff"/><path d="M26 100h38M39 115h12"/><text x="45" y="137">Bạn</text></g>
        <g><rect x="225" y="66" width="60" height="45" rx="8" fill="#fff"/><circle cx="255" cy="82" r="6"/><path d="M242 101q13-20 26 0"/><text x="255" y="137">Khách hàng</text></g>
        <Envelope x={26} y={56} className="cx-flying-mail"/><g className="cx-motion-success"><circle cx="278" cy="65" r="11" fill="#dbe8ce"/><path d="m273 65 3 3 6-7"/></g>
      </>}
      {kind==="video" && <>
        <rect x="87" y="14" width="126" height="77" rx="9" fill="#fff"/><g className="cx-video-picture"><rect x="96" y="23" width="108" height="42" rx="5" fill="#e4ecd7"/><path d="m137 31 23 13-23 13Z" fill="#8ca773"/></g>
        <path className="cx-video-subtitles" d="M116 77h68"/>
        <rect x="20" y="109" width="260" height="30" rx="6" fill="#fff"/>
        {[0,1,2].map(i=><g key={i} className={`cx-clip cx-phase-${i}`}><rect x={28+i*84} y="116" width="76" height="16" rx="3" fill={i===1?"#e7d8b9":"#cddfbd"}/><path d={`M${37+i*84} 121v6m7-6v6`}/></g>)}
        <path className="cx-video-playhead" d="M30 103v42" stroke="#b36033"/>
      </>}
      {kind==="web" && <>
        <rect x="35" y="16" width="230" height="124" rx="9" fill="#fff"/><path d="M35 37h230"/><circle cx="46" cy="27" r="2"/><circle cx="55" cy="27" r="2"/><circle cx="64" cy="27" r="2"/>
        <g className="cx-web-block cx-phase-0"><rect x="47" y="48" width="206" height="38" rx="5" fill="#d5e2c7"/><path d="M61 60h77m-77 12h52"/></g>
        {[0,1,2].map(i=><rect key={i} className={`cx-web-block cx-phase-${i+1}`} x={47+i*71} y="96" width="64" height="31" rx="5" fill={i===1?"#f1d8c0":"#e8eddf"}/>)}
        <path className="cx-web-cursor" d="m212 70 5 20 5-7 8-2Z" fill="#596e48"/>
      </>}
      {kind==="ads" && <>
        <rect x="18" y="38" width="80" height="82" rx="9" fill="#fff"/><rect x="27" y="47" width="62" height="40" rx="4" fill="#e0dced"/><path d="M30 98h55m-55 10h32"/>
        <path className="cx-motion-route" d="M100 79h42m0 0 52-43m-52 43h52m-52 0 52 43"/>
        {[36,79,122].map((y,i)=><g key={y} className={`cx-audience-reveal cx-phase-${i}`}><circle cx="224" cy={y} r="18" fill="#eeedf6"/><circle cx="224" cy={y-5} r="5"/><path d={`M214 ${y+9}q10-16 20 0`}/></g>)}
        <g className="cx-ad-send"><circle cx="109" cy="79" r="7" fill="#bcaad7"/></g>
      </>}
      {kind==="research" && <>
        <Sheet x={20} y={18} className="cx-source cx-phase-0"/><Sheet x={20} y={91} className="cx-source cx-phase-1"/>
        <path className="cx-motion-route" d="M64 42q60 0 85 35M64 113q60 0 85-36M153 77h28"/>
        <g className="cx-research-lens"><circle cx="120" cy="70" r="18" fill="#e6eedb"/><path d="m133 83 15 15M111 66h17m-17 8h10"/></g>
        <rect x="187" y="35" width="91" height="92" rx="8" fill="#fff"/><g className="cx-report-lines"><path d="M201 52h63m-63 15h46m-46 15h63m-63 15h36"/></g><text x="233" y="145">Bản nghiên cứu</text>
      </>}
      {kind==="social" && <>
        <rect x="17" y="29" width="88" height="98" rx="8" fill="#fff"/><path d="M17 53h88M37 22v14m47-14v14"/>
        {[0,1,2].map(i=><rect key={i} x={29+i*24} y="65" width="16" height="16" rx="3" fill="#e2eacf"/>)}<rect x="29" y="90" width="16" height="16" rx="3" fill="#f0d7bd"/>
        <path className="cx-motion-route" d="M108 79h70"/>
        <g className="cx-post-travel"><rect x="44" y="73" width="35" height="28" rx="4" fill="#d6e2c6"/><path d="M51 81h20m-20 8h14"/></g>
        <rect x="190" y="29" width="90" height="98" rx="8" fill="#fff"/><text x="235" y="47">Facebook</text><g className="cx-social-published"><rect x="201" y="57" width="68" height="42" rx="4" fill="#d5e3c8"/><path d="M204 111h57"/></g>
      </>}
      {kind==="finance" && <>
        <Sheet x={19} y={54} className="cx-finance-input"/><path className="cx-motion-route" d="M62 77h37"/>
        <rect x="105" y="20" width="174" height="116" rx="8" fill="#fff"/><path d="M117 37h150M126 115h129"/>
        {[37,58,45].map((h,i)=><rect key={i} className={`cx-finance-bar cx-phase-${i}`} x={139+i*37} y={114-h} width="22" height={h} rx="3" fill={i===1?"#edc8a3":"#bdd1aa"}/>)}
        <text x="191" y="32">THU · CHI · LỢI NHUẬN</text>
      </>}
      {kind==="plan" && <>
        <circle cx="40" cy="76" r="25" fill="#f3e2cf"/><circle cx="40" cy="76" r="15"/><circle cx="40" cy="76" r="5" fill="#b97b49"/><text x="40" y="126">Mục tiêu</text>
        <path className="cx-motion-route" d="M68 76h27"/>
        <rect x="103" y="25" width="181" height="111" rx="8" fill="#fff"/><path d="M103 50h181M163 50v86M224 50v86"/><text x="133" y="42">Thứ 2</text><text x="193" y="42">Thứ 4</text><text x="254" y="42">Thứ 6</text>
        {[0,1,2].map(i=><g key={i} className={`cx-plan-task cx-phase-${i}`}><rect x={112+i*61} y={62+i*11} width="42" height="31" rx="4" fill={i===1?"#f2dbc1":"#d7e5c8"}/><path d={`m${121+i*61} ${77+i*11} 4 4 8-9`}/></g>)}
      </>}
    </svg>
  </div>;
}
