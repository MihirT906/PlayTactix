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

    updateAnnotationRange(key: string, frameStart: number, frameEnd: number | null, currentFrame: number) {
        // Moves/resizes an annotation (used by the timeline's draggable bars) by
        // relocating its key between start_events/end_events buckets and
        // rebuilding active_annotations for the current frame.
        const annotation = this.annotations.get(key);
        if (!annotation) return;

        if (annotation.frameStart !== undefined) {
            const startKeys = this.start_events.get(annotation.frameStart);
            if (startKeys) {
                const filtered = startKeys.filter(k => k !== key);
                if (filtered.length) this.start_events.set(annotation.frameStart, filtered);
                else this.start_events.delete(annotation.frameStart);
            }
        }
        if (annotation.frameEnd !== undefined) {
            const endKeys = this.end_events.get(annotation.frameEnd);
            if (endKeys) {
                const filtered = endKeys.filter(k => k !== key);
                if (filtered.length) this.end_events.set(annotation.frameEnd, filtered);
                else this.end_events.delete(annotation.frameEnd);
            }
        }

        annotation.frameStart = frameStart;
        annotation.frameEnd = frameEnd ?? undefined;

        this.start_events.set(frameStart, [...(this.start_events.get(frameStart) || []), key]);
        if (annotation.frameEnd !== undefined) {
            this.end_events.set(annotation.frameEnd, [...(this.end_events.get(annotation.frameEnd) || []), key]);
        }

        logger.info("Updated annotation range", key, frameStart, frameEnd);
        this.reconstruct_active_annotations(currentFrame);
    }

    removeAnnotation(key: string) {
        // Permanently drops a single annotation (used by the timeline's right-click delete).
        if (!this.annotations.has(key)) return;
        logger.info("Removed annotation", key);
        this.annotations.delete(key);
        this.active_annotations.delete(key);
        for (const [frame, keys] of this.start_events.entries()) {
            const filtered = keys.filter((k) => k !== key);
            if (filtered.length) this.start_events.set(frame, filtered);
            else this.start_events.delete(frame);
        }
        for (const [frame, keys] of this.end_events.entries()) {
            const filtered = keys.filter((k) => k !== key);
            if (filtered.length) this.end_events.set(frame, filtered);
            else this.end_events.delete(frame);
        }
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

    load(saved: Array<{ key: string; type: string; frameStart: number; frameEnd: number | null; shape: any }>, currentFrame: number = 0) {
        // Replaces the store's contents with previously saved annotations (see getAllAnnotations),
        // rebuilding the sweep-line maps that drive which annotations are active per frame.
        this.clear();
        for (const item of saved) {
            const annotation: Annotation = {
                type: item.type,
                frameStart: item.frameStart,
                frameEnd: item.frameEnd ?? undefined,
                shape: item.shape,
            };
            this.annotations.set(item.key, annotation);
            this.start_events.set(item.frameStart, [...(this.start_events.get(item.frameStart) || []), item.key]);
            if (item.frameEnd !== null) {
                this.end_events.set(item.frameEnd, [...(this.end_events.get(item.frameEnd) || []), item.key]);
            }
        }
        logger.info("Loaded annotations", saved.length);
        this.reconstruct_active_annotations(currentFrame);
    }

    describeAnnotationStore(){
        console.log('Start Events:', this.start_events)
        console.log('End Events:', this.end_events)
        console.log('Active Annotations:', this.active_annotations)
        console.log('All Annotations:', this.annotations)
    }

    handleAnnotationRelayout(eventData: any, currentFrame: number) {
        const shapes = eventData["shapes"] || [];
        // Player lines are generated by PlotComponent (named, and carrying a distance label). Anything
        // hand-drawn has neither, so a generated line must never be captured as a draw annotation,
        // otherwise it is stored with frozen coordinates and shows up on every frame.
        const isPlayerLine = (shape: any) =>
            (typeof shape.name === 'string' && shape.name.startsWith('Player1:')) || shape.label !== undefined;
        const playerLineShapes = shapes.filter(isPlayerLine);
        const drawShapes = shapes.filter((shape: any) => !isPlayerLine(shape));
        this.deletePlayerLineAnnotations(playerLineShapes, currentFrame);
        this.addOrDeleteDrawShapes(drawShapes, currentFrame);
    }

}