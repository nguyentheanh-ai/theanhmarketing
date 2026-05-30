"use client";

import { useMemo, useState } from "react";

const MIN_BUDGET = 1;
const MAX_BUDGET = 12;

function formatBudget(value: number) {
  return `${value} triệu`;
}

export function AgentKitCalculator() {
  const [budget, setBudget] = useState(5);

  const data = useMemo(() => {
    const oldWayLoops = Math.max(1, Math.floor(budget / 3));
    const agentLoops = Math.max(3, Math.floor((budget * 1000 - 359) / 350));
    const standardizedOutputs = agentLoops * 3;
    const qualityCheckpoints = Math.max(1, Math.ceil(agentLoops / 4));
    const reusableAssets = Math.max(2, agentLoops + qualityCheckpoints);

    return {
      agentLoops,
      qualityCheckpoints,
      oldWayLoops,
      reusableAssets,
      savedLoops: Math.max(1, agentLoops - oldWayLoops),
      standardizedOutputs,
    };
  }, [budget]);

  const progress = ((budget - MIN_BUDGET) / (MAX_BUDGET - MIN_BUDGET)) * 100;

  return (
    <div className="section-inner calculator-wrap">
      <div>
        <span className="section-tag">Test velocity calculator</span>
        <h2 style={{ fontSize: "clamp(2.15rem,4.5vw,3.3rem)", lineHeight: 1.12, letterSpacing: "-.035em", margin: "18px 0" }}>
          Cùng ngân sách. Bạn giảm được bao nhiêu vòng việc lặp?
        </h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.75, fontWeight: 650 }}>
          Kéo thanh ngân sách giả lập để thấy bên phải thay đổi theo số vòng giao việc, output chuẩn hóa và checkpoint vận hành. Đây là mô phỏng hiệu suất, không phải cam kết doanh thu.
        </p>

        <label className="calculator-control" htmlFor="repetitive-work-budget">
          <span>
            Ngân sách/tháng cho việc lặp lại
            <strong>{formatBudget(budget)}</strong>
          </span>
          <input
            id="repetitive-work-budget"
            aria-label="Ngân sách cho việc lặp lại mỗi tháng"
            className="calculator-range"
            max={MAX_BUDGET}
            min={MIN_BUDGET}
            onChange={(event) => setBudget(Number(event.target.value))}
            style={{ background: `linear-gradient(90deg, #0061ff ${progress}%, #dbeafe ${progress}%)` }}
            type="range"
            value={budget}
          />
          <span className="range-scale">
            <small>{formatBudget(MIN_BUDGET)}</small>
            <small>{formatBudget(MAX_BUDGET)}</small>
          </span>
        </label>
      </div>

      <div className="glass calc-live-panel" style={{ padding: 28 }}>
        <div className="calc-results">
          <div className="calc-card glass">
            <span className="calc-label">Prompt lẻ / làm thủ công</span>
            <strong>{data.oldWayLoops}</strong>
            <p>vòng việc có thể xử lý khi vẫn phải tự brief lại</p>
          </div>
          <div className="calc-card glass calc-card-primary">
            <span className="calc-label">AI Agent Business</span>
            <strong>{data.agentLoops}+</strong>
            <p>vòng giao việc có workflow + dữ liệu để lặp</p>
          </div>
        </div>

        <div className="calc-meta-grid">
          <div>
            <span>{data.standardizedOutputs}</span>
            <p>output content / ads / báo cáo có thể chuẩn hóa</p>
          </div>
          <div>
            <span>{data.qualityCheckpoints}</span>
            <p>checkpoint để kiểm tra chất lượng đầu ra</p>
          </div>
          <div>
            <span>{data.reusableAssets}</span>
            <p>asset có thể lưu thành SOP, template hoặc checklist</p>
          </div>
        </div>

        <p className="calc-note">
          Với mức {formatBudget(budget)}, bộ kit không “tự vận hành doanh nghiệp”; nó giúp bạn tăng số vòng giao việc, kiểm tra và lặp lại. Dữ liệu thật của bạn quyết định chất lượng đầu ra.
        </p>
      </div>
    </div>
  );
}
