import type React from "react";
import "./AnnotationDisplay.css";

const AnnotationDisplay: React.FC<{ annotationStore: any, currentFrame: number }> = ({ annotationStore, currentFrame }) => {
    // Function to get active annotations as a list
    const getActiveAnnotations = () => {
        return [...annotationStore.active_annotations.values()];
    };

    const activeAnnotations = getActiveAnnotations();

    return (
        <div className="annotation-display">
            <div className="annotation-display-header">
                <h3>Active Annotations</h3>
                <span className="annotation-current-frame">Frame {currentFrame}</span>
            </div>

            {activeAnnotations.length === 0 && (
                <div className="annotation-empty-state">No active annotations</div>
            )}

            {activeAnnotations.map((annotation, index) => (
                <div key={index} className="annotation-box">
                    <div className="annotation-row">
                        <span className="annotation-label">Frame Start</span>
                        <span className="annotation-value">{annotation.frameStart}</span>
                    </div>
                    <div className="annotation-row">
                        <span className="annotation-label">Frame End</span>
                        <span className="annotation-value">{annotation.frameEnd}</span>
                    </div>
                    <div className="annotation-row">
                        <span className="annotation-label">Type</span>
                        <span className="annotation-type-badge">{annotation.type}</span>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default AnnotationDisplay;