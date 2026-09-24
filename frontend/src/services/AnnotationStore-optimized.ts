import objectHash from "object-hash";
import { getLogger } from "../services/logger";

const logger = getLogger("AnnotationStore");

interface Annotation {
    type: string;
    frameStart?: number;
    frameEnd?: number;
    shape: any;
}

function createShapeKey(shape: any, _frameStart?: number): string {
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

let playerLineCounter = 0;
function newPlayerLineKey(): string {
    // Immutable identity: independent of the pair and frame range, which are mutable data
    return `playerLine|${Date.now().toString(36)}-${(playerLineCounter++).toString(36)}`;
}

function samePair(a: number[], b: number[]): boolean {
    const norm = (p: number[]) => [...p].sort((x, y) => x - y).join(',');
    return norm(a) === norm(b);
}

export default class AnnotationStore {
    private active_annotations: Map<string, Annotation> = new Map() // Contains all currently active annotations
    private annotations: Map<string, Annotation> = new Map() // Contains all annotations

    reconstruct_active_annotations(currentFrame: number) {
        // Rebuilds the active set from each annotation's own [frameStart, frameEnd) range. The ranges are the
        // single source of truth for visibility (and for the timeline bars), so nothing else may track it.
        this.active_annotations.clear()
        for (const [key, annotation] of this.annotations.entries()) {
            const start = annotation.frameStart ?? 0
            if (start > currentFrame) continue;
            if (annotation.frameEnd !== undefined && annotation.frameEnd <= currentFrame) continue;
            this.active_annotations.set(key, annotation)
        }
    }

    private discardAnnotation(key: string) {
        // Annotation was created and deleted on the same frame - never store it
        this.annotations.delete(key);
        this.active_annotations.delete(key);
    }

    update_active_annotation(currentFrame: number) {
        // Keeps active annotations current
        this.reconstruct_active_annotations(currentFrame)
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
            if (samePair(existingAnnotation.shape.players, annotation.shape.players)) {
                return;
            }
        }
        const uniqueKey = newPlayerLineKey();
        annotation.frameStart = currentFrame;
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
                    this.discardAnnotation(key);
                    continue;
                }
                annotation.frameEnd = currentFrame;
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
                    this.discardAnnotation(key);
                    continue;
                }
                annotation.frameEnd = currentFrame;
            }
        }

        // Add new draw shapes that have been captured
        for (const shape of drawShapes) {
            const uniqueKey = createShapeKey(shape, currentFrame);
            if (this.active_annotations.has(uniqueKey)) continue;
            logger.info("Added draw annotation at frame:", currentFrame);
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
        // Moves/resizes an annotation (used by the timeline's draggable bars) and
        // rebuilds active_annotations for the current frame.
        const annotation = this.annotations.get(key);
        if (!annotation) return;

        annotation.frameStart = frameStart;
        annotation.frameEnd = frameEnd ?? undefined;

        logger.info("Updated annotation range", key, frameStart, frameEnd);
        this.reconstruct_active_annotations(currentFrame);
    }

    removeAnnotation(key: string) {
        // Permanently drops a single annotation (used by the timeline's right-click delete).
        if (!this.annotations.has(key)) return;
        logger.info("Removed annotation", key);
        this.annotations.delete(key);
        this.active_annotations.delete(key);
    }

    clear() {
        // Discards every annotation, e.g. when the clip's segment changes and old
        // clip-relative frame numbers no longer refer to the same footage.
        logger.info("Clip annotations cleared");
        this.active_annotations.clear();
        this.annotations.clear();
    }

    load(saved: Array<{ key: string; type: string; frameStart: number; frameEnd: number | null; shape: any }>, currentFrame: number = 0) {
        // Replaces the store's contents with previously saved annotations (see getAllAnnotations),
        // then rebuilding which of them are active at currentFrame.
        this.clear();
        for (const item of saved) {
            const annotation: Annotation = {
                type: item.type,
                frameStart: item.frameStart,
                frameEnd: item.frameEnd ?? undefined,
                shape: item.shape,
            };
            this.annotations.set(item.key, annotation);
        }
        logger.info("Loaded annotations", saved.length);
        this.reconstruct_active_annotations(currentFrame);
    }

    describeAnnotationStore(){
        console.log('Active Annotations:', this.active_annotations)
        console.log('All Annotations:', this.annotations)
    }

    handleAnnotationRelayout(eventData: any, currentFrame: number) {
        const shapes = eventData["shapes"] || [];
        // Player lines are generated by PlotComponent and always named 'Player1:...'. Hand-drawn shapes
        // are unnamed. (Don't test shape.label: Plotly may populate it with defaults on drawn shapes.)
        const isPlayerLine = (shape: any) => typeof shape.name === 'string' && shape.name.startsWith('Player1:');
        const playerLineShapes = shapes.filter(isPlayerLine);
        const drawShapes = shapes.filter((shape: any) => !isPlayerLine(shape));
        this.deletePlayerLineAnnotations(playerLineShapes, currentFrame);
        this.addOrDeleteDrawShapes(drawShapes, currentFrame);
    }

}