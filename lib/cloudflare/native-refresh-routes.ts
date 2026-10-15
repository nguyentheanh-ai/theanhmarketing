// Existing A routes only. B is a separate application; do not match its domain.
export function isNativeRefreshRoute(path:string){
 return path==='/learn'||path.startsWith('/learn/')||path==='/dang-nhap'||path==='/doi-mat-khau'||path==='/app-login-bridge'||path==='/thu-vien/facebook-ads'||path==='/thu-vien/facebook-ads/pdf'||path==='/dashboard/agents'||path.startsWith('/dashboard/agents/')||path==='/api/ebook/facebook-ads/pdf'||path==='/api/ebook/facebook-ads/page'||/^\/api\/agent-library\/[^/]+\/download$/.test(path);
}
