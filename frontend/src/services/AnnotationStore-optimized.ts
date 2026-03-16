import objectHash from "object-hash";

interface Annotation {
    type: string;
    frameStart?: number;
    frameEnd?: number;
    shape: any;
}

export default class AnnotationStore {
    private start_events: Map<number, Array<string>> = new Map(); // Maps start frame number to an array of annotation keys (sweep line algorithm)
    private end_events: Map<number, Array<string>> = new Map() // Maps end frame number to an array of annotation keys (sweep line algorithm)
    private active_annotations: Map<string, Annotation> = new Map() // Contains all currently active annotations
    private annotations: Map<string, Annotation> = new Map() // Contains all annotations
    
    reconstruct_active_annotations(currentFrame: number) {
        // Reconstructs active annotations from start_events and end_events based on the current frame
        this.active_annotations.clear()
        for (const [frame, annotationKeys] of this.start_events.entries()) {
            if (frame > currentFrame) continue;

            for (const key of annotationKeys) {
                const annotation = this.annotations.get(key)
                if (annotation){
                    this.active_annotations.set(key, annotation)
                }
            }
        }
        for (const [frame, annotationKeys] of this.end_events.entries()) {
            if (frame > currentFrame) continue;

            for (const key of annotationKeys) {
                this.active_annotations.delete(key)
            }
        }
    }
    
    update_active_annotation(currentFrame: number) {
        // Keeps active annotations current
        const shapes_to_remove = this.end_events.get(currentFrame) || []
        for (const shapeKey of shapes_to_remove) {
            this.active_annotations.delete(shapeKey)
        }
        const shapes_to_add = this.start_events.get(currentFrame) || []
        for (const shapeKey of shapes_to_add) {
            const annotation = this.annotations.get(shapeKey)
            if (annotation) {
                this.active_annotations.set(shapeKey, annotation)
            }
        }

    }
    
    addPlayerFocusAnnotation(point1: number, point2: number, currentFrame: number){
        // Create a player focus annotation and add it to the store
        const annotation: Annotation = {
            type: 'playerFocus',
            shape: {
                points: [point1, point2]
            }
        };
        const uniqueKey = objectHash(annotation);
        if (this.active_annotations.has(uniqueKey)) return;

        annotation.frameStart = currentFrame;
        this.start_events.set(currentFrame, [...(this.start_events.get(currentFrame) || []), uniqueKey]);
        annotation.frameEnd = undefined;
        this.annotations.set(uniqueKey, annotation);
        this.update_active_annotation(currentFrame)
    }

    deletePlayerFocusAnnotation(playerFocusShapes: any, currentFrame: number){
        // Delete player focus annotations that do not exist anymore
        for (const [key, annotation] of this.active_annotations.entries()) {
            if (annotation.type !== 'playerFocus') continue;
            const isPresent = playerFocusShapes.some((shape: any) => shape.name === `Player1:${annotation.shape.points[0]},Player2:${annotation.shape.points[1]}`);
            if (!isPresent) {
                annotation.frameEnd = currentFrame;
                this.end_events.set(currentFrame, [...(this.end_events.get(currentFrame) || []), key]);
            }
        }
        this.update_active_annotation(currentFrame)
    }

    addOrDeleteDrawShapes(drawShapes: any, currentFrame: number){
        // Delete draw shapes that do not exist anymore
        for (const [key, annotation] of this.active_annotations.entries()) {
            if (annotation.type !== 'draw') continue;
            const isPresent = drawShapes.some((shape: any) => objectHash(shape) === key);
            if (!isPresent) {
                annotation.frameEnd = currentFrame;
                this.end_events.set(currentFrame, [...(this.end_events.get(currentFrame) || []), key]);
            }
        }

        // Add new draw shapes that have been captured
        for (const shape of drawShapes) {
            const uniqueKey = objectHash(shape);
            if (this.active_annotations.has(uniqueKey)) continue;
            this.start_events.set(currentFrame, [...(this.start_events.get(currentFrame) || []), uniqueKey]);
            const annotation: Annotation = {
                type: 'draw',
                frameStart: currentFrame,
                shape: shape
            };
            this.annotations.set(uniqueKey, annotation);
        }
        this.update_active_annotation(currentFrame)

    }

    getPlayerFocusLines(currentFrame: number) {
        return Array.from(this.active_annotations.values()).filter(annotation => annotation.type === 'playerFocus').map(annotation => annotation.shape.points);
    }

    getDrawAnnotations(currentFrame: number) {
        return Array.from(this.active_annotations.values()).filter(annotation => annotation.type === 'draw').map(annotation => annotation.shape);
    }

    handleAnnotationRelayout(eventData: any, currentFrame: number) {
        const shapes = eventData["shapes"] || [];
        const drawShapes = shapes.filter((shape: any) => shape.name == undefined);
        const playerFocusShapes = shapes.filter((shape: any) => !drawShapes.includes(shape));
        this.deletePlayerFocusAnnotation(playerFocusShapes, currentFrame);
        this.addOrDeleteDrawShapes(drawShapes, currentFrame);
    }

}