"use client";
import { useState } from "react";
import { tutorialVideos } from "./tutorial-videos";

export function VideoTutorials() {
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(false);
  const video = tutorialVideos[selected];
  function selectLesson(index: number) {
    if (index < 0 || index >= tutorialVideos.length) return;
    setSelected(index);
    setPlaying(true);
  }
  return (
    <section className="video-tutorials" id="video-huong-dan" aria-labelledby="video-tutorials-title">
      <div className="video-section-heading">
        <div><h2 id="video-tutorials-title">Video hướng dẫn</h2><p>Từ làm quen Codex đến cài đặt và sử dụng nhân viên AI.</p></div>
        <span>{tutorialVideos.length} video</span>
      </div>
      <div className="video-workspace">
        <div className="video-viewer">
          <div className="video-screen">
            {playing ? <iframe key={video.youtubeId} src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?rel=0&autoplay=1`} title={video.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /> :
              <button className="video-start" onClick={() => setPlaying(true)} aria-label={`Xem video: ${video.title}`}>
                <span className="video-play-icon" aria-hidden="true">▶</span><span>Xem video hướng dẫn</span><strong>{video.title}</strong>
              </button>}
          </div>
          <div className="video-caption" aria-live="polite"><p>Bài {video.number}</p><h3>{video.title}</h3></div>
          <nav className="video-navigation" aria-label="Chuyển bài học">
            <button type="button" disabled={selected === 0} onClick={() => selectLesson(selected - 1)}>← Bài trước</button>
            <span>{selected + 1} / {tutorialVideos.length}</span>
            <button type="button" disabled={selected === tutorialVideos.length - 1} onClick={() => selectLesson(selected + 1)}>Bài tiếp theo →</button>
          </nav>

        </div>
        <ol className="video-lessons" aria-label="Danh sách video hướng dẫn">
          {tutorialVideos.map((lesson, index) => <li key={lesson.youtubeId}><button type="button" aria-current={index === selected ? "true" : undefined} className={index === selected ? "video-lesson active" : "video-lesson"} onClick={() => selectLesson(index)}><span className="video-lesson-number">{lesson.number}</span><span>{lesson.title}</span><span className="video-lesson-play" aria-hidden="true">{index === selected ? "●" : "▷"}</span></button></li>)}
        </ol>
      </div>
          <section className="video-materials" aria-labelledby="video-materials-title" key={video.youtubeId}>
            <h4 id="video-materials-title">Tài liệu bài {video.number}</h4>
            {video.materials.length ? <ul>{video.materials.map(material => <li key={material.href}><a href={material.href} target="_blank" rel="noopener noreferrer">{material.title} ↗</a></li>)}</ul> : <p>Chưa có tài liệu đính kèm.</p>}
          </section>
    </section>
  );
}
