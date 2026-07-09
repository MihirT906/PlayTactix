import objectHash from "object-hash";
import { getLogger } from "../services/logger";

const logger = getLogger("AnnotationStore");

interface Annotation {
    type: string;
    frameStart?: number;
    frameEnd?: number;
    shape: any;
}

function createShapeKey(shape: any, frameStart: number): string {
    if (shape.players) {
        return `playerLine|${frameStart}|${shape.players.sort((a: number, b: number) => a - b).join(',')}`;
    }
    const type = shape.type;
    const x0 = shape.x0;
    const y0 = shape.y0;
    const x1 = shape.x1;
    const y1 = shape.y1;
    const round = (v: any) =>
        typeof v === 'number' ? Number(v.toFixed(3)) : v; // Round numbers to 3 decimal places for consistency

    const parts = [type, round(x0), round(y0), round(x1), round(y1)];
    return parts.join('|');
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
    
    private discardAnnotation(key: string, currentFrame: number) {
        // Annotation was created and deleted on the same frame - never store it
        this.annotations.delete(key);
        this.active_annotations.delete(key);
        const startKeys = this.start_events.get(currentFrame);
        if (startKeys) {
            this.start_events.set(currentFrame, startKeys.filter(k => k !== key));
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
    
    addPlayerLineAnnotation(player1: number, player2: number, currentFrame: number){
        // Create a player line annotation and add it to the store
        const annotation: Annotation = {
            type: 'playerLine',
            shape: {
                players: [player1, player2]
            }
        };
        logger.info("Add player line annotation called for players:", player1, player2, "at frame:", currentFrame);
        // const uniqueKey = createShapeKey(annotation.shape, currentFrame);
        // if (this.active_annotations.has(uniqueKey)) return;
        // loop through active annotations to check if an identical annotation already exists (to prevent duplicates from relayout events)
        for (const existingAnnotation of this.active_annotations.values()) {
            if (existingAnnotation.type !== 'playerLine') continue;
            if (existingAnnotation.shape.players.sort().toString() === annotation.shape.players.sort().toString()) {
                return;
            }
        }
        const uniqueKey = createShapeKey(annotation.shape, currentFrame);
        annotation.frameStart = currentFrame;
        this.start_events.set(currentFrame, [...(this.start_events.get(currentFrame) || []), uniqueKey]);
        annotation.frameEnd = undefined;
        this.annotations.set(uniqueKey, annotation);
        this.update_active_annotation(currentFrame)
    }

    deletePlayerLineAnnotations(playerLineShapes: any, currentFrame: number){
        // Delete player line annotations that do not exist anymore
        for (const [key, annotation] of this.active_annotations.entries()) {
            if (annotation.type !== 'playerLine') continue;
            const isPresent = playerLineShapes.some((shape: any) => shape.name === `Player1:${annotation.shape.players[0]},Player2:${annotation.shape.players[1]}`);
            if (!isPresent) {
                logger.info("Removed player line annotation for players:", annotation.shape.players, "at frame:", currentFrame);
                if (annotation.frameStart === currentFrame) {
                    this.discardAnnotation(key, currentFrame);
                    continue;
                }
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
            const isPresent = drawShapes.some((shape: any) => createShapeKey(shape, currentFrame) === key);
            if (!isPresent) {
                logger.info("Removed draw annotation at frame:", currentFrame);
                if (annotation.frameStart === currentFrame) {
                    this.discardAnnotation(key, currentFrame);
                    continue;
                }
                annotation.frameEnd = currentFrame;
                this.end_events.set(currentFrame, [...(this.end_events.get(currentFrame) || []), key]);
            }
        }

        // Add new draw shapes that have been captured
        for (const shape of drawShapes) {
            const uniqueKey = createShapeKey(shape, currentFrame);
            if (this.active_annotations.has(uniqueKey)) continue;
            logger.info("Added draw annotation at frame:", currentFrame);
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

    getPlayerLineAnnotations(currentFrame: number) {
        return Array.from(this.active_annotations.values()).filter(annotation => annotation.type === 'playerLine').map(annotation => annotation.shape.players);
    }

    getDrawAnnotations(currentFrame: number) {
        return Array.from(this.active_annotations.values()).filter(annotation => annotation.type === 'draw').map(annotation => annotation.shape);
    }

    getAllAnnotations(): Array<{ key: string; type: string; frameStart: number; frameEnd: number | null; shape: any }> {
        // Returns every annotation ever created (not just the ones active at a given frame), for timeline display
        return Array.from(this.annotations.entries()).map(([key, annotation]) => ({
            key,
            type: annotation.type,
            frameStart: annotation.frameStart ?? 0,
            frameEnd: annotation.frameEnd ?? null,
            shape: annotation.shape,
        }));
    }

    clear() {
        // Discards every annotation, e.g. when the clip's segment changes and old
        // clip-relative frame numbers no longer refer to the same footage.
        logger.info("Clip annotations cleared");
        this.start_events.clear();
        this.end_events.clear();
        this.active_annotations.clear();
        this.annotations.clear();
    }

    describeAnnotationStore(){
        console.log('Start Events:', this.start_events)
        console.log('End Events:', this.end_events)
        console.log('Active Annotations:', this.active_annotations)
        console.log('All Annotations:', this.annotations)
    }

    handleAnnotationRelayout(eventData: any, currentFrame: number) {
        const shapes = eventData["shapes"] || [];
        const drawShapes = shapes.filter((shape: any) => shape.name == undefined);
        const playerLineShapes = shapes.filter((shape: any) => !drawShapes.includes(shape));
        this.deletePlayerLineAnnotations(playerLineShapes, currentFrame);
        this.addOrDeleteDrawShapes(drawShapes, currentFrame);
    }

}