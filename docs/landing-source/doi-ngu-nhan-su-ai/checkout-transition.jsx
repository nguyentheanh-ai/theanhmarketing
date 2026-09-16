"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

/** @param {{ seconds: number | null }} props */
export function CheckoutTransition({ seconds }) {
  const active = seconds !== null;
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [active]);
  if (!active || typeof document === "undefined") return null;
  return createPortal(
    <div role="status" aria-live="polite" aria-busy="true" data-checkout-transition style={{position:"fixed",inset:0,zIndex:10000,display:"grid",placeItems:"center",padding:24,background:"rgba(15,16,14,.96)",color:"#fffaf0",fontFamily:"system-ui, sans-serif"}}>
      <div style={{width:"min(420px, 100%)",textAlign:"center",padding:"36px 24px",border:"1px solid #875032",borderRadius:24,background:"#191a17"}}>
        <strong data-checkout-countdown style={{display:"grid",placeItems:"center",width:116,height:116,margin:"0 auto 24px",border:"5px solid #c95b36",borderRadius:"50%",fontSize:64,lineHeight:1}}>{seconds || "…"}</strong>
        <p style={{margin:0,fontSize:24,fontWeight:800,lineHeight:1.35}}>{seconds ? "Đang tạo trang thanh toán" : "Đang chuẩn bị trang thanh toán…"}</p>
        <p style={{margin:"12px 0 0",fontSize:14,color:"#d4c9b9"}}>Vui lòng giữ nguyên màn hình</p>
      </div>
    </div>, document.body,
  );
}
