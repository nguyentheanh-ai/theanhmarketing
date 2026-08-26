(function (global, factory) {
  var api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (global) {
    global.TheAnhFacebookAdsEventContract = api;
  }
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  var SCROLL_MILESTONES = [50, 75, 90];
  var VIDEO_MILESTONES = [25, 50, 75, 95];

  function createFacebookAdsEventContract(emit) {
    var visibleMilliseconds = 0;
    var engagedViewSent = false;
    var sentScrollMilestones = new Set();
    var sentVideoMilestones = new Map();

    function recordVisibleMilliseconds(milliseconds) {
      if (engagedViewSent || !Number.isFinite(milliseconds) || milliseconds <= 0) return false;
      visibleMilliseconds += milliseconds;
      if (visibleMilliseconds < 30000) return false;

      engagedViewSent = true;
      emit("EngagedView", { engaged_seconds: 30 });
      return true;
    }

    function recordScrollPercent(percent) {
      if (!Number.isFinite(percent)) return;
      SCROLL_MILESTONES.forEach(function (milestone) {
        if (percent < milestone || sentScrollMilestones.has(milestone)) return;
        sentScrollMilestones.add(milestone);
        emit("ScrollDepth", { scroll_depth: milestone });
      });
    }

    function recordCtaClick(details) {
      if (!details || !details.ctaId || !details.destinationUrl) return;
      emit("CTAClick", {
        cta_id: String(details.ctaId),
        cta_text: String(details.ctaText || "").trim(),
        destination_url: String(details.destinationUrl),
      });
    }

    function recordVideoPercent(videoId, videoTitle, percent) {
      if (!videoId || !Number.isFinite(percent)) return;
      var videoKey = String(videoId);
      var sentForVideo = sentVideoMilestones.get(videoKey) || new Set();

      VIDEO_MILESTONES.forEach(function (milestone) {
        if (percent < milestone || sentForVideo.has(milestone)) return;
        sentForVideo.add(milestone);
        emit("VideoProgress", {
          video_id: videoKey,
          video_title: String(videoTitle || ""),
          video_percent: milestone,
        });
      });

      sentVideoMilestones.set(videoKey, sentForVideo);
    }

    return {
      recordVisibleMilliseconds: recordVisibleMilliseconds,
      recordScrollPercent: recordScrollPercent,
      recordCtaClick: recordCtaClick,
      recordVideoPercent: recordVideoPercent,
    };
  }

  function initBrowserTracking() {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (document.documentElement.dataset.facebookAdsEventContract === "ready") return;
    document.documentElement.dataset.facebookAdsEventContract = "ready";

    var contract = createFacebookAdsEventContract(function (eventName, payload) {
      if (typeof window.fbq === "function") {
        window.fbq("trackCustom", eventName, payload);
      }
    });

    var lastVisibleTick = Date.now();
    var engagementTimer = window.setInterval(function () {
      var now = Date.now();
      var elapsed = now - lastVisibleTick;
      lastVisibleTick = now;
      if (document.visibilityState === "hidden") return;
      if (contract.recordVisibleMilliseconds(elapsed)) {
        window.clearInterval(engagementTimer);
      }
    }, 250);

    document.addEventListener("visibilitychange", function () {
      lastVisibleTick = Date.now();
    });

    var scrollFramePending = false;
    function recordScrollDepth() {
      scrollFramePending = false;
      var root = document.documentElement;
      var body = document.body;
      var scrollTop = window.scrollY || root.scrollTop || body.scrollTop || 0;
      var scrollHeight = Math.max(root.scrollHeight, body.scrollHeight);
      var viewportHeight = window.innerHeight || root.clientHeight || 0;
      var scrollableHeight = Math.max(scrollHeight - viewportHeight, 0);
      var percent = scrollableHeight === 0 ? 100 : (scrollTop / scrollableHeight) * 100;
      contract.recordScrollPercent(Math.min(100, Math.max(0, percent)));
    }

    window.addEventListener(
      "scroll",
      function () {
        if (scrollFramePending) return;
        scrollFramePending = true;
        window.requestAnimationFrame(recordScrollDepth);
      },
      { passive: true }
    );
    recordScrollDepth();

    document.querySelectorAll("[data-meta-cta]").forEach(function (cta) {
      cta.addEventListener("click", function () {
        var href = cta.getAttribute("href") || "";
        contract.recordCtaClick({
          ctaId: cta.getAttribute("data-cta-id"),
          ctaText: cta.getAttribute("data-cta-text") || cta.textContent,
          destinationUrl: new URL(href, window.location.href).href,
        });
      });
    });

    document.querySelectorAll("video[data-meta-video-id]").forEach(function (video) {
      video.addEventListener("timeupdate", function () {
        if (!Number.isFinite(video.duration) || video.duration <= 0) return;
        contract.recordVideoPercent(
          video.getAttribute("data-meta-video-id"),
          video.getAttribute("data-meta-video-title") || video.title || "",
          (video.currentTime / video.duration) * 100
        );
      });
    });
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initBrowserTracking, { once: true });
    } else {
      initBrowserTracking();
    }
  }

  return {
    createFacebookAdsEventContract: createFacebookAdsEventContract,
    initBrowserTracking: initBrowserTracking,
  };
});
