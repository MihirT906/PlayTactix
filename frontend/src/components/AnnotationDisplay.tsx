import type React from "react";
import "./AnnotationDisplay.css";

const AnnotationDisplay: React.FC<{ annotationStore: any, currentFrame: number, annotationUpdateEvent: boolean }> = ({ annotationStore, currentFrame, annotationUpdateEvent }) => {
    const allAnnotations = [...annotationStore.annotations.entries()] as [string, any][];
    const activeKeys = new Set(annotationStore.active_annotations.keys());

    return (
        <div className="annotation-display">
            <div className="annotation-display-header">
                <h3>Annotations</h3>
                {/* <span className="annotation-current-frame">Frame {currentFrame}</span> */}
            </div>

            {allAnnotations.length === 0 && (
                <div className="annotation-empty-state">No annotations</div>
            )}

            {allAnnotations.map(([key, annotation]) => {
                const isActive = activeKeys.has(key);
                return (
                    <div key={key} className={`annotation-box ${isActive ? "annotation-box--active" : "annotation-box--inactive"}`}>
                        <div className="annotation-status-row">
                            <span className={`annotation-status-dot ${isActive ? "dot--active" : "dot--inactive"}`} />
                            <span className={`annotation-status-label ${isActive ? "status--active" : "status--inactive"}`}>
                                {isActive ? "Active" : "Inactive"}
                            </span>
                        </div>
                        <div className="annotation-row">
                            <span className="annotation-label">Frame Start</span>
                            <span className="annotation-value">{annotation.frameStart}</span>
                        </div>
                        <div className="annotation-row">
                            <span className="annotation-label">Frame End</span>
                            <span className="annotation-value">{annotation.frameEnd ?? "—"}</span>
                        </div>
                        {annotation.type === "playerFocus" && (
                            <div className="annotation-visual-block" aria-label="Player link diagram">
                                <div className="player-node">
                                    <span className="player-node-label">Player 1</span>
                                    <span className="player-node-value">{annotation.shape.points[0] ?? "?"}</span>
                                </div>
                                <div className="player-node">
                                    <span className="player-node-label">Player 2</span>
                                    <span className="player-node-value">{annotation.shape.points[1] ?? "?"}</span>
                                </div>
                            </div>
                        )}
                        {annotation.type === "draw" && (
                            <div className="annotation-visual-block" aria-label="Draw shape diagram">
                                <span className="annotation-draw-label">Drawn Shape</span>
                                <span className="annotation-draw-value">{annotation.shape.type}</span>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default AnnotationDisplay;