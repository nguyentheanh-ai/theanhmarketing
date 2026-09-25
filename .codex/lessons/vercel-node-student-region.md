# Vùng Node của khu học viên

Phạm vi: theanh-main, Next16.2.6, Vercel Node functions.
VERIFIED: deploy453061a có preferredRegion=syd1 trong source nhưng HTTP live vẫn iad1. Builder @vercel/next getPageLambdaGroups bỏ regions từ functionsConfigManifest. Không coi build PASS là bằng chứng runtime region.
VERIFIED correction: per-function regions trong vercel.json theo tài liệu Vercel hiện tại; kiểm tra header live sau deploy. Không đổi toàn bộ default region hoặc chuyển Edge để né vấn đề. Không áp dụng kết luận này cho Edge runtime hay builder khác chưa kiểm tra.

Live 9167035: student headers syd1; admin iad1.
