import type React from "react";
import "./AnnotationDisplay.css";

const AnnotationDisplay: React.FC<{ annotationStore: any, currentFrame: number }> = ({ annotationStore, currentFrame }) => {
    // Function to get active annotations as a list
    const getActiveAnnotations = () => {
        return [...annotationStore.active_annotations.values()];
    };

    return (
        <div className="annotation-display">
            <h3>Active Annotations:</h3>
            {getActiveAnnotations().map((annotation, index) => (
                <div key={index} className="annotation-box">
                    <div style={{ textAlign: "center", lineHeight: "1.5" }}>
                        <p><strong>Frame Start:</strong> {annotation.frameStart}</p>
                        <p><strong>Frame End:</strong> {annotation.frameEnd}</p>
                        <p><strong>Type:</strong> {annotation.type}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default AnnotationDisplay;