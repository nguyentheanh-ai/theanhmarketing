"use client";

import { Component, type ReactNode } from "react";

type ChartErrorBoundaryProps = {
  children: ReactNode;
  onRetry: () => void;
  resetKey: string;
};

type ChartErrorBoundaryState = {
  hasError: boolean;
};

export class ChartErrorBoundary extends Component<ChartErrorBoundaryProps, ChartErrorBoundaryState> {
  state: ChartErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ChartErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("[command-center-chart] render failed", { message: error.message });
  }

  componentDidUpdate(prevProps: ChartErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="grid h-[320px] place-items-center rounded-3xl bg-red-50 px-5 text-center text-sm font-black text-red-800"
          role="status"
        >
          <div>
            <p>Không tải được biểu đồ</p>
            <button
              className="mt-4 min-h-10 rounded-full bg-red-800 px-4 text-white"
              onClick={() => {
                this.setState({ hasError: false });
                this.props.onRetry();
              }}
              type="button"
            >
              Thử lại
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
